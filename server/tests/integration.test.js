const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { reserveDocumentNumber } = require('../dist/utils/sequences');

const databaseUrl = process.env.DATABASE_URL_TEST;

test('database-backed transaction tests require DATABASE_URL_TEST', { skip: !databaseUrl }, async (t) => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const key = `codex-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await t.after(async () => {
    await prisma.documentSequence.deleteMany({ where: { key } });
    await prisma.$disconnect();
  });

  await t.test('rolls back a document sequence reservation when the transaction fails', async () => {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await reserveDocumentNumber(tx, key, 'TEST', 4);
        throw new Error('forced rollback');
      }),
      /forced rollback/,
    );
    assert.equal(await prisma.documentSequence.findUnique({ where: { key } }), null);
  });

  await t.test('concurrent sequence reservations remain unique', async () => {
    const values = await Promise.all(Array.from({ length: 8 }, () => prisma.$transaction(
      (tx) => reserveDocumentNumber(tx, key, 'TEST', 4),
      { isolationLevel: 'Serializable' },
    )));
    assert.equal(new Set(values).size, values.length);
  });
});

test('database-backed authentication rejects invalid and inactive users', { skip: !databaseUrl }, async (t) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough';
  process.env.JWT_EXPIRES_IN = '1h';
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const role = await prisma.role.create({ data: { name: `TEST_${Date.now()}`, description: 'Integration test role' } });
  const password = await bcrypt.hash('correct-password', 4);
  const active = await prisma.user.create({ data: { name: 'Integration Active', email: `active-${Date.now()}@test.local`, password, roleId: role.id } });
  const inactive = await prisma.user.create({ data: { name: 'Integration Inactive', email: `inactive-${Date.now()}@test.local`, password, roleId: role.id, status: 'INACTIVE' } });
  process.env.NODE_ENV = 'test';
  delete global.prisma;
  for (const moduleId of Object.keys(require.cache)) {
    if (moduleId.includes(`${require('path').sep}dist${require('path').sep}`)) delete require.cache[moduleId];
  }
  const app = require('../dist/app').default;
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.user.deleteMany({ where: { id: { in: [active.id, inactive.id] } } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.$disconnect();
    delete global.prisma;
  });

  const login = (email, suppliedPassword) => fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: suppliedPassword }) });
  const valid = await login(active.email, 'correct-password');
  assert.equal(valid.status, 200);
  assert.ok((await valid.json()).data.token);
  assert.equal((await login(active.email, 'wrong-password')).status, 401);
  assert.equal((await login(inactive.email, 'correct-password')).status, 401);
  assert.equal((await fetch(`${baseUrl}/dashboard`)).status, 401);
});

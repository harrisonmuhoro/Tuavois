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
  const company = await prisma.company.create({ data: { name: `Integration Company ${Date.now()}` } });
  const role = await prisma.role.create({ data: { name: `TEST_${Date.now()}`, description: 'Integration test role' } });
  const password = await bcrypt.hash('correct-password', 4);
  const active = await prisma.user.create({ data: { name: 'Integration Active', email: `active-${Date.now()}@test.local`, password, roleId: role.id, companyId: company.id } });
  const inactive = await prisma.user.create({ data: { name: 'Integration Inactive', email: `inactive-${Date.now()}@test.local`, password, roleId: role.id, status: 'INACTIVE', companyId: company.id } });
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
    await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.company.delete({ where: { id: company.id } });
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

test('database-backed tenant isolation protects records and report exports', { skip: !databaseUrl }, async (t) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough';
  process.env.JWT_EXPIRES_IN = '1h';
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const permissionNames = ['clients.view', 'clients.edit', 'clients.delete', 'reports.view', 'finance.view'];
  const companies = await Promise.all([
    prisma.company.create({ data: { name: `Isolation A ${suffix}` } }),
    prisma.company.create({ data: { name: `Isolation B ${suffix}` } }),
  ]);
  const permissions = await Promise.all(permissionNames.map((name) => prisma.permission.upsert({ where: { name }, update: {}, create: { name, description: name } })));
  const role = await prisma.role.create({
    data: {
      name: `ISOLATION_${suffix}`,
      description: 'Tenant isolation integration role',
      rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
    },
  });
  const password = await bcrypt.hash('correct-password', 4);
  const users = await Promise.all(companies.map((company, index) => prisma.user.create({
    data: { name: `Isolation User ${index}`, email: `isolation-${index}-${suffix}@test.local`, password, roleId: role.id, companyId: company.id },
  })));
  const clients = await Promise.all(companies.map((company, index) => prisma.client.create({
    data: { clientNumber: `ISO-${suffix}-${index}`, fullName: `Tenant ${index} Private Client`, phone: `+254700000${index}`, companyId: company.id },
  })));
  const quotations = await Promise.all(companies.map((company, index) => prisma.quotation.create({
    data: {
      quotationNumber: `ISO-Q-${suffix}-${index}`, clientId: clients[index].id, createdById: users[index].id,
      companyId: company.id, destination: `Private Destination ${index}`, subtotal: 100, grandTotal: 100,
      items: { create: { description: 'Private service', quantity: 1, unitPrice: 100, total: 100 } },
    },
  })));

  process.env.NODE_ENV = 'test';
  delete global.prisma;
  for (const moduleId of Object.keys(require.cache)) {
    if (moduleId.includes(`${require('path').sep}dist${require('path').sep}`)) delete require.cache[moduleId];
  }
  const app = require('../dist/app').default;
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const login = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: users[0].email, password: 'correct-password' }) });
  const token = (await login.json()).data.token;
  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) } });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.quotationItem.deleteMany({ where: { quotationId: { in: quotations.map((quotation) => quotation.id) } } });
    await prisma.quotation.deleteMany({ where: { id: { in: quotations.map((quotation) => quotation.id) } } });
    await prisma.auditLog.deleteMany({ where: { companyId: { in: companies.map((company) => company.id) } } });
    await prisma.client.deleteMany({ where: { id: { in: clients.map((client) => client.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.company.deleteMany({ where: { id: { in: companies.map((company) => company.id) } } });
    await prisma.$disconnect();
    delete global.prisma;
  });

  assert.equal((await request(`/clients/${clients[1].id}`)).status, 404);
  assert.equal((await request(`/clients/${clients[1].id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: 'Tampered', phone: '+254711111111' }) })).status, 404);
  assert.equal((await request(`/clients/${clients[1].id}`, { method: 'DELETE' })).status, 404);

  const quotationReport = await request('/reports/quotations');
  assert.equal(quotationReport.status, 200);
  const quotationData = (await quotationReport.json()).data.quotations;
  assert.deepEqual(quotationData.map((quotation) => quotation.id), [quotations[0].id]);

  const pdfExport = await request('/reports/quotations/pdf');
  assert.equal(pdfExport.status, 200);
  assert.match(pdfExport.headers.get('content-type') || '', /application\/pdf/);
  const pdfText = Buffer.from(await pdfExport.arrayBuffer()).toString('latin1');
  const pdfHex = pdfText.toLowerCase();
  assert.match(pdfHex, new RegExp(Buffer.from('Destination 0').toString('hex')));
  assert.doesNotMatch(pdfHex, new RegExp(Buffer.from('Destination 1').toString('hex')));

  const excelExport = await request('/reports/exports/quotations');
  assert.equal(excelExport.status, 200);
  assert.match(excelExport.headers.get('content-type') || '', /spreadsheet|octet-stream/);
  const xlsx = require('xlsx');
  const workbook = xlsx.read(Buffer.from(await excelExport.arrayBuffer()), { type: 'buffer' });
  const workbookText = JSON.stringify(workbook.SheetNames.map((name) => xlsx.utils.sheet_to_json(workbook.Sheets[name])));
  assert.match(workbookText, /Private Destination 0/);
  assert.doesNotMatch(workbookText, /Private Destination 1/);
});

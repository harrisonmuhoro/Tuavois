const test = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');

const { calculateInvoiceTotals } = require('../dist/controllers/invoices.controller');
const { determineInvoiceStatus } = require('../dist/controllers/payments.controller');
const { validate, loginSchema, creditNoteApplicationSchema, companyProvisionSchema } = require('../dist/validators');
const { authorize } = require('../dist/middleware/auth.middleware');
const { reserveDocumentNumber } = require('../dist/utils/sequences');
const { runSerializableTransaction } = require('../dist/utils/transactions');
const { errorHandler } = require('../dist/middleware/error.middleware');
const { AppError } = require('../dist/utils/errors');
const { validateEnvironment } = require('../dist/config/environment');

const invoke = (middleware, req = {}) => new Promise((resolve) => {
  middleware(req, {}, (error) => resolve(error));
});

test('invoice totals calculate subtotal, percentage discount, VAT, and grand total', () => {
  const result = calculateInvoiceTotals([{ quantity: 2, pax: 1, unitPrice: 500 }], 'PERCENTAGE', 10, 16);
  assert.deepEqual(result, { subtotal: 1000, discountAmount: 100, taxAmount: 144, grandTotal: 1044 });
});

test('invoice totals reject discounts greater than the subtotal', () => {
  assert.throws(() => calculateInvoiceTotals([{ quantity: 1, pax: 1, unitPrice: 100 }], 'AMOUNT', 101, 0), /Discount cannot exceed/);
});

test('payment status transitions are deterministic', () => {
  assert.equal(determineInvoiceStatus(0, 500), 'PAID');
  assert.equal(determineInvoiceStatus(200, 500), 'PARTIALLY_PAID');
  assert.equal(determineInvoiceStatus(500, 500), 'UNPAID');
});

test('authorization enforces the permission matrix for admin, staff, and anonymous users', async () => {
  const cases = [
    [{ roleName: 'ADMIN', permissions: [] }, 'invoices.edit', undefined],
    [{ roleName: 'STAFF', permissions: ['invoices.edit'] }, 'invoices.edit', undefined],
    [{ roleName: 'STAFF', permissions: ['invoices.view'] }, 'invoices.edit', 403],
    [{ roleName: 'STAFF', permissions: ['trips.view'] }, 'invoices.view', 403],
    [undefined, 'invoices.view', 401],
  ];

  for (const [user, permission, expectedStatus] of cases) {
    const error = await invoke(authorize(permission), user ? { user } : {});
    assert.equal(error?.statusCode, expectedStatus);
  }
});

test('authorization covers every protected permission family', async () => {
  const permissions = ['clients.view', 'prospects.edit', 'quotations.create', 'invoices.edit', 'payments.create', 'trips.edit', 'reports.view', 'staff.manage', 'settings.manage', 'search.view', 'dashboard.view', 'clients.edit'];
  for (const permission of permissions) {
    const allowed = await invoke(authorize(permission), { user: { roleName: 'STAFF', permissions: [permission] } });
    const denied = await invoke(authorize(permission), { user: { roleName: 'STAFF', permissions: [] } });
    assert.equal(allowed, undefined, `expected ${permission} to allow matching permission`);
    assert.equal(denied?.statusCode, 403, `expected ${permission} to deny missing permission`);
  }
});

test('role permission boundaries cover all four operational audiences', async () => {
  const cases = [
    ['SALES_CONSULTANT', ['quotations.create', 'invoices.create', 'payments.create'], ['staff.manage', 'settings.manage']],
    ['OPERATIONS_STAFF', ['trips.view', 'trips.edit', 'reports.view'], ['invoices.edit', 'payments.create', 'settings.manage']],
    ['ACCOUNTANT', ['invoices.view', 'invoices.edit', 'payments.view', 'payments.create', 'finance.view'], ['reports.view', 'trips.edit', 'staff.manage', 'settings.manage']],
    ['ADMIN', ['settings.manage', 'staff.manage', 'reports.view'], []],
  ];
  for (const [roleName, allowed, denied] of cases) {
    for (const permission of allowed) assert.equal(await invoke(authorize(permission), { user: { roleName, permissions: allowed } }), undefined, `${roleName} should allow ${permission}`);
    for (const permission of denied) assert.equal((await invoke(authorize(permission), { user: { roleName, permissions: allowed } }))?.statusCode, 403, `${roleName} should deny ${permission}`);
  }
});

test('login and credit-application payloads reject unsafe input', async () => {
  const loginError = await invoke(validate(loginSchema), { body: { email: 'invalid', password: '' } });
  assert.equal(loginError.name, 'ZodError');
  const creditError = await invoke(validate(creditNoteApplicationSchema), { body: { amount: -1 } });
  assert.equal(creditError.name, 'ZodError');
  const valid = { body: {} };
  assert.equal(await invoke(validate(creditNoteApplicationSchema), valid), undefined);
  assert.deepEqual(valid.body, {});
});

test('company provisioning payload requires an owner and valid tenant identity', async () => {
  const invalid = await invoke(validate(companyProvisionSchema), { body: { company: { name: 'New Agency' }, owner: { name: 'Owner', email: 'not-an-email', password: 'short' } } });
  assert.equal(invalid.name, 'ZodError');
  const valid = { body: { company: { name: 'New Agency', currency: 'KES' }, owner: { name: 'Agency Owner', email: 'owner@example.com', password: 'long-enough-password' } } };
  assert.equal(await invoke(validate(companyProvisionSchema), valid), undefined);
  assert.equal(valid.body.company.currency, 'KES');
});

test('document sequence reservation produces unique, padded document numbers', async () => {
  let nextValue = 0;
  const tx = { documentSequence: { upsert: async () => ({ nextValue: ++nextValue }) } };
  assert.equal(await reserveDocumentNumber(tx, 'invoice-2026', 'INV-2026', 4), 'INV-2026-0001');
  assert.equal(await reserveDocumentNumber(tx, 'invoice-2026', 'INV-2026', 4), 'INV-2026-0002');
});

test('serializable transactions retry transient conflicts', async () => {
  let attempts = 0;
  const fakePrisma = {
    $transaction: async (operation) => {
      attempts += 1;
      if (attempts < 3) {
        throw new Prisma.PrismaClientKnownRequestError('serialization conflict', { code: 'P2034', clientVersion: '6.16.2' });
      }
      return operation({});
    },
  };
  assert.equal(await runSerializableTransaction(fakePrisma, async () => 'ok'), 'ok');
  assert.equal(attempts, 3);
});

test('error handler normalizes mutation failures without leaking production details', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const responses = [];
  const res = { status(code) { this.code = code; return this; }, json(body) { responses.push({ code: this.code, body }); } };
  errorHandler(new AppError('Invalid mutation', 422), {}, res, () => {});
  errorHandler({ code: 'P2002' }, {}, res, () => {});
  errorHandler({ code: 'P2025' }, {}, res, () => {});
  errorHandler({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' }, {}, res, () => {});
  assert.deepEqual(responses.map((entry) => entry.code), [422, 409, 404, 400]);
  assert.equal(responses[0].body.success, false);
  assert.equal(responses[1].body.message, 'A record with this information already exists');
  assert.equal(responses[2].body.message, 'Record not found');
  assert.equal(responses[3].body.message, 'File exceeds the 10 MB limit');
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
});

test('production environment validation rejects unsafe secrets and blank database passwords', () => {
  const snapshot = { ...process.env };
  Object.assign(process.env, { NODE_ENV: 'production', DATABASE_URL: 'mysql://app:strong-password@localhost:3306/tuavois', JWT_SECRET: 'a-secure-production-secret-that-is-long-enough', JWT_EXPIRES_IN: '7d', CLIENT_URL: 'https://erp.example.com', UPLOAD_DIR: './uploads' });
  assert.doesNotThrow(() => validateEnvironment());
  process.env.JWT_SECRET = 'password123';
  assert.throws(() => validateEnvironment(), /at least 32 characters/);
  process.env.JWT_SECRET = 'a-secure-production-secret-that-is-long-enough';
  process.env.DATABASE_URL = 'mysql://app:@localhost:3306/tuavois';
  assert.throws(() => validateEnvironment(), /blank MySQL password/);
  for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key];
  Object.assign(process.env, snapshot);
});

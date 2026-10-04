import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // =============================================
  // ROLES & PERMISSIONS
  // =============================================
  const permissions = [
    'dashboard.view', 'search.view',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'prospects.view', 'prospects.create', 'prospects.edit',
    'quotations.view', 'quotations.create', 'quotations.edit',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
    'payments.view', 'payments.create',
    'trips.view', 'trips.create', 'trips.edit',
    'reports.view', 'finance.view', 'staff.manage', 'settings.manage',
    'letters.view', 'letters.create', 'letters.edit', 'letters.delete',
    'companies.view', 'companies.create', 'companies.edit', 'companies.suspend',
    'users.view.global', 'users.manage.global', 'reports.view.global', 'audit.view.global',
  ];
  const platformPermissionNames = [
    'companies.view', 'companies.create', 'companies.edit', 'companies.suspend',
    'users.view.global', 'users.manage.global', 'reports.view.global', 'audit.view.global',
  ];

  const createdPermissions = await Promise.all(
    permissions.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: {  name, description: name } })
    )
  );
  console.log('✅ Permissions created');
  const applicationPermissions = createdPermissions.filter((permission) => !platformPermissionNames.includes(permission.name));

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' }, update: { rolePermissions: { deleteMany: {}, create: applicationPermissions.map((p) => ({ permissionId: p.id })) } },
    create: {  name: 'ADMIN', description: 'Full system access', rolePermissions: { create: applicationPermissions.map((p) => ({ permissionId: p.id })) } },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {
      description: 'Platform-wide system administrator',
      rolePermissions: {
        deleteMany: {},
        create: createdPermissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
    create: {
      name: 'SUPERADMIN',
      description: 'Platform-wide system administrator',
      rolePermissions: { create: createdPermissions.map((permission) => ({ permissionId: permission.id })) },
    },
  });
  void superAdminRole;

  const bootstrapValues = [process.env.SUPERADMIN_NAME, process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD];
  if (bootstrapValues.some(Boolean) && bootstrapValues.some((value) => !value)) {
    throw new Error('SUPERADMIN_NAME, SUPERADMIN_EMAIL, and SUPERADMIN_PASSWORD must be provided together');
  }
  if (process.env.SUPERADMIN_EMAIL && process.env.SUPERADMIN_PASSWORD) {
    if (process.env.SUPERADMIN_PASSWORD.length < 10) throw new Error('SUPERADMIN_PASSWORD must be at least 10 characters');
    const bootstrapPassword = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: process.env.SUPERADMIN_EMAIL },
      update: { name: process.env.SUPERADMIN_NAME, roleId: superAdminRole.id, companyId: null, scope: 'GLOBAL', mustChangePassword: true, status: 'ACTIVE' },
      create: { name: process.env.SUPERADMIN_NAME!, email: process.env.SUPERADMIN_EMAIL, password: bootstrapPassword, roleId: superAdminRole.id, companyId: null, scope: 'GLOBAL', mustChangePassword: true },
    });
    console.log('✅ Bootstrap Super Admin configured (credentials not logged)');
  }

  const staffPerms = createdPermissions.filter((p) =>
    ['dashboard.view', 'search.view', 'clients.view', 'clients.create', 'clients.edit', 'prospects.view', 'prospects.create', 'quotations.view', 'quotations.create', 'invoices.view', 'payments.view', 'trips.view', 'trips.create'].includes(p.name)
  );
  const staffRole = await prisma.role.upsert({
    where: { name: 'STAFF' }, update: { rolePermissions: { deleteMany: {}, create: staffPerms.map((p) => ({ permissionId: p.id })) } },
    create: {  name: 'STAFF', description: 'Operational staff access', rolePermissions: { create: staffPerms.map((p) => ({ permissionId: p.id })) } },
  });

  const permissionsByName = new Map(createdPermissions.map((permission) => [permission.name, permission]));
  const rolePermissions = async (name: string, description: string, allowed: string[]) => {
    const selected = allowed.map((permission) => permissionsByName.get(permission)).filter(Boolean).map((permission) => ({ permissionId: permission!.id }));
    return prisma.role.upsert({
      where: { name },
      update: { description, rolePermissions: { deleteMany: {}, create: selected } },
      create: {  name, description, rolePermissions: { create: selected } },
    });
  };

  const salesRole = await rolePermissions('SALES_CONSULTANT', 'Sales consultant access', [
    'dashboard.view', 'search.view', 'clients.view', 'clients.create', 'clients.edit',
    'prospects.view', 'prospects.create', 'prospects.edit', 'quotations.view',
    'quotations.create', 'quotations.edit', 'invoices.view', 'invoices.create',
    'invoices.edit', 'payments.view', 'payments.create', 'trips.view', 'trips.create',
    'trips.edit', 'reports.view', 'letters.view', 'letters.create', 'letters.edit',
  ]);
  const operationsRole = await rolePermissions('OPERATIONS_STAFF', 'Operations team access', [
    'dashboard.view', 'search.view', 'clients.view', 'trips.view', 'trips.create',
    'trips.edit', 'reports.view',
  ]);
  const accountantRole = await rolePermissions('ACCOUNTANT', 'Accounting and finance access', [
    'dashboard.view', 'search.view', 'clients.view', 'invoices.view', 'invoices.edit',
    'payments.view', 'payments.create', 'finance.view',
  ]);
  console.log('✅ Roles created');

  // =============================================
  // COMPANY
  // =============================================
  const company = await prisma.company.upsert({
    where: { id: 'company-settings-1' },
    update: {},
    create: { 
      id: 'company-settings-1',
      name: 'TuaVois Travel & Tours Ltd',
      email: 'info@tuavois.co.ke',
      phone: '+254 700 000 000',
      address: 'Westlands, Nairobi, Kenya',
      taxId: 'P051234567A',
      website: 'www.tuavois.co.ke',
      currency: 'KES',
      taxRate: 16,
      taxName: 'VAT',
      kraPin: 'P051234567A',
      bankDetails: 'Equity Bank | Account: 0123456789 | Branch: Westlands',
    },
  });

  // =============================================
  // CURRENCIES
  // =============================================
  await Promise.all([
    prisma.currency.upsert({ where: { code: 'KES' }, update: {}, create: {  code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', isDefault: true } }),
    prisma.currency.upsert({ where: { code: 'USD' }, update: {}, create: {  code: 'USD', name: 'US Dollar', symbol: '$' } }),
    prisma.currency.upsert({ where: { code: 'EUR' }, update: {}, create: {  code: 'EUR', name: 'Euro', symbol: '€' } }),
    prisma.currency.upsert({ where: { code: 'GBP' }, update: {}, create: {  code: 'GBP', name: 'British Pound', symbol: '£' } }),
  ]);
  console.log('✅ Currencies created');

  // =============================================
  // STAFF ACCOUNTS
  // =============================================
  const hashedPassword = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tuavois.co.ke' }, update: { roleId: adminRole.id, department: 'Management' },
    create: {  name: 'Sarah Njoroge', email: 'admin@tuavois.co.ke', password: hashedPassword, phone: '+254 722 111 001', department: 'Management', roleId: adminRole.id },
  });

  const jane = await prisma.user.upsert({
    where: { email: 'jane@tuavois.co.ke' }, update: { roleId: salesRole.id, department: 'Sales' },
    create: {  name: 'Jane Wambui', email: 'jane@tuavois.co.ke', password: hashedPassword, phone: '+254 722 111 002', department: 'Sales', roleId: salesRole.id },
  });

  const peter = await prisma.user.upsert({
    where: { email: 'peter@tuavois.co.ke' }, update: { roleId: operationsRole.id, department: 'Operations' },
    create: {  name: 'Peter Kamau', email: 'peter@tuavois.co.ke', password: hashedPassword, phone: '+254 722 111 003', department: 'Operations', roleId: operationsRole.id },
  });

  const grace = await prisma.user.upsert({
    where: { email: 'grace@tuavois.co.ke' }, update: { roleId: salesRole.id, department: 'Sales' },
    create: {  name: 'Grace Odhiambo', email: 'grace@tuavois.co.ke', password: hashedPassword, phone: '+254 722 111 004', department: 'Sales', roleId: salesRole.id },
  });
  await prisma.user.upsert({
    where: { email: 'accountant@tuavois.co.ke' },
    update: { roleId: accountantRole.id, department: 'Finance' },
    create: {  name: 'Accountant Demo', email: 'accountant@tuavois.co.ke', password: hashedPassword, phone: '+254 722 111 005', department: 'Finance', roleId: accountantRole.id },
  });
  console.log('✅ Staff accounts created');

  // =============================================
  // CLIENTS
  // =============================================
  const clientData = [
    { clientNumber: 'CLT-00001', fullName: 'David Mwangi', company: 'Safaricom Ltd', phone: '+254 722 200 001', email: 'david.mwangi@safaricom.co.ke', nationality: 'Kenyan', address: 'Westlands, Nairobi', assignedStaffId: jane.id },
    { clientNumber: 'CLT-00002', fullName: 'Amina Hassan', company: 'Kenya Airways', phone: '+254 722 200 002', email: 'amina.hassan@kenya-airways.com', nationality: 'Kenyan', address: 'Embakasi, Nairobi', assignedStaffId: jane.id },
    { clientNumber: 'CLT-00003', fullName: 'John Kariuki', company: '', phone: '+254 722 200 003', email: 'john.kariuki@gmail.com', nationality: 'Kenyan', address: 'Kiambu', assignedStaffId: peter.id },
    { clientNumber: 'CLT-00004', fullName: 'Fatuma Ali', company: 'Equity Bank', phone: '+254 722 200 004', email: 'fatuma.ali@equitybank.co.ke', nationality: 'Kenyan', address: 'Upper Hill, Nairobi', assignedStaffId: grace.id },
    { clientNumber: 'CLT-00005', fullName: 'Michael Ochieng', company: 'Nation Media Group', phone: '+254 722 200 005', email: 'm.ochieng@nationmedia.com', nationality: 'Kenyan', address: 'Hurlingham, Nairobi', assignedStaffId: jane.id },
    { clientNumber: 'CLT-00006', fullName: 'Alice Wanjiru', company: 'KCB Group', phone: '+254 722 200 006', email: 'alice.wanjiru@kcbgroup.com', nationality: 'Kenyan', address: 'Karen, Nairobi', assignedStaffId: peter.id },
    { clientNumber: 'CLT-00007', fullName: 'James Otieno', company: 'EABL', phone: '+254 722 200 007', email: 'j.otieno@eabl.com', nationality: 'Kenyan', address: 'Ruaraka, Nairobi', assignedStaffId: grace.id },
    { clientNumber: 'CLT-00008', fullName: 'Priya Patel', company: 'Naivas Supermarkets', phone: '+254 722 200 008', email: 'priya.patel@naivas.co.ke', nationality: 'Kenyan', address: 'Westlands, Nairobi', assignedStaffId: jane.id },
    { clientNumber: 'CLT-00009', fullName: 'Robert Maina', company: 'Standard Chartered', phone: '+254 722 200 009', email: 'r.maina@sc.com', nationality: 'Kenyan', address: 'Kilimani, Nairobi', assignedStaffId: peter.id },
    { clientNumber: 'CLT-00010', fullName: 'Lucy Njeri', company: 'G4S Kenya', phone: '+254 722 200 010', email: 'lucy.njeri@g4s.co.ke', nationality: 'Kenyan', address: 'Industrial Area, Nairobi', assignedStaffId: grace.id },
    { clientNumber: 'CLT-00011', fullName: 'Omar Sheikh', company: 'Gulf Energy', phone: '+254 722 200 011', email: 'o.sheikh@gulfenergy.co.ke', nationality: 'Kenyan', address: 'Parklands, Nairobi', assignedStaffId: jane.id },
    { clientNumber: 'CLT-00012', fullName: 'Christine Muthoni', company: 'UNICEF Kenya', phone: '+254 722 200 012', email: 'c.muthoni@unicef.org', nationality: 'Kenyan', address: 'Gigiri, Nairobi', assignedStaffId: admin.id },
  ];

  const clients = await Promise.all(clientData.map((c) => prisma.client.upsert({ where: { companyId_clientNumber: { companyId: company.id, clientNumber: c.clientNumber } }, update: { companyId: company.id }, create: { ...c, companyId: company.id } })));
  console.log('✅ Clients created');

  // =============================================
  // PROSPECTS
  // =============================================
  const prospectData = [
    { prospectNumber: 'PRO-00001', fullName: 'Daniel Cheruiyot', phone: '+254 722 300 001', email: 'dcheruiyot@gmail.com', status: 'QUOTATION_SENT' as const, leadSource: 'Website', travelInterest: 'Safari - Maasai Mara', estimatedValue: 250000, currency: 'KES', assignedStaffId: jane.id },
    { prospectNumber: 'PRO-00002', fullName: 'Agnes Mutua', company: 'Bidco Africa', phone: '+254 722 300 002', email: 'agnes.mutua@bidco.co.ke', status: 'NEGOTIATION' as const, leadSource: 'Referral', travelInterest: 'Corporate Team Building - Diani', estimatedValue: 800000, currency: 'KES', assignedStaffId: grace.id },
    { prospectNumber: 'PRO-00003', fullName: 'Hassan Abdi', phone: '+254 722 300 003', email: 'h.abdi@gmail.com', status: 'NEW' as const, leadSource: 'Social Media', travelInterest: 'Zanzibar Beach Holiday', estimatedValue: 180000, currency: 'KES', assignedStaffId: peter.id },
    { prospectNumber: 'PRO-00004', fullName: 'Martha Wekesa', company: 'Kengen', phone: '+254 722 300 004', email: 'm.wekesa@kengen.co.ke', status: 'CONTACTED' as const, leadSource: 'LinkedIn', travelInterest: 'Dubai Business Trip', estimatedValue: 350000, currency: 'KES', assignedStaffId: jane.id },
    { prospectNumber: 'PRO-00005', fullName: 'Paul Njenga', phone: '+254 722 300 005', email: 'paul.njenga@outlook.com', status: 'QUALIFIED' as const, leadSource: 'Walk-in', travelInterest: 'Amboseli Safari 3 Nights', estimatedValue: 120000, currency: 'KES', assignedStaffId: grace.id },
    { prospectNumber: 'PRO-00006', fullName: 'Irene Oloo', company: 'Brookside Dairy', phone: '+254 722 300 006', email: 'i.oloo@brookside.co.ke', status: 'NEW' as const, leadSource: 'Email Campaign', travelInterest: 'Nakuru National Park Day Trip', estimatedValue: 45000, currency: 'KES', assignedStaffId: peter.id },
  ];

  await Promise.all(prospectData.map((p) => prisma.prospect.upsert({ where: { companyId_prospectNumber: { companyId: company.id, prospectNumber: p.prospectNumber } }, update: { companyId: company.id }, create: { ...p, companyId: company.id } })));
  console.log('✅ Prospects created');

  // =============================================
  // TRIPS
  // =============================================
  const pastDate = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d; };
  const futureDate = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + daysAhead); return d; };

  const tripsData = [
    { tripNumber: 'TRP-2024-0001', name: 'Maasai Mara Safari', clientId: clients[0].id, destination: 'Maasai Mara, Kenya', startDate: pastDate(60), endDate: pastDate(57), status: 'COMPLETED' as const, estimatedRevenue: 350000, estimatedCost: 210000, actualRevenue: 350000, actualCost: 215000, currency: 'KES', assignedStaffId: peter.id },
    { tripNumber: 'TRP-2024-0002', name: 'Diani Beach Honeymoon', clientId: clients[1].id, destination: 'Diani Beach, Kwale', startDate: pastDate(45), endDate: pastDate(41), status: 'COMPLETED' as const, estimatedRevenue: 280000, estimatedCost: 160000, actualRevenue: 280000, actualCost: 162000, currency: 'KES', assignedStaffId: grace.id },
    { tripNumber: 'TRP-2024-0003', name: 'Amboseli Wildlife Trip', clientId: clients[2].id, destination: 'Amboseli, Kajiado', startDate: pastDate(30), endDate: pastDate(28), status: 'COMPLETED' as const, estimatedRevenue: 150000, estimatedCost: 90000, actualRevenue: 150000, actualCost: 95000, currency: 'KES', assignedStaffId: jane.id },
    { tripNumber: 'TRP-2024-0004', name: 'Zanzibar Beach Holiday', clientId: clients[3].id, destination: 'Zanzibar, Tanzania', startDate: futureDate(15), endDate: futureDate(22), status: 'CONFIRMED' as const, estimatedRevenue: 520000, estimatedCost: 310000, currency: 'KES', assignedStaffId: peter.id },
    { tripNumber: 'TRP-2024-0005', name: 'Nakuru Day Safari', clientId: clients[4].id, destination: 'Lake Nakuru, Kenya', startDate: futureDate(7), endDate: futureDate(7), status: 'CONFIRMED' as const, estimatedRevenue: 65000, estimatedCost: 38000, currency: 'KES', assignedStaffId: grace.id },
    { tripNumber: 'TRP-2024-0006', name: 'Dubai Corporate Tour', clientId: clients[5].id, destination: 'Dubai, UAE', startDate: futureDate(30), endDate: futureDate(36), status: 'PLANNED' as const, estimatedRevenue: 1200000, estimatedCost: 750000, currency: 'KES', assignedStaffId: admin.id },
    { tripNumber: 'TRP-2024-0007', name: 'Mombasa Old Town Experience', clientId: clients[6].id, destination: 'Mombasa, Kenya', startDate: futureDate(45), endDate: futureDate(49), status: 'PLANNED' as const, estimatedRevenue: 180000, estimatedCost: 110000, currency: 'KES', assignedStaffId: jane.id },
    { tripNumber: 'TRP-2024-0008', name: 'Mt Kenya Trekking Expedition', clientId: clients[7].id, destination: 'Mt Kenya, Kenya', startDate: futureDate(60), endDate: futureDate(64), status: 'PLANNED' as const, estimatedRevenue: 320000, estimatedCost: 190000, currency: 'KES', assignedStaffId: peter.id },
  ];

  const trips = await Promise.all(tripsData.map((t) => prisma.trip.upsert({ where: { companyId_tripNumber: { companyId: company.id, tripNumber: t.tripNumber } }, update: { companyId: company.id }, create: { ...t, companyId: company.id } })));
  console.log('✅ Trips created');

  // =============================================
  // TRIP PARTICIPANTS
  // =============================================
  const maraTripParticipants = [
    { tripId: trips[0].id, fullName: 'David Mwangi', idNumber: '12345678', phone: '+254 722 200 001', email: 'david@gmail.com', nationality: 'Kenyan', specialRequirements: 'Vegetarian meals' },
    { tripId: trips[0].id, fullName: 'Cynthia Mwangi', idNumber: '23456789', phone: '+254 722 200 021', email: 'cynthia@gmail.com', nationality: 'Kenyan' },
    { tripId: trips[0].id, fullName: 'Ryan Mwangi', idNumber: 'A12345678', phone: '', nationality: 'Kenyan', dateOfBirth: new Date('2015-03-10'), emergencyContact: '+254 722 200 001' },
  ];

  const zanzibarParticipants = [
    { tripId: trips[3].id, fullName: 'Fatuma Ali', idNumber: '34567890', phone: '+254 722 200 004', email: 'fatuma.ali@equitybank.co.ke', nationality: 'Kenyan' },
    { tripId: trips[3].id, fullName: 'Ahmed Ali', idNumber: '45678901', phone: '+254 722 200 041', email: 'ahmed.ali@gmail.com', nationality: 'Kenyan' },
  ];

  await Promise.all([...maraTripParticipants, ...zanzibarParticipants].map((p) => prisma.tripParticipant.create({ data: p })));
  console.log('✅ Participants created');

  // =============================================
  // INVOICES
  // =============================================
  const invoicesData = [
    { invoiceNumber: 'INV-2024-0001', clientId: clients[0].id, tripId: trips[0].id, invoiceDate: pastDate(65), dueDate: pastDate(55), currency: 'KES', subtotal: 350000, grandTotal: 350000, amountPaid: 350000, balance: 0, status: 'PAID' as const, createdById: jane.id },
    { invoiceNumber: 'INV-2024-0002', clientId: clients[1].id, tripId: trips[1].id, invoiceDate: pastDate(50), dueDate: pastDate(40), currency: 'KES', subtotal: 280000, grandTotal: 280000, amountPaid: 280000, balance: 0, status: 'PAID' as const, createdById: grace.id },
    { invoiceNumber: 'INV-2024-0003', clientId: clients[2].id, tripId: trips[2].id, invoiceDate: pastDate(35), dueDate: pastDate(25), currency: 'KES', subtotal: 150000, grandTotal: 150000, amountPaid: 100000, balance: 50000, status: 'PARTIALLY_PAID' as const, createdById: jane.id },
    { invoiceNumber: 'INV-2024-0004', clientId: clients[3].id, tripId: trips[3].id, invoiceDate: pastDate(20), dueDate: futureDate(10), currency: 'KES', subtotal: 520000, grandTotal: 520000, amountPaid: 260000, balance: 260000, status: 'PARTIALLY_PAID' as const, createdById: peter.id },
    { invoiceNumber: 'INV-2024-0005', clientId: clients[4].id, tripId: trips[4].id, invoiceDate: pastDate(10), dueDate: futureDate(20), currency: 'KES', subtotal: 65000, grandTotal: 65000, amountPaid: 0, balance: 65000, status: 'UNPAID' as const, createdById: grace.id },
    { invoiceNumber: 'INV-2024-0006', clientId: clients[5].id, tripId: trips[5].id, invoiceDate: pastDate(5), dueDate: futureDate(25), currency: 'KES', subtotal: 1200000, grandTotal: 1200000, amountPaid: 600000, balance: 600000, status: 'PARTIALLY_PAID' as const, createdById: admin.id },
    { invoiceNumber: 'INV-2024-0007', clientId: clients[6].id, tripId: trips[6].id, invoiceDate: pastDate(3), dueDate: futureDate(27), currency: 'KES', subtotal: 180000, grandTotal: 180000, amountPaid: 0, balance: 180000, status: 'UNPAID' as const, createdById: jane.id },
    { invoiceNumber: 'INV-2024-0008', clientId: clients[7].id, tripId: trips[7].id, invoiceDate: pastDate(1), dueDate: futureDate(29), currency: 'KES', subtotal: 320000, grandTotal: 320000, amountPaid: 0, balance: 320000, status: 'UNPAID' as const, createdById: peter.id },
    { invoiceNumber: 'INV-2024-0009', clientId: clients[8].id, invoiceDate: pastDate(25), dueDate: pastDate(5), currency: 'KES', subtotal: 95000, grandTotal: 95000, amountPaid: 0, balance: 95000, status: 'OVERDUE' as const, createdById: grace.id },
    { invoiceNumber: 'INV-2024-0010', clientId: clients[9].id, invoiceDate: pastDate(40), dueDate: pastDate(10), currency: 'KES', subtotal: 42000, grandTotal: 42000, amountPaid: 0, balance: 42000, status: 'OVERDUE' as const, createdById: jane.id },
    { invoiceNumber: 'INV-2024-0011', clientId: clients[10].id, invoiceDate: pastDate(15), dueDate: futureDate(15), currency: 'USD', subtotal: 2500, grandTotal: 2500, amountPaid: 1000, balance: 1500, status: 'PARTIALLY_PAID' as const, exchangeRate: 128, createdById: admin.id },
    { invoiceNumber: 'INV-2024-0012', clientId: clients[11].id, invoiceDate: pastDate(7), dueDate: futureDate(23), currency: 'KES', subtotal: 450000, grandTotal: 450000, amountPaid: 450000, balance: 0, status: 'PAID' as const, createdById: grace.id },
    { invoiceNumber: 'INV-2024-0013', clientId: clients[0].id, invoiceDate: pastDate(70), dueDate: pastDate(60), currency: 'KES', subtotal: 125000, grandTotal: 125000, amountPaid: 125000, balance: 0, status: 'PAID' as const, createdById: jane.id },
    { invoiceNumber: 'INV-2024-0014', clientId: clients[1].id, invoiceDate: pastDate(80), dueDate: pastDate(70), currency: 'KES', subtotal: 80000, grandTotal: 80000, amountPaid: 80000, balance: 0, status: 'PAID' as const, createdById: peter.id },
    { invoiceNumber: 'INV-2024-0015', clientId: clients[2].id, invoiceDate: pastDate(90), dueDate: pastDate(80), currency: 'KES', subtotal: 55000, grandTotal: 55000, amountPaid: 55000, balance: 0, status: 'PAID' as const, createdById: grace.id },
  ];

  const invoices = await Promise.all(
    invoicesData.map((inv) =>
      prisma.invoice.upsert({
        where: { companyId_invoiceNumber: { companyId: company.id, invoiceNumber: inv.invoiceNumber } }, update: { companyId: company.id },
        create: { 
          ...inv,
          companyId: company.id,
          items: {
            create: [{ description: 'Travel Package Services', quantity: 1, pax: 1, unitPrice: inv.subtotal, total: inv.subtotal }],
          },
        },
      })
    )
  );
  console.log('✅ Invoices created');

  // =============================================
  // PAYMENTS
  // =============================================
  const paymentsData = [
    { paymentNumber: 'PAY-2024-00001', invoiceId: invoices[0].id, clientId: clients[0].id, amount: 175000, currency: 'KES', exchangeRate: 1, baseAmount: 175000, paymentMethod: 'MPESA' as const, paymentDate: pastDate(63), reference: 'QH8XRKT456', receivedById: jane.id },
    { paymentNumber: 'PAY-2024-00002', invoiceId: invoices[0].id, clientId: clients[0].id, amount: 175000, currency: 'KES', exchangeRate: 1, baseAmount: 175000, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: pastDate(58), reference: 'TXN-20240115', receivedById: jane.id },
    { paymentNumber: 'PAY-2024-00003', invoiceId: invoices[1].id, clientId: clients[1].id, amount: 280000, currency: 'KES', exchangeRate: 1, baseAmount: 280000, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: pastDate(48), reference: 'TXN-20240120', receivedById: grace.id },
    { paymentNumber: 'PAY-2024-00004', invoiceId: invoices[2].id, clientId: clients[2].id, amount: 100000, currency: 'KES', exchangeRate: 1, baseAmount: 100000, paymentMethod: 'MPESA' as const, paymentDate: pastDate(33), reference: 'QH7KPLT123', receivedById: jane.id },
    { paymentNumber: 'PAY-2024-00005', invoiceId: invoices[3].id, clientId: clients[3].id, amount: 260000, currency: 'KES', exchangeRate: 1, baseAmount: 260000, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: pastDate(18), reference: 'TXN-20240202', receivedById: peter.id },
    { paymentNumber: 'PAY-2024-00006', invoiceId: invoices[5].id, clientId: clients[5].id, amount: 600000, currency: 'KES', exchangeRate: 1, baseAmount: 600000, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: pastDate(4), reference: 'TXN-20240210', receivedById: admin.id },
    { paymentNumber: 'PAY-2024-00007', invoiceId: invoices[10].id, clientId: clients[10].id, amount: 1000, currency: 'USD', exchangeRate: 128, baseAmount: 128000, paymentMethod: 'CARD' as const, paymentDate: pastDate(14), reference: 'VISA-8845', receivedById: admin.id },
    { paymentNumber: 'PAY-2024-00008', invoiceId: invoices[11].id, clientId: clients[11].id, amount: 450000, currency: 'KES', exchangeRate: 1, baseAmount: 450000, paymentMethod: 'MPESA' as const, paymentDate: pastDate(6), reference: 'QH9MPESA789', receivedById: grace.id },
    { paymentNumber: 'PAY-2024-00009', invoiceId: invoices[12].id, clientId: clients[0].id, amount: 125000, currency: 'KES', exchangeRate: 1, baseAmount: 125000, paymentMethod: 'CASH' as const, paymentDate: pastDate(68), reference: 'CASH-001', receivedById: jane.id },
    { paymentNumber: 'PAY-2024-00010', invoiceId: invoices[13].id, clientId: clients[1].id, amount: 80000, currency: 'KES', exchangeRate: 1, baseAmount: 80000, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: pastDate(78), reference: 'TXN-20231115', receivedById: peter.id },
    { paymentNumber: 'PAY-2024-00011', invoiceId: invoices[14].id, clientId: clients[2].id, amount: 55000, currency: 'KES', exchangeRate: 1, baseAmount: 55000, paymentMethod: 'MPESA' as const, paymentDate: pastDate(88), reference: 'QH6MPESA321', receivedById: grace.id },
  ];

  const payments = await Promise.all(
    paymentsData.map((p) => prisma.payment.upsert({ where: { companyId_paymentNumber: { companyId: company.id, paymentNumber: p.paymentNumber } }, update: { companyId: company.id }, create: { ...p, companyId: company.id } }))
  );

  // Create receipts for payments
  let receiptNum = 1;
  await Promise.all(
    payments.map((pay) =>
      prisma.receipt.upsert({
        where: { paymentId: pay.id },
        update: {},
        create: { 
          receiptNumber: `RCT-2024-${String(receiptNum++).padStart(5, '0')}`,
          paymentId: pay.id, invoiceId: pay.invoiceId, amount: pay.amount, currency: pay.currency, balanceAfter: 0, companyId: company.id,
        },
      })
    )
  );
  console.log('✅ Payments & receipts created');

  // =============================================
  // QUOTATIONS
  // =============================================
  const quotationsData = [
    {
      quotationNumber: 'QT-2024-0001', clientId: clients[0].id, travelStartDate: futureDate(20), travelEndDate: futureDate(24), destination: 'Maasai Mara, Kenya', pax: 4, currency: 'KES',
      subtotal: 480000, discountAmount: 30000, taxAmount: 0, grandTotal: 450000, status: 'ACCEPTED' as const, createdById: jane.id, validUntil: futureDate(10),
      items: [{ description: 'Mara Serena Safari Lodge (3 nights, full board)', quantity: 1, unitPrice: 320000, total: 320000, sortOrder: 0 }, { description: 'Game drives (6 drives)', quantity: 6, unitPrice: 15000, total: 90000, sortOrder: 1 }, { description: 'Return transfers Nairobi-Mara', quantity: 1, unitPrice: 70000, total: 70000, sortOrder: 2 }],
    },
    {
      quotationNumber: 'QT-2024-0002', clientId: clients[4].id, travelStartDate: futureDate(30), travelEndDate: futureDate(32), destination: 'Lake Nakuru, Kenya', pax: 2, currency: 'KES',
      subtotal: 65000, discountAmount: 0, taxAmount: 0, grandTotal: 65000, status: 'SENT' as const, createdById: grace.id, validUntil: futureDate(14),
      items: [{ description: 'Game drive package (Lake Nakuru)', quantity: 1, unitPrice: 45000, total: 45000, sortOrder: 0 }, { description: 'Accommodation (Sarova Lion Hill, 2 nights)', quantity: 2, unitPrice: 10000, total: 20000, sortOrder: 1 }],
    },
    {
      quotationNumber: 'QT-2024-0003', clientId: clients[8].id, travelStartDate: futureDate(45), travelEndDate: futureDate(51), destination: 'Zanzibar, Tanzania', pax: 6, currency: 'KES',
      subtotal: 780000, discountAmount: 0, taxAmount: 0, grandTotal: 780000, status: 'DRAFT' as const, createdById: peter.id, validUntil: futureDate(7),
      items: [{ description: 'Zanzibar Serena Hotel (6 nights, half board)', quantity: 6, unitPrice: 85000, total: 510000, sortOrder: 0 }, { description: 'Return flights Nairobi-Zanzibar (6 pax)', quantity: 6, unitPrice: 35000, total: 210000, sortOrder: 1 }, { description: 'Spice tour & Stone Town excursion', quantity: 1, unitPrice: 60000, total: 60000, sortOrder: 2 }],
    },
    {
      quotationNumber: 'QT-2024-0004', clientId: clients[2].id, travelStartDate: futureDate(10), travelEndDate: futureDate(13), destination: 'Amboseli, Kenya', pax: 2, currency: 'KES',
      subtotal: 150000, discountAmount: 0, taxAmount: 0, grandTotal: 150000, status: 'DRAFT' as const, createdById: jane.id, validUntil: futureDate(5),
      items: [{ description: 'Amboseli Serena Safari Lodge (3 nights, full board)', quantity: 3, unitPrice: 40000, total: 120000, sortOrder: 0 }, { description: 'Game drives (4 drives)', quantity: 4, unitPrice: 7500, total: 30000, sortOrder: 1 }],
    },
  ];

  await Promise.all(
    quotationsData.map(({ items, ...q }) =>
      prisma.quotation.upsert({
        where: { companyId_quotationNumber: { companyId: company.id, quotationNumber: q.quotationNumber } }, update: { companyId: company.id },
        create: {  ...q, companyId: company.id, items: { create: items } },
      })
    )
  );
  console.log('✅ Quotations created');

  // =============================================
  // ITINERARIES
  // =============================================
  await prisma.itinerary.upsert({
    where: { companyId_itineraryNumber: { companyId: company.id, itineraryNumber: 'ITN-2024-0001' } }, update: { companyId: company.id },
    create: { 
      itineraryNumber: 'ITN-2024-0001', companyId: company.id, tripName: 'Maasai Mara Safari Experience', clientId: clients[0].id, tripId: trips[0].id,
      departureDate: pastDate(60), returnDate: pastDate(57), departureLocation: 'Nairobi', pickupLocation: 'JKIA Terminal 1A', destination: 'Maasai Mara National Reserve', numTravellers: 3,
      introduction: 'Welcome to your exclusive Maasai Mara Safari Experience! You are about to embark on one of the world\'s most celebrated wildlife adventures. The Maasai Mara is home to the "Big Five" and the spectacular Great Wildebeest Migration.',
      inclusiveOf: '• All game drives in customized 4WD vehicles\n• Full board accommodation at Mara Serena Lodge\n• Airport transfers\n• Services of an experienced safari guide\n• Park entry fees\n• Bottled water during game drives',
      exclusiveOf: '• International flights\n• Travel insurance\n• Personal expenses\n• Alcoholic beverages\n• Tips and gratuities\n• Optional balloon safari',
      termsConditions: 'A 50% deposit is required to confirm the booking. The balance is due 14 days before departure. Cancellations made within 7 days are non-refundable.',
      days: {
        create: [
          {
            dayNumber: 1, title: 'Arrival & Transfer to Mara', sortOrder: 0,
            activities: {
              create: [
                { title: 'Morning: Departure from Nairobi', description: 'Depart from JKIA/Wilson Airport for Maasai Mara. Flight time approx 45 minutes.', time: '07:00', type: 'FLIGHT', sortOrder: 0 },
                { title: 'Midday: Arrival at Mara Serena', description: 'Arrive at Mara Serena airstrip, transfer to lodge. Check-in and freshen up.', time: '09:00', type: 'ACTIVITY', sortOrder: 1 },
                { title: 'Afternoon Game Drive', description: 'Your first game drive in the Maasai Mara! Look out for lions, elephants, cheetahs, and more. Return to lodge for dinner.', time: '14:30', type: 'ACTIVITY', sortOrder: 2 },
                { title: 'Overnight: Mara Serena Safari Lodge', description: 'Luxury tented accommodation on the banks of the Mara River.', type: 'ACCOMMODATION', sortOrder: 3 },
              ],
            },
          },
          {
            dayNumber: 2, title: 'Full Day Game Drives', sortOrder: 1,
            activities: {
              create: [
                { title: 'Early Morning Game Drive', description: 'Catch predators at dawn — lions on the hunt, cheetahs, leopards. Sunrise over the savanna is unforgettable.', time: '06:00', type: 'ACTIVITY', sortOrder: 0 },
                { title: 'Breakfast at Lodge', description: 'Return for a full breakfast at the lodge.', time: '09:30', type: 'MEALS', sortOrder: 1 },
                { title: 'Afternoon Game Drive - River Crossing', description: 'Head to the Mara River to witness wildebeest crossings (seasonal). The drama of thousands of wildebeest is breathtaking.', time: '14:00', type: 'ACTIVITY', sortOrder: 2 },
                { title: 'Overnight: Mara Serena Safari Lodge', description: 'Dinner and overnight stay.', type: 'ACCOMMODATION', sortOrder: 3 },
              ],
            },
          },
          {
            dayNumber: 3, title: 'Sunrise Drive & Departure', sortOrder: 2,
            activities: {
              create: [
                { title: 'Optional: Hot Air Balloon Safari', description: 'Experience the Mara from above with a sunrise balloon safari (additional cost applies). Includes champagne breakfast on landing.', time: '05:30', type: 'ACTIVITY', sortOrder: 0 },
                { title: 'Morning Game Drive', description: 'Final morning game drive through the reserve.', time: '07:00', type: 'ACTIVITY', sortOrder: 1 },
                { title: 'Check-out & Transfer to Airstrip', description: 'Check out after breakfast. Transfer to Mara Serena airstrip for return flight to Nairobi.', time: '11:00', type: 'TRANSPORT', sortOrder: 2 },
                { title: 'Return to Nairobi', description: 'Arrive in Nairobi. End of safari experience. Safe travels!', time: '13:00', type: 'FLIGHT', sortOrder: 3 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Itineraries created');

  // =============================================
  // VOUCHERS
  // =============================================

  // Hotel Voucher - Diani
  await prisma.voucher.upsert({
    where: { companyId_voucherNumber: { companyId: company.id, voucherNumber: 'VCH-2024-0001' } }, update: { companyId: company.id },
    create: { 
      voucherNumber: 'VCH-2024-0001', companyId: company.id, type: 'HOTEL', clientId: clients[1].id, tripId: trips[1].id, guestNames: 'Amina Hassan, Mr Hassan',
      hotelDetails: { create: {  hotel: 'Leopard Beach Resort & Spa', address: 'Diani Beach Road, Kwale County, Kenya', checkIn: pastDate(45), checkOut: pastDate(41), nights: 4, roomType: 'Ocean View Deluxe Room', rooms: 1, mealPlan: 'Full Board', bookingReference: 'LBR-20240120-001', specialRequests: 'Honeymoon setup. Rose petals and champagne on arrival.' } },
    },
  });

  // Transfer Voucher - Airport Transfer
  await prisma.voucher.upsert({
    where: { companyId_voucherNumber: { companyId: company.id, voucherNumber: 'VCH-2024-0002' } }, update: { companyId: company.id },
    create: { 
      voucherNumber: 'VCH-2024-0002', companyId: company.id, type: 'TRANSFER', clientId: clients[1].id, tripId: trips[1].id, guestNames: 'Amina Hassan, Mr Hassan',
      transferDetails: { create: {  date: pastDate(45), pickupTime: '09:00', pickupLocation: 'JKIA International Terminal', dropoffLocation: 'Leopard Beach Resort, Diani', vehicleType: 'Toyota Land Cruiser', vehicleRegistration: 'KCQ 789T', driverName: 'Joseph Mutua', driverPhone: '+254 722 500 001', fare: 12000, currency: 'KES', passengers: 2, flightOrTrainDetails: 'KQ 101 arriving at 08:45', instructions: 'Driver will hold a TuaVois sign at arrivals.' } },
    },
  });

  // Service Voucher - Combined
  await prisma.voucher.upsert({
    where: { companyId_voucherNumber: { companyId: company.id, voucherNumber: 'VCH-2024-0003' } }, update: { companyId: company.id },
    create: { 
      voucherNumber: 'VCH-2024-0003', companyId: company.id, type: 'SERVICE', clientId: clients[3].id, tripId: trips[3].id, guestNames: 'Fatuma Ali, Ahmed Ali',
      services: {
        create: [
          { serviceType: 'FLIGHT', description: 'Kenya Airways KQ 450 - Nairobi (NBO) to Zanzibar (ZNZ)', date: futureDate(15), location: 'JKIA, Nairobi', reference: 'KQ450-001', sortOrder: 0 },
          { serviceType: 'HOTEL', description: 'Zanzibar Serena Hotel - 7 nights, Half Board', date: futureDate(15), location: 'Zanzibar Stone Town', reference: 'ZSH-20240215-FA', sortOrder: 1 },
          { serviceType: 'TRANSFER', description: 'Airport transfer: Zanzibar Airport to Serena Hotel', date: futureDate(15), location: 'Zanzibar Airport', reference: 'ZNZ-TRF-001', sortOrder: 2 },
          { serviceType: 'FLIGHT', description: 'Kenya Airways KQ 451 - Zanzibar (ZNZ) to Nairobi (NBO)', date: futureDate(22), location: 'Zanzibar Airport', reference: 'KQ451-002', sortOrder: 3 },
        ],
      },
    },
  });
  console.log('✅ Vouchers created');

  // =============================================
  // NOTIFICATIONS
  // =============================================
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: 'Invoice Overdue', message: 'Invoice INV-2024-0009 for Robert Maina is 5 days overdue (KES 95,000)', type: 'INVOICE', entityType: 'Invoice', entityId: invoices[8].id },
      { userId: admin.id, title: 'Invoice Overdue', message: 'Invoice INV-2024-0010 for Lucy Njeri is 10 days overdue (KES 42,000)', type: 'INVOICE', entityType: 'Invoice', entityId: invoices[9].id },
      { userId: jane.id, title: 'Payment Received', message: 'Payment of KES 175,000 received from David Mwangi for INV-2024-0001', type: 'PAYMENT' },
      { userId: peter.id, title: 'Trip Confirmed', message: 'Zanzibar trip for Fatuma Ali confirmed. Departure in 15 days.', type: 'TRIP', entityType: 'Trip', entityId: trips[3].id },
      { userId: grace.id, title: 'New Quotation Request', message: 'Agnes Mutua from Bidco Africa has requested a corporate team building quotation (KES 800,000)', type: 'QUOTATION' },
    ],
  });
  console.log('✅ Notifications created');

  // =============================================
  // AUDIT LOGS
  // =============================================
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'LOGIN', entity: 'User', entityId: admin.id },
      { userId: jane.id, action: 'CREATE', entity: 'Client', entityId: clients[0].id },
      { userId: jane.id, action: 'CREATE', entity: 'Invoice', entityId: invoices[0].id },
      { userId: grace.id, action: 'PAYMENT', entity: 'Payment', entityId: payments[2].id },
      { userId: peter.id, action: 'CREATE', entity: 'Trip', entityId: trips[3].id },
    ],
  });
  console.log('✅ Audit logs created');

  // =============================================
  // LINK DATA TO COMPANY
  // =============================================
  const models = [
    prisma.user, prisma.client, prisma.prospect, prisma.quotation,
    prisma.invoice, prisma.payment, prisma.receipt, prisma.trip,
    prisma.tripExpense, prisma.itinerary, prisma.voucher,
    prisma.notification, prisma.auditLog, prisma.letter, prisma.itineraryTemplate,
    prisma.documentSequence, prisma.document
  ];
  for (const model of models) {
    if (model) {
      await (model as any).updateMany({
        where: { companyId: null },
        data: { companyId: company.id }
      });
    }
  }
  console.log('✅ Linked all data to default company');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@tuavois.co.ke / password123');
  console.log('   Staff:   jane@tuavois.co.ke / password123');
  console.log('   Staff:   peter@tuavois.co.ke / password123');
  console.log('   Staff:   grace@tuavois.co.ke / password123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

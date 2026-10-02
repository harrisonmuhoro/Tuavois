import bcrypt from 'bcryptjs';
import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ConflictError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';

const roleDefinitions: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'ADMIN', description: 'Company owner and administrator', permissions: [
      'dashboard.view', 'search.view', 'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
      'prospects.view', 'prospects.create', 'prospects.edit', 'quotations.view', 'quotations.create', 'quotations.edit',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'payments.view', 'payments.create',
      'trips.view', 'trips.create', 'trips.edit', 'reports.view', 'finance.view', 'staff.manage', 'settings.manage',
      'letters.view', 'letters.create', 'letters.edit', 'letters.delete',
    ],
  },
  {
    name: 'SALES_CONSULTANT', description: 'Sales consultant access', permissions: [
      'dashboard.view', 'search.view', 'clients.view', 'clients.create', 'clients.edit', 'prospects.view',
      'prospects.create', 'prospects.edit', 'quotations.view', 'quotations.create', 'quotations.edit',
      'invoices.view', 'invoices.create', 'invoices.edit', 'payments.view', 'payments.create', 'trips.view',
      'trips.create', 'trips.edit', 'reports.view', 'letters.view', 'letters.create', 'letters.edit',
    ],
  },
  {
    name: 'OPERATIONS_STAFF', description: 'Operations team access', permissions: [
      'dashboard.view', 'search.view', 'clients.view', 'trips.view', 'trips.create', 'trips.edit', 'reports.view',
    ],
  },
  {
    name: 'ACCOUNTANT', description: 'Accounting and finance access', permissions: [
      'dashboard.view', 'search.view', 'clients.view', 'invoices.view', 'invoices.edit', 'payments.view',
      'payments.create', 'finance.view',
    ],
  },
];

export const provisionCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { company, owner } = req.body;
    const existingOwner = await prisma.user.findUnique({ where: { email: owner.email }, select: { id: true } });
    if (existingOwner) throw new ConflictError('An account with this email already exists');

    const result = await prisma.$transaction(async (tx) => {
      const createdCompany = await tx.company.create({ data: company });
      const permissionNames = [...new Set(roleDefinitions.flatMap((role) => role.permissions))];
      const permissions = await Promise.all(permissionNames.map((name) => tx.permission.upsert({
        where: { name }, update: {}, create: { name, description: name },
      })));
      const permissionIds = new Map(permissions.map((permission) => [permission.name, permission.id]));
      const roles = new Map<string, { id: string }>();

      for (const definition of roleDefinitions) {
        const existingRole = await tx.role.findUnique({ where: { name: definition.name }, select: { id: true } });
        const role = existingRole || await tx.role.create({
          data: {
            name: definition.name,
            description: definition.description,
            rolePermissions: { create: definition.permissions.map((name) => ({ permissionId: permissionIds.get(name)! })) },
          },
          select: { id: true },
        });
        roles.set(definition.name, role);
      }

      const password = await bcrypt.hash(owner.password, 12);
      const createdOwner = await tx.user.create({
        data: {
          name: owner.name, email: owner.email, password, phone: owner.phone,
          department: 'Management', roleId: roles.get('ADMIN')!.id, companyId: createdCompany.id,
        },
        select: { id: true, name: true, email: true, phone: true, companyId: true, role: { select: { id: true, name: true } } },
      });

      await tx.letter.create({
        data: {
          letterName: 'Welcome letter',
          details: `Welcome to ${createdCompany.name}. Use this template for your first client communication.`,
          createdById: createdOwner.id, companyId: createdCompany.id,
        },
      });
      await tx.itineraryTemplate.create({
        data: {
          name: 'Standard travel itinerary', destination: 'Destination', numTravellers: 1,
          introduction: 'We look forward to hosting you.', inclusiveOf: 'As listed in the quotation.',
          exclusiveOf: 'Personal expenses and items not listed.', importantInfo: 'Please confirm travel documents before departure.',
          termsConditions: 'Subject to the agreed quotation terms.', days: [], createdById: createdOwner.id, companyId: createdCompany.id,
        },
      });
      await tx.auditLog.create({
        data: { userId: createdOwner.id, companyId: createdCompany.id, action: 'COMPANY_PROVISIONED', entity: 'Company', entityId: createdCompany.id },
      });
      return { company: createdCompany, owner: createdOwner };
    });

    res.status(201).json({ success: true, message: 'Company provisioned successfully', data: result });
  } catch (error) { next(error); }
};

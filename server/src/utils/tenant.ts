import { AuthRequest } from '../middleware/auth.middleware';
import { ForbiddenError, NotFoundError } from './errors';

/**
 * Returns the companyId scope for Prisma where clauses.
 * Ensures every query is tenant-isolated.
 */
export const tenantScope = (req: AuthRequest): { companyId: string } => {
  const companyId = req.companyId ?? (req.user?.scope === 'COMPANY' ? req.user.companyId : null);
  if (!companyId) throw new ForbiddenError('A company context is required for this operation');
  return { companyId };
};

/** Verify an optional relation belongs to the authenticated company. */
export const assertTenantRecord = async (
  db: any,
  model: string,
  id: string | null | undefined,
  companyId: string,
  label: string,
): Promise<void> => {
  if (!id) return;
  const record = await db[model].findFirst({ where: { id, companyId }, select: { id: true } });
  if (!record) throw new NotFoundError(label);
};

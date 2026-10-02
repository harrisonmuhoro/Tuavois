import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from './errors';

/**
 * Returns the companyId scope for Prisma where clauses.
 * Ensures every query is tenant-isolated.
 */
export const tenantScope = (req: AuthRequest): { companyId: string } => ({
  companyId: req.companyId ?? req.user!.companyId,
});

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

import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Returns the companyId scope for Prisma where clauses.
 * Ensures every query is tenant-isolated.
 */
export const tenantScope = (req: AuthRequest): { companyId: string | null } => ({
  companyId: req.user?.companyId ?? null,
});

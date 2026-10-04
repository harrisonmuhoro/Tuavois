import { z } from 'zod';

const productionEnvironment = z.object({
  NODE_ENV: z.literal('production'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters in production'),
  JWT_EXPIRES_IN: z.string().min(1),
  CLIENT_URL: z.string().url(),
  UPLOAD_DIR: z.string().min(1),
  ALLOW_PUBLIC_COMPANY_PROVISIONING: z.enum(['true', 'false']).default('false'),
});

/** Fails fast only in production, leaving local developer defaults usable. */
export const validateEnvironment = (): void => {
  if (process.env.NODE_ENV !== 'production') return;
  const result = productionEnvironment.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid production environment: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  if (/mysql:\/\/[^:]+:@/i.test(result.data.DATABASE_URL)) {
    throw new Error('Invalid production environment: DATABASE_URL must not use a blank MySQL password');
  }
  if (['change-this-in-production', 'password123'].includes(result.data.JWT_SECRET)) {
    throw new Error('Invalid production environment: JWT_SECRET uses a known development value');
  }
};

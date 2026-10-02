import { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * Runs a serializable transaction and retries transient MySQL serialization
 * conflicts. This is used by payment and credit application mutations so a
 * concurrent request does not surface an avoidable conflict to the user.
 */
export const runSerializableTransaction = async <T>(
  prisma: { $transaction: Function },
  operation: (tx: TransactionClient) => Promise<T>,
  maxAttempts = 3,
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isRetryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isRetryable || attempt === maxAttempts) throw error;
    }
  }

  throw new Error('Transaction failed after retries');
};

/**
 * Reserve the next sequence value inside the caller's transaction. MySQL
 * upsert increments the counter atomically, preventing duplicate document
 * numbers under concurrent requests.
 */
export const reserveDocumentNumber = async (
  tx: any,
  key: string,
  prefix: string,
  width: number,
): Promise<string> => {
  // MySQL's atomic increment plus a row lock keeps the value read below
  // associated with this transaction under concurrent reservations. Keep the
  // fallback for lightweight unit-test doubles that only implement Prisma's
  // model API.
  if (typeof tx.$executeRaw === 'function' && typeof tx.$queryRaw === 'function') {
    await tx.$executeRaw`INSERT INTO document_sequences (\`key\`, nextValue, updatedAt) VALUES (${key}, 1, NOW(3)) ON DUPLICATE KEY UPDATE nextValue = nextValue + 1, updatedAt = NOW(3)`;
    const rows = await tx.$queryRaw`SELECT nextValue FROM document_sequences WHERE \`key\` = ${key}`;
    return `${prefix}-${String(Number(rows[0].nextValue)).padStart(width, '0')}`;
  }
  const sequence = await tx.documentSequence.upsert({
    where: { key },
    create: { key, nextValue: 1 },
    update: { nextValue: { increment: 1 } },
  });
  return `${prefix}-${String(sequence.nextValue).padStart(width, '0')}`;
};

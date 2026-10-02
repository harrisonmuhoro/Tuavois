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
  companyId?: string,
): Promise<string> => {
  const scopedKey = `${companyId || 'global'}:${key}`;
  // MySQL's atomic increment plus a row lock keeps the value read below
  // associated with this transaction under concurrent reservations. Keep the
  // fallback for lightweight unit-test doubles that only implement Prisma's
  // model API.
  if (typeof tx.$executeRaw === 'function' && typeof tx.$queryRaw === 'function') {
    await tx.$executeRaw`INSERT INTO document_sequences (\`key\`, nextValue, updatedAt, companyId) VALUES (${scopedKey}, 1, NOW(3), ${companyId || null}) ON DUPLICATE KEY UPDATE nextValue = nextValue + 1, updatedAt = NOW(3)`;
    const rows = await tx.$queryRaw`SELECT nextValue FROM document_sequences WHERE \`key\` = ${scopedKey}`;
    return `${prefix}-${String(Number(rows[0].nextValue)).padStart(width, '0')}`;
  }
  const sequence = await tx.documentSequence.upsert({
    where: { key: scopedKey },
    create: { key: scopedKey, nextValue: 1, companyId },
    update: { nextValue: { increment: 1 } },
  });
  return `${prefix}-${String(sequence.nextValue).padStart(width, '0')}`;
};

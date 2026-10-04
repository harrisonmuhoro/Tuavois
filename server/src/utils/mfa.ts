import crypto from 'crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (value: Buffer): string => {
  let bits = 0; let buffer = 0; let output = '';
  for (const byte of value) {
    buffer = (buffer << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(buffer >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += alphabet[(buffer << (5 - bits)) & 31];
  return output;
};

const base32Decode = (value: string): Buffer => {
  let bits = 0; let buffer = 0; const bytes: number[] = [];
  for (const character of value.replace(/=+$/, '').toUpperCase()) {
    const index = alphabet.indexOf(character); if (index < 0) throw new Error('Invalid MFA secret');
    buffer = (buffer << 5) | index; bits += 5;
    if (bits >= 8) { bytes.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
};

const key = (): Buffer => crypto.createHash('sha256').update(process.env.JWT_SECRET || 'development-mfa-key').digest();

export const encryptMfaSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
};

export const decryptMfaSecret = (payload: string): string => {
  const [ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataEncoded, 'base64url')), decipher.final()]).toString('utf8');
};

export const createMfaSecret = (): string => base32Encode(crypto.randomBytes(20));

export const totp = (secret: string, counter: number): string => {
  const message = Buffer.alloc(8); message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
};

export const verifyTotp = (secret: string, code: string, now = Date.now()): boolean => {
  const counter = Math.floor(now / 30_000);
  return [-1, 0, 1].some((offset) => totp(secret, counter + offset) === code);
};

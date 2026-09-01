import crypto from 'node:crypto';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPasswordHash(password, stored) {
  const [kind, salt, expected] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  let actual;
  try { actual = crypto.scryptSync(String(password || ''), salt, 64).toString('hex'); }
  catch { return false; }
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

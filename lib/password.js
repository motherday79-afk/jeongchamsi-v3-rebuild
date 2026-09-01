import crypto from 'node:crypto';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function safeHexEqual(actual, expected) {
  if (!/^[a-f0-9]+$/i.test(actual) || !/^[a-f0-9]+$/i.test(expected)) return false;
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function passwordHashKind(stored) {
  const value = String(stored || '').trim();
  if (/^scrypt\$[^$]+\$[a-f0-9]+$/i.test(value)) return 'scrypt';
  if (/^[a-f0-9]{64}$/i.test(value) || /^sha-?256[$:][a-f0-9]{64}$/i.test(value)) return 'sha256';
  return 'unknown';
}

export function verifyPasswordHash(password, stored) {
  const value = String(stored || '').trim();
  const kind = passwordHashKind(value);
  if (kind === 'scrypt') {
    const [, salt, expected] = value.split('$');
    try {
      const actual = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
      return safeHexEqual(actual, expected);
    } catch { return false; }
  }
  if (kind === 'sha256') {
    const expected = value.replace(/^sha-?256[$:]/i, '');
    const actual = crypto.createHash('sha256').update(String(password || ''), 'utf8').digest('hex');
    return safeHexEqual(actual, expected);
  }
  return false;
}

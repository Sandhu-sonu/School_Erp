import { scryptSync, randomBytes } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(':')) {
    return false;
  }
  const [salt, storedHash] = storedValue.split(':');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return hash === storedHash;
}

import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt itself ignores anything past 72 bytes, so the limit comes from the algorithm. */
export const PASSWORD_MAX_LENGTH = 72;

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Emails are compared without case and without surrounding whitespace. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

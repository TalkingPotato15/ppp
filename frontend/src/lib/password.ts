import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch {
    return false;
  }
}

/**
 * Validate password meets strength requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - Must contain at least one letter
 * - Must contain at least one number
 */
export function validatePasswordStrength(
  password: string
): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}

/**
 * Hash a token for storage using SHA-256
 * Used for refresh tokens where we need to look up by hash
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

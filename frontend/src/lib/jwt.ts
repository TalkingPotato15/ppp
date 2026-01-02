import { SignJWT, jwtVerify, JWTPayload } from 'jose';

// Get secret as Uint8Array for jose library
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET_KEY);

const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '15'
);
const REFRESH_TOKEN_EXPIRE_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7'
);
const REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER || '30'
);

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

export interface TokenPayload extends JWTPayload {
  sub: string;
  type: 'access' | 'refresh';
}

/**
 * Create a new access token
 */
export async function createAccessToken(
  userId: string,
  expiresInMinutes: number = ACCESS_TOKEN_EXPIRE_MINUTES
): Promise<string> {
  const token = await new SignJWT({ sub: userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${expiresInMinutes}m`)
    .setIssuedAt()
    .sign(getSecret());

  return token;
}

/**
 * Create a new refresh token
 */
export async function createRefreshToken(
  userId: string,
  rememberMe: boolean = false
): Promise<{ token: string; expiresAt: Date }> {
  const days = rememberMe
    ? REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER
    : REFRESH_TOKEN_EXPIRE_DAYS;

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${days}d`)
    .setIssuedAt()
    .sign(getSecret());

  return { token, expiresAt };
}

/**
 * Decode and validate a JWT token
 */
export async function decodeToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as TokenPayload;
  } catch (error) {
    throw new TokenError(`Invalid token: ${error}`);
  }
}

/**
 * Extract user ID from a token
 */
export async function getUserIdFromToken(token: string): Promise<string> {
  const payload = await decodeToken(token);
  const userId = payload.sub;

  if (!userId) {
    throw new TokenError('Token does not contain user ID');
  }

  return userId;
}

/**
 * Verify that a token is of the expected type
 */
export async function verifyTokenType(
  token: string,
  expectedType: 'access' | 'refresh'
): Promise<boolean> {
  try {
    const payload = await decodeToken(token);
    return payload.type === expectedType;
  } catch {
    return false;
  }
}

/**
 * Cookie options for access token
 */
export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
  path: '/',
};

/**
 * Cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(rememberMe: boolean = false) {
  const days = rememberMe
    ? REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER
    : REFRESH_TOKEN_EXPIRE_DAYS;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: days * 24 * 60 * 60,
    path: '/',
  };
}

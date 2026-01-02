import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { decodeToken, TokenError, verifyTokenType } from './jwt';
import { supabaseAdmin, User } from './supabase';

/**
 * Get current user from request cookies
 * Returns null if not authenticated
 */
export async function getCurrentUser(
  request?: NextRequest
): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return null;
    }

    // Verify token type
    const isAccessToken = await verifyTokenType(accessToken, 'access');
    if (!isAccessToken) {
      return null;
    }

    // Decode token to get user ID
    const payload = await decodeToken(accessToken);
    const userId = payload.sub;

    if (!userId) {
      return null;
    }

    // Fetch user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    if (error instanceof TokenError) {
      console.log('Token error:', error.message);
    }
    return null;
  }
}

/**
 * Require authentication - returns user or throws error response
 */
export async function requireAuth(
  request?: NextRequest
): Promise<User> {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new AuthError('Not authenticated', 401);
  }

  return user;
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ detail: message }, { status });
}

/**
 * Helper to handle auth errors in API routes
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return createErrorResponse(error.message, error.statusCode);
  }
  console.error('Unexpected error:', error);
  return createErrorResponse('Internal server error', 500);
}

/**
 * Wrapper for protected API routes
 */
export function withAuth<T>(
  handler: (request: NextRequest, user: User) => Promise<T>
) {
  return async (request: NextRequest): Promise<NextResponse | T> => {
    try {
      const user = await requireAuth(request);
      return handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

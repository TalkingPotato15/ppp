export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { hashToken } from '@/lib/password';
import {
  createAccessToken,
  decodeToken,
  accessTokenCookieOptions,
  TokenError,
} from '@/lib/jwt';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();

  try {
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { detail: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Verify refresh token exists in database and is not revoked
    const tokenHash = hashToken(refreshToken);
    const { data: storedToken, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_revoked', false)
      .single();

    if (error || !storedToken) {
      // Clear cookies on invalid token
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json(
        { detail: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json(
        { detail: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Decode and verify token
    let userId: string;
    try {
      const payload = await decodeToken(refreshToken);
      if (!payload.sub || payload.type !== 'refresh') {
        throw new TokenError('Invalid token type');
      }
      userId = payload.sub;
    } catch {
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json(
        { detail: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Create new access token
    const accessToken = await createAccessToken(userId);

    // Set new access token cookie
    cookieStore.set('access_token', accessToken, accessTokenCookieOptions);

    return NextResponse.json({ access_token: accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

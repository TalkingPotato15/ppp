export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword, hashToken } from '@/lib/password';
import {
  createAccessToken,
  createRefreshToken,
  accessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, remember_me = false } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user uses password auth
    if (user.auth_provider !== 'LOCAL' || !user.password_hash) {
      return NextResponse.json(
        { detail: 'Please use Google login for this account' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Create tokens
    const accessToken = await createAccessToken(user.id);
    const { token: refreshToken, expiresAt } = await createRefreshToken(
      user.id,
      remember_me
    );

    // Save refresh token
    await supabaseAdmin.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: expiresAt.toISOString(),
    });

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Set cookies
    const cookieStore = cookies();
    cookieStore.set('access_token', accessToken, accessTokenCookieOptions);
    cookieStore.set(
      'refresh_token',
      refreshToken,
      getRefreshTokenCookieOptions(remember_me)
    );

    // Return response
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        auth_provider: user.auth_provider,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      access_token: accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

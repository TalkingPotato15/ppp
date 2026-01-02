export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, validatePasswordStrength, hashToken } from '@/lib/password';
import {
  createAccessToken,
  createRefreshToken,
  accessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nickname } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return NextResponse.json({ detail: validation.error }, { status: 400 });
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { detail: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        nickname: nickname || null,
        password_hash: passwordHash,
        auth_provider: 'LOCAL',
      })
      .select()
      .single();

    if (createError || !user) {
      console.error('Failed to create user:', createError);
      return NextResponse.json(
        { detail: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create tokens
    const accessToken = await createAccessToken(user.id);
    const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

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
    cookieStore.set('refresh_token', refreshToken, getRefreshTokenCookieOptions());

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
    console.error('Register error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

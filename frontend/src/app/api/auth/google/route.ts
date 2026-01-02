export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { hashToken } from '@/lib/password';
import {
  createAccessToken,
  createRefreshToken,
  accessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '@/lib/jwt';

interface GoogleUserInfo {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );

  if (!response.ok) {
    throw new Error('Invalid Google token');
  }

  const data = await response.json();

  // Verify audience matches our client ID
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (data.aud !== clientId) {
    throw new Error('Token audience mismatch');
  }

  // Verify email is verified
  if (data.email_verified !== 'true') {
    throw new Error('Email not verified');
  }

  return {
    google_id: data.sub,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    picture: data.picture,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_token } = body;

    if (!id_token) {
      return NextResponse.json(
        { detail: 'ID token is required' },
        { status: 400 }
      );
    }

    // Verify Google token
    let googleInfo: GoogleUserInfo;
    try {
      googleInfo = await verifyGoogleToken(id_token);
    } catch (error) {
      return NextResponse.json(
        { detail: error instanceof Error ? error.message : 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user exists by Google ID
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('google_id', googleInfo.google_id)
      .single();

    if (!user) {
      // Check if email exists with different auth
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', googleInfo.email)
        .single();

      if (existingUser) {
        return NextResponse.json(
          {
            detail:
              'Email already registered with password. Please login with password.',
          },
          { status: 409 }
        );
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: googleInfo.email,
          nickname: googleInfo.name,
          auth_provider: 'GOOGLE',
          google_id: googleInfo.google_id,
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Failed to create user:', createError);
        return NextResponse.json(
          { detail: 'Failed to create user' },
          { status: 500 }
        );
      }

      user = newUser;
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Create tokens (Google users get remember_me by default)
    const accessToken = await createAccessToken(user.id);
    const { token: refreshToken, expiresAt } = await createRefreshToken(
      user.id,
      true // remember_me
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
    cookieStore.set('refresh_token', refreshToken, getRefreshTokenCookieOptions(true));

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
    console.error('Google auth error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

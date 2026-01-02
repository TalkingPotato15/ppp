export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { decodeToken, TokenError } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return NextResponse.json(
        { detail: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password
    const validation = validatePasswordStrength(new_password);
    if (!validation.valid) {
      return NextResponse.json({ detail: validation.error }, { status: 400 });
    }

    // Verify token
    let userId: string;
    try {
      const payload = await decodeToken(token);
      if (!payload.sub) {
        throw new TokenError('Invalid token');
      }
      userId = payload.sub;
    } catch {
      return NextResponse.json(
        { detail: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update password
    const passwordHash = await hashPassword(new_password);
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)
      .eq('auth_provider', 'LOCAL');

    if (updateError) {
      return NextResponse.json(
        { detail: 'User not found' },
        { status: 400 }
      );
    }

    // Revoke all refresh tokens for this user
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ is_revoked: true })
      .eq('user_id', userId);

    return NextResponse.json({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const user = await requireAuth();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      auth_provider: user.auth_provider,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { nickname } = body;

    // Validate nickname if provided
    if (nickname !== undefined && nickname !== null) {
      if (typeof nickname !== 'string' || nickname.length > 100) {
        return NextResponse.json(
          { detail: 'Nickname must be a string with max 100 characters' },
          { status: 400 }
        );
      }
    }

    // Update user
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({ nickname: nickname || null })
      .eq('id', user.id)
      .select()
      .single();

    if (error || !updatedUser) {
      console.error('Failed to update user:', error);
      return NextResponse.json(
        { detail: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      auth_provider: updatedUser.auth_provider,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
      last_login_at: updatedUser.last_login_at,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

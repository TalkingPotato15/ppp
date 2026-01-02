export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: session, error } = await supabaseAdmin
      .from('generation_sessions')
      .select(`
        *,
        ideas:generated_ideas(*)
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { detail: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { detail: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(session);

  } catch (error) {
    return handleAuthError(error);
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { problemId } = await params;

    const { data: session, error } = await supabaseAdmin
      .from('generation_sessions')
      .select(`
        *,
        ideas:generated_ideas(*)
      `)
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { detail: 'No session found for this problem' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);

  } catch (error) {
    return handleAuthError(error);
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth();
    const { ideaId } = await params;
    const body = await request.json();
    const { is_bookmarked } = body;

    if (typeof is_bookmarked !== 'boolean') {
      return NextResponse.json(
        { detail: 'is_bookmarked is required and must be a boolean' },
        { status: 400 }
      );
    }

    // Get idea and verify ownership via session
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from('generated_ideas')
      .select('*, session:generation_sessions(user_id)')
      .eq('id', ideaId)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json(
        { detail: 'Idea not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (idea.session.user_id !== user.id) {
      return NextResponse.json(
        { detail: 'Access denied' },
        { status: 403 }
      );
    }

    // Update bookmark status
    const { error: updateError } = await supabaseAdmin
      .from('generated_ideas')
      .update({ is_bookmarked })
      .eq('id', ideaId);

    if (updateError) {
      console.error('Failed to update bookmark:', updateError);
      return NextResponse.json(
        { detail: 'Failed to update bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      idea_id: ideaId,
      is_bookmarked,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

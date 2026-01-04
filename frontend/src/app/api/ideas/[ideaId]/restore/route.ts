export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

// Restore a soft-deleted idea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth();
    const { ideaId } = await params;

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

    // Restore (set is_deleted = false)
    const { error: updateError } = await supabaseAdmin
      .from('generated_ideas')
      .update({ is_deleted: false })
      .eq('id', ideaId);

    if (updateError) {
      console.error('Failed to restore idea:', updateError);
      return NextResponse.json(
        { detail: 'Failed to restore idea' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      idea_id: ideaId,
      is_deleted: false,
      message: 'Idea restored to My Ideas',
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

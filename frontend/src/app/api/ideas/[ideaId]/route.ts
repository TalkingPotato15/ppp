export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

// Soft delete an idea
export async function DELETE(
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

    // Soft delete (set is_deleted = true)
    const { error: updateError } = await supabaseAdmin
      .from('generated_ideas')
      .update({ is_deleted: true })
      .eq('id', ideaId);

    if (updateError) {
      console.error('Failed to delete idea:', updateError);
      return NextResponse.json(
        { detail: 'Failed to delete idea' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      idea_id: ideaId,
      is_deleted: true,
      message: 'Idea removed from My Ideas',
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ savedId: string }> }
) {
  try {
    const user = await requireAuth();
    const { savedId } = await params;

    // Delete saved idea (only if owned by user)
    const { data, error } = await supabaseAdmin
      .from('saved_ideas')
      .delete()
      .eq('id', savedId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { detail: 'Saved idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Idea removed from saved collection',
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

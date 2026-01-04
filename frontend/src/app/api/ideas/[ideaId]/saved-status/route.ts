export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth();
    const { ideaId } = await params;

    // Get idea details
    const { data: idea } = await supabaseAdmin
      .from('generated_ideas')
      .select('id, title, description')
      .eq('id', ideaId)
      .single();

    // Get saved status
    const { data: saved } = await supabaseAdmin
      .from('saved_ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .single();

    return NextResponse.json({
      is_saved: saved !== null,
      saved_id: saved?.id || null,
      title: idea?.title || null,
      description: idea?.description || null,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

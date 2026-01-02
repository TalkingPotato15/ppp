export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's sessions with count
    const { data: sessions, error, count } = await supabaseAdmin
      .from('generation_sessions')
      .select(`
        *,
        ideas:generated_ideas(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: sessions || [],
      total: count || 0,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

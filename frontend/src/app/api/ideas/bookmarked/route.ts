export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get bookmarked ideas from user's sessions
    const { data: ideas, error, count } = await supabaseAdmin
      .from('generated_ideas')
      .select(`
        id,
        title,
        description,
        target_audience,
        differentiators,
        market_opportunity,
        implementation_hints,
        market_signals,
        confidence_score,
        is_bookmarked,
        created_at,
        session:generation_sessions!inner(user_id, problem_id)
      `, { count: 'exact' })
      .eq('is_bookmarked', true)
      .eq('session.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch bookmarked ideas:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch bookmarked ideas' },
        { status: 500 }
      );
    }

    // Fetch problem titles
    const items = await Promise.all(
      (ideas || []).map(async (idea) => {
        const session = idea.session as any;
        const problemId = session?.problem_id;

        let problemTitle = 'Unknown Problem';
        if (problemId) {
          const { data: problem } = await supabaseAdmin
            .from('document_summaries')
            .select('title')
            .eq('id', problemId)
            .single();
          problemTitle = problem?.title || 'Unknown Problem';
        }

        return {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          target_audience: idea.target_audience,
          differentiators: idea.differentiators,
          market_opportunity: idea.market_opportunity,
          implementation_hints: idea.implementation_hints,
          market_signals: idea.market_signals,
          confidence_score: idea.confidence_score,
          is_bookmarked: idea.is_bookmarked,
          created_at: idea.created_at,
          problem_id: problemId,
          problem_title: problemTitle,
        };
      })
    );

    return NextResponse.json({
      items,
      total: count || 0,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

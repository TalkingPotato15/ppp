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

    // Get saved ideas with related data
    const { data: savedIdeas, error, count } = await supabaseAdmin
      .from('saved_ideas')
      .select(`
        id,
        notes,
        saved_at,
        idea:generated_ideas(
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
          session:generation_sessions(problem_id)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch saved ideas:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch saved ideas' },
        { status: 500 }
      );
    }

    // Fetch problem titles for each saved idea
    const items = await Promise.all(
      (savedIdeas || []).map(async (saved) => {
        const idea = saved.idea as any;
        const problemId = idea?.session?.problem_id;

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
          id: saved.id,
          idea: {
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
          },
          problem_id: problemId,
          problem_title: problemTitle,
          notes: saved.notes,
          saved_at: saved.saved_at,
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

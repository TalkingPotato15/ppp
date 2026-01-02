export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth();
    const { ideaId } = await params;
    const body = await request.json();
    const { notes } = body;

    // Check if idea exists
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from('generated_ideas')
      .select('*, session:generation_sessions(*)')
      .eq('id', ideaId)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json(
        { detail: 'Idea not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from('saved_ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .single();

    if (existing) {
      return NextResponse.json(
        { detail: 'Idea already saved' },
        { status: 409 }
      );
    }

    // Save the idea
    const { data: savedIdea, error: saveError } = await supabaseAdmin
      .from('saved_ideas')
      .insert({
        user_id: user.id,
        idea_id: ideaId,
        notes: notes || null,
      })
      .select()
      .single();

    if (saveError || !savedIdea) {
      console.error('Failed to save idea:', saveError);
      return NextResponse.json(
        { detail: 'Failed to save idea' },
        { status: 500 }
      );
    }

    // Get problem title for response
    const { data: problem } = await supabaseAdmin
      .from('document_summaries')
      .select('title')
      .eq('id', idea.session.problem_id)
      .single();

    return NextResponse.json({
      id: savedIdea.id,
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
      problem_id: idea.session.problem_id,
      problem_title: problem?.title || 'Unknown Problem',
      notes: savedIdea.notes,
      saved_at: savedIdea.saved_at,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

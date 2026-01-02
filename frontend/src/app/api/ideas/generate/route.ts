export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, GenerationStatus } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { generateIdeas } from '@/lib/ai-agent';
import { getRAGContext } from '@/lib/vector-search';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { problem_id, feedback } = body;

    if (!problem_id) {
      return NextResponse.json(
        { detail: 'problem_id is required' },
        { status: 400 }
      );
    }

    // Get the problem
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('document_summaries')
      .select('*')
      .eq('id', problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { detail: 'Problem not found' },
        { status: 404 }
      );
    }

    // Check for existing completed session (one-time generation)
    const { data: existingSession } = await supabaseAdmin
      .from('generation_sessions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('problem_id', problem_id)
      .eq('status', 'COMPLETED')
      .single();

    if (existingSession) {
      return NextResponse.json(
        { detail: 'Ideas already generated for this problem. Generation is one-time only.' },
        { status: 409 }
      );
    }

    // Create generation session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('generation_sessions')
      .insert({
        user_id: user.id,
        problem_id,
        feedback: feedback || null,
        status: 'GENERATING' as GenerationStatus,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { detail: 'Failed to create generation session' },
        { status: 500 }
      );
    }

    try {
      // Get RAG context
      const ragContext = await getRAGContext(problem);

      // Store RAG context
      await supabaseAdmin
        .from('generation_sessions')
        .update({ rag_context: { documents: ragContext.documents } })
        .eq('id', session.id);

      // Generate ideas
      const ideasData = await generateIdeas({
        problemTitle: problem.title,
        keywords: problem.keywords || [],
        domain: problem.domain_tag || 'general',
        trend: problem.trend || 'STABLE',
        sentiment: problem.sentiment || 'NEUTRAL',
        ragContext: ragContext.formatted,
      });

      // Save ideas to database
      const ideasToInsert = ideasData.map(idea => ({
        session_id: session.id,
        title: idea.title,
        description: idea.description,
        target_audience: idea.target_audience,
        differentiators: idea.differentiators,
        market_opportunity: idea.market_opportunity,
        implementation_hints: idea.implementation_hints,
        market_signals: idea.market_signals,
        confidence_score: idea.confidence_score,
        is_bookmarked: false,
      }));

      const { error: ideasError } = await supabaseAdmin
        .from('generated_ideas')
        .insert(ideasToInsert);

      if (ideasError) {
        throw new Error(`Failed to save ideas: ${ideasError.message}`);
      }

      // Update session status to completed
      await supabaseAdmin
        .from('generation_sessions')
        .update({
          status: 'COMPLETED' as GenerationStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      // Fetch the complete session with ideas
      const { data: completedSession } = await supabaseAdmin
        .from('generation_sessions')
        .select(`
          *,
          ideas:generated_ideas(*)
        `)
        .eq('id', session.id)
        .single();

      return NextResponse.json(completedSession);

    } catch (genError) {
      console.error('Generation failed:', genError);

      // Update session status to failed
      await supabaseAdmin
        .from('generation_sessions')
        .update({
          status: 'FAILED' as GenerationStatus,
          error_message: genError instanceof Error ? genError.message : 'Unknown error',
        })
        .eq('id', session.id);

      return NextResponse.json(
        { detail: 'Failed to generate ideas. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    return handleAuthError(error);
  }
}

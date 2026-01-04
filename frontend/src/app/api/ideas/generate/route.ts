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
    const { problem_id, payment_id, feedback } = body;

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

    // Payment validation - find or validate unused payment for this problem
    let validatedPaymentId: string | null = null;

    if (payment_id) {
      // Validate the provided payment_id
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        return NextResponse.json(
          { detail: 'Payment not found' },
          { status: 404 }
        );
      }

      if (payment.user_id !== user.id) {
        return NextResponse.json(
          { detail: 'Payment does not belong to this user' },
          { status: 403 }
        );
      }

      if (payment.problem_id !== problem_id) {
        return NextResponse.json(
          { detail: 'Payment is for a different problem' },
          { status: 400 }
        );
      }

      if (payment.is_used) {
        return NextResponse.json(
          { detail: 'Payment has already been used for generation' },
          { status: 409 }
        );
      }

      if (payment.status !== 'SUCCESS') {
        return NextResponse.json(
          { detail: 'Payment is not successful' },
          { status: 400 }
        );
      }

      validatedPaymentId = payment.id;
    } else {
      // Find an unused payment for this user and problem
      const { data: unusedPayment } = await supabaseAdmin
        .from('payment_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('problem_id', problem_id)
        .eq('status', 'SUCCESS')
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!unusedPayment) {
        return NextResponse.json(
          { detail: 'No unused payment found for this problem. Please complete payment first.' },
          { status: 402 }
        );
      }

      validatedPaymentId = unusedPayment.id;
    }

    // Mark payment as used before generation
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedPaymentId)
      .eq('is_used', false); // Ensure atomicity

    if (updatePaymentError) {
      return NextResponse.json(
        { detail: 'Failed to reserve payment. It may have been used by another request.' },
        { status: 409 }
      );
    }

    // Create generation session with payment_id
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('generation_sessions')
      .insert({
        user_id: user.id,
        problem_id,
        payment_id: validatedPaymentId,
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
        is_deleted: false,
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

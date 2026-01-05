export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { generateTechnicalSpecification, type TechArchitectInput } from '@/lib/tech-architect-agent';
import { validateConstraints, isValidationSuccess } from '@/lib/constraint-validator';
import type { UserConstraints, SpecStatus, TechnicalSpecification } from '@/types/stage-c';

interface CreateSpecRequest {
  ideaId: string;
  constraints: UserConstraints;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSpecToFrontend(dbSpec: any): TechnicalSpecification {
  return {
    id: dbSpec.id,
    userId: dbSpec.user_id,
    ideaId: dbSpec.idea_id,
    versionNumber: dbSpec.version_number,
    constraintsSnapshot: dbSpec.constraints_snapshot,
    prd: dbSpec.prd_content,
    architecture: dbSpec.architecture_content,
    roadmap: dbSpec.roadmap_content,
    techStack: dbSpec.techstack_content,
    status: dbSpec.status,
    errorMessage: dbSpec.error_message,
    createdAt: dbSpec.created_at,
    completedAt: dbSpec.completed_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ideaId, constraints } = body as CreateSpecRequest;

    if (!ideaId) {
      return NextResponse.json(
        { detail: 'ideaId is required' },
        { status: 400 }
      );
    }

    if (!constraints) {
      return NextResponse.json(
        { detail: 'constraints are required' },
        { status: 400 }
      );
    }

    // Validate constraints
    const validationResult = validateConstraints(constraints);
    if (!isValidationSuccess(validationResult)) {
      return NextResponse.json(
        { detail: 'Invalid constraints', errors: validationResult.errors },
        { status: 400 }
      );
    }

    // Get the idea
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from('generated_ideas')
      .select('*')
      .eq('id', ideaId)
      .single();

    if (ideaError || !idea) {
      console.error('Idea fetch error:', ideaError);
      return NextResponse.json(
        { detail: 'Idea not found' },
        { status: 404 }
      );
    }

    // Get session and problem info separately (optional, for context)
    let problemTitle = 'Business Problem';
    let problemDomain = 'general';

    if (idea.session_id) {
      const { data: session } = await supabaseAdmin
        .from('generation_sessions')
        .select('problem_id')
        .eq('id', idea.session_id)
        .single();

      if (session?.problem_id) {
        const { data: problem } = await supabaseAdmin
          .from('document_summaries')
          .select('title, domain_tag')
          .eq('id', session.problem_id)
          .single();

        if (problem) {
          problemTitle = problem.title || problemTitle;
          problemDomain = problem.domain_tag || problemDomain;
        }
      }
    }

    // Get next version number FIRST to determine if it's initial or regeneration
    const { data: existingSpecs } = await supabaseAdmin
      .from('technical_specifications')
      .select('version_number')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .order('version_number', { ascending: false })
      .limit(1);

    const versionNumber = (existingSpecs?.[0]?.version_number || 0) + 1;
    const isInitialGeneration = versionNumber === 1;

    // Handle quota based on generation type
    let remainingCount = 3; // Default

    if (isInitialGeneration) {
      // Initial generation - just initialize quota, don't consume
      const { error: quotaError } = await supabaseAdmin
        .from('regeneration_quotas')
        .upsert({
          user_id: user.id,
          idea_id: ideaId,
          used_count: 0,
          max_count: 3,
          version: 1,
        }, { onConflict: 'user_id,idea_id' });

      if (quotaError) {
        console.error('Quota initialization error:', quotaError);
      }
      remainingCount = 3;
    } else {
      // Regeneration - check and consume quota
      const { data: quota } = await supabaseAdmin
        .from('regeneration_quotas')
        .select('*')
        .eq('user_id', user.id)
        .eq('idea_id', ideaId)
        .single();

      if (!quota) {
        return NextResponse.json(
          { detail: 'Quota not found' },
          { status: 500 }
        );
      }

      if (quota.used_count >= quota.max_count) {
        return NextResponse.json(
          {
            detail: 'Regeneration quota exceeded',
            remainingCount: 0,
          },
          { status: 429 }
        );
      }

      // Consume one quota
      const { error: updateError } = await supabaseAdmin
        .from('regeneration_quotas')
        .update({
          used_count: quota.used_count + 1,
          version: quota.version + 1,
        })
        .eq('id', quota.id)
        .eq('version', quota.version);

      if (updateError) {
        return NextResponse.json(
          { detail: 'Failed to consume quota. Please try again.' },
          { status: 500 }
        );
      }

      remainingCount = quota.max_count - (quota.used_count + 1);
    }

    // Create specification record with 'generating' status
    const { data: spec, error: specError } = await supabaseAdmin
      .from('technical_specifications')
      .insert({
        user_id: user.id,
        idea_id: ideaId,
        version_number: versionNumber,
        constraints_snapshot: constraints,
        status: 'generating' as SpecStatus,
      })
      .select()
      .single();

    if (specError || !spec) {
      console.error('Failed to create specification:', specError);
      return NextResponse.json(
        { detail: 'Failed to create specification record' },
        { status: 500 }
      );
    }

    try {
      // Prepare input for Tech Architect Agent
      const input: TechArchitectInput = {
        ideaTitle: idea.title,
        ideaDescription: idea.description,
        targetAudience: idea.target_audience || '',
        differentiators: idea.differentiators || [],
        marketOpportunity: idea.market_opportunity || '',
        problemTitle,
        problemDomain,
        constraints,
      };

      // Generate technical specification
      const result = await generateTechnicalSpecification(input);

      // Update specification with generated content
      const { error: updateError } = await supabaseAdmin
        .from('technical_specifications')
        .update({
          prd_content: result.prd,
          architecture_content: result.architecture,
          roadmap_content: result.roadmap,
          techstack_content: result.techStack,
          status: 'completed' as SpecStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', spec.id);

      if (updateError) {
        throw new Error(`Failed to update specification: ${updateError.message}`);
      }

      // Mark payment as used for first specification
      if (versionNumber === 1) {
        await supabaseAdmin
          .from('payment_sessions')
          .update({ is_used: true })
          .eq('user_id', user.id)
          .eq('idea_id', ideaId)
          .eq('product_type', 'STAGE_C')
          .eq('status', 'SUCCESS')
          .eq('is_used', false);
      }

      // Fetch completed specification
      const { data: completedSpec } = await supabaseAdmin
        .from('technical_specifications')
        .select('*')
        .eq('id', spec.id)
        .single();

      return NextResponse.json({
        specification: mapDbSpecToFrontend(completedSpec),
        remainingRegenerations: remainingCount,
      });

    } catch (genError) {
      console.error('Generation failed:', genError);

      // Update specification status to failed
      await supabaseAdmin
        .from('technical_specifications')
        .update({
          status: 'failed' as SpecStatus,
          error_message: genError instanceof Error ? genError.message : 'Unknown error',
        })
        .eq('id', spec.id);

      return NextResponse.json(
        { detail: 'Failed to generate specification. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    return handleAuthError(error);
  }
}

// Get specifications for an idea
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get('ideaId');

    if (!ideaId) {
      return NextResponse.json(
        { detail: 'ideaId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all specifications for this idea
    const { data: specifications, error } = await supabaseAdmin
      .from('technical_specifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Failed to fetch specifications:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch specifications' },
        { status: 500 }
      );
    }

    // Get quota info
    const { data: quota } = await supabaseAdmin
      .from('regeneration_quotas')
      .select('*')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .single();

    const remainingRegenerations = quota
      ? quota.max_count - quota.used_count
      : 3; // Default max

    return NextResponse.json({
      specifications: (specifications || []).map(mapDbSpecToFrontend),
      remainingRegenerations,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

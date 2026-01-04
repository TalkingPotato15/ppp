export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { initializeQuota } from '@/lib/regeneration-quota';

// Get quota for an idea
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

    // Get quota
    const result = await initializeQuota(supabaseAdmin, user.id, ideaId);

    if (!result.success) {
      return NextResponse.json(
        { detail: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      usedCount: result.usedCount,
      maxCount: result.maxCount,
      remainingCount: result.remainingCount,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problem_id');

    if (!problemId) {
      return NextResponse.json(
        { detail: 'problem_id is required' },
        { status: 400 }
      );
    }

    // Check for unused payment for this user and problem
    const { data: unusedPayment } = await supabaseAdmin
      .from('payment_sessions')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .eq('status', 'SUCCESS')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      has_unused_payment: !!unusedPayment,
      payment_id: unusedPayment?.id || null,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

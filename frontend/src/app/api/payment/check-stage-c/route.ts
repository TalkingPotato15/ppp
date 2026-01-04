export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get('ideaId');

    if (!ideaId) {
      return NextResponse.json(
        { detail: 'ideaId is required' },
        { status: 400 }
      );
    }

    // Check for unused Stage C payment for this idea
    const { data: payment, error } = await supabaseAdmin
      .from('payment_sessions')
      .select('id, order_id, amount, created_at')
      .eq('user_id', user.id)
      .eq('idea_id', ideaId)
      .eq('product_type', 'STAGE_C')
      .eq('status', 'SUCCESS')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected if no payment exists
      console.error('Error checking Stage C payment:', error);
    }

    return NextResponse.json({
      has_unused_payment: !!payment,
      payment: payment ? {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        created_at: payment.created_at,
      } : null,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

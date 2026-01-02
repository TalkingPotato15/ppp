export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { order_id, code, message } = body;

    if (!order_id || !code || !message) {
      return NextResponse.json(
        { detail: 'order_id, code, and message are required' },
        { status: 400 }
      );
    }

    // Log the payment failure
    console.log(`Payment failure recorded - Order: ${order_id}, Code: ${code}, Message: ${message}`);

    return NextResponse.json({
      status: 'FAILED',
      order_id: order_id,
      error_code: code,
      error_message: message,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

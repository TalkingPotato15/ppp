export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

const TOSS_API_BASE_URL = process.env.TOSS_API_BASE_URL || 'https://api.tosspayments.com';
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { payment_key, order_id, amount } = body;

    if (!payment_key || !order_id || !amount) {
      return NextResponse.json(
        { detail: 'payment_key, order_id, and amount are required' },
        { status: 400 }
      );
    }

    if (!TOSS_SECRET_KEY) {
      console.error('TOSS_PAYMENTS_SECRET_KEY not configured');
      return NextResponse.json(
        { detail: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Confirm payment with Toss Payments API
    const authHeader = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

    const response = await fetch(`${TOSS_API_BASE_URL}/v1/payments/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: payment_key,
        orderId: order_id,
        amount: amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Toss payment confirmation failed:', data);
      return NextResponse.json(
        {
          status: 'FAILED',
          order_id: order_id,
          error_code: data.code || 'UNKNOWN_ERROR',
          error_message: data.message || 'Payment confirmation failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'DONE',
      order_id: data.orderId,
      payment_key: data.paymentKey,
      amount: data.totalAmount,
      method: data.method,
      approved_at: data.approvedAt,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

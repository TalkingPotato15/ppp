export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

const TOSS_API_BASE_URL = process.env.TOSS_API_BASE_URL || 'https://api.tosspayments.com';
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAuth();
    const { orderId } = await params;

    if (!TOSS_SECRET_KEY) {
      console.error('TOSS_PAYMENTS_SECRET_KEY not configured');
      return NextResponse.json(
        { detail: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Get payment status from Toss Payments API
    const authHeader = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

    const response = await fetch(`${TOSS_API_BASE_URL}/v1/payments/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { detail: 'Payment not found' },
          { status: 404 }
        );
      }
      const errorData = await response.json();
      console.error('Failed to get payment status:', errorData);
      return NextResponse.json(
        { detail: 'Failed to retrieve payment status' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      status: data.status,
      order_id: data.orderId,
      payment_key: data.paymentKey,
      amount: data.totalAmount,
      method: data.method,
      approved_at: data.approvedAt,
      requested_at: data.requestedAt,
    });

  } catch (error) {
    return handleAuthError(error);
  }
}

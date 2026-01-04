export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

const TOSS_API_BASE_URL = process.env.TOSS_API_BASE_URL || 'https://api.tosspayments.com';
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { payment_key, order_id, amount, problem_id } = body;

    if (!payment_key || !order_id || !amount) {
      return NextResponse.json(
        { detail: 'payment_key, order_id, and amount are required' },
        { status: 400 }
      );
    }

    if (!problem_id) {
      return NextResponse.json(
        { detail: 'problem_id is required' },
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

    // Check if payment already exists (idempotency)
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (existingPayment) {
      // Payment already processed
      if (existingPayment.status === 'SUCCESS') {
        // Already successful, return success
        return NextResponse.json({
          status: 'SUCCESS',
          order_id: existingPayment.order_id,
          payment_key: existingPayment.payment_key,
          amount: existingPayment.amount,
          method: existingPayment.toss_response?.method,
          approved_at: existingPayment.toss_response?.approvedAt,
        });
      }
      // If FAILED, we'll try to confirm again below
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

      // Check if it's "already processed" error - means payment succeeded before
      // ALREADY_PROCESSED_PAYMENT or FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING
      if (data.code === 'ALREADY_PROCESSED_PAYMENT' ||
          data.code === 'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING') {
        // Payment was already confirmed, treat as success
        // Upsert the payment record
        await supabaseAdmin
          .from('payment_sessions')
          .upsert({
            user_id: user.id,
            problem_id: problem_id,
            order_id: order_id,
            payment_key: payment_key,
            amount: amount,
            order_name: 'Idea Generation',
            status: 'SUCCESS',
            is_used: false,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            toss_response: data,
          }, { onConflict: 'order_id' });

        return NextResponse.json({
          status: 'SUCCESS',
          order_id: order_id,
          payment_key: payment_key,
          amount: amount,
        });
      }

      // Store/update failed payment in database
      await supabaseAdmin
        .from('payment_sessions')
        .upsert({
          user_id: user.id,
          problem_id: problem_id,
          order_id: order_id,
          payment_key: payment_key,
          amount: amount,
          order_name: 'Idea Generation',
          status: 'FAILED',
          is_used: false,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          error_code: data.code || 'UNKNOWN_ERROR',
          error_message: data.message || 'Payment confirmation failed',
          toss_response: data,
        }, { onConflict: 'order_id' });

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

    // Store successful payment in database (upsert to handle duplicates)
    const { error: upsertError } = await supabaseAdmin
      .from('payment_sessions')
      .upsert({
        user_id: user.id,
        problem_id: problem_id,
        order_id: data.orderId,
        payment_key: data.paymentKey,
        amount: data.totalAmount,
        order_name: data.orderName || 'Idea Generation',
        status: 'SUCCESS',
        is_used: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        toss_response: data,
      }, { onConflict: 'order_id' });

    if (upsertError) {
      console.error('Failed to save payment session:', upsertError);
    }

    return NextResponse.json({
      status: 'SUCCESS',
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

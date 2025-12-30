'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentApi } from '@/lib/api';
import { PaymentStatus } from '@/components/payment/PaymentStatus';
import { PaymentStatusResponse } from '@/types/payment';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const recordFailure = async () => {
      // Extract error parameters from Toss redirect
      const code = searchParams.get('code');
      const message = searchParams.get('message');
      const orderId = searchParams.get('orderId');

      if (!code || !message || !orderId) {
        setIsLoading(false);
        return;
      }

      try {
        // Record failure with backend
        await paymentApi.recordFailure({
          order_id: orderId,
          code,
          message,
        });

        // Get payment status
        const statusResponse = await paymentApi.getPaymentStatus(orderId);
        setPayment(statusResponse.data);
      } catch (err: any) {
        console.error('Failed to record payment failure:', err);
        // Even if recording fails, show the error to user
        setPayment({
          order_id: orderId || 'unknown',
          status: 'FAILED',
          amount: 0,
          order_name: 'Payment',
          created_at: new Date().toISOString(),
          error_message: message || 'Payment failed',
        });
      } finally {
        setIsLoading(false);
      }
    };

    recordFailure();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-lg text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {payment && <PaymentStatus payment={payment} showDetails={true} />}

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={() => router.push('/payment/checkout')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Try Again
          </button>

          {payment && (
            <button
              onClick={() => router.push(`/payment/status/${payment.order_id}`)}
              className="block mx-auto px-6 py-3 text-primary-600 hover:text-primary-700 transition-colors font-medium"
            >
              View Payment Details
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="block mx-auto px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Return to Home
          </button>

          <p className="text-sm text-gray-600">
            Your payment could not be processed. Please try again or contact
            support if the problem persists.
          </p>
        </div>
      </div>
    </div>
  );
}

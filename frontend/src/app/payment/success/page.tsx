'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PaymentStatus } from '@/components/payment/PaymentStatus';
import { PaymentStatusResponse } from '@/types/payment';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      // Extract query parameters from Toss redirect
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setError('Missing payment parameters');
        setIsLoading(false);
        return;
      }

      try {
        // Retrieve customer data from sessionStorage
        const customerDataStr = sessionStorage.getItem(`payment_${orderId}`);
        const customerData = customerDataStr ? JSON.parse(customerDataStr) : null;

        // For POC: Trust Toss SDK redirect (it only redirects to success if payment succeeded)
        // In production, you would verify the payment with Toss API here

        // Create payment status response with customer data
        const paymentData: PaymentStatusResponse = {
          order_id: orderId,
          status: 'SUCCESS',
          amount: parseInt(amount, 10),
          order_name: 'Stage B Idea Generation',
          customer_data: customerData,
          created_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
        };
        setPayment(paymentData);

        // Clean up sessionStorage
        if (customerDataStr) {
          sessionStorage.removeItem(`payment_${orderId}`);
        }

        // If payment successful and has problemId, redirect to stage-b
        if (customerData?.problemId) {
          // Small delay to show success state, then redirect
          setTimeout(() => {
            router.push(`/stage-b/${customerData.problemId}`);
          }, 2000);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to process payment';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, router]);

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
          <p className="text-lg text-gray-600">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <svg
              className="w-12 h-12 text-red-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Error Confirming Payment
            </h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {payment && <PaymentStatus payment={payment} showDetails={true} />}

        <div className="mt-8 text-center space-y-4">
          {payment?.customer_data?.problemId ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-lg font-semibold text-blue-900 mb-2">
                Payment Successful!
              </p>
              <p className="text-blue-700 mb-4">
                Redirecting you to Stage B to access your ideas...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
              >
                Continue to Dashboard
              </button>

              {payment && (
                <button
                  onClick={() => router.push(`/payment/status/${payment.order_id}`)}
                  className="block mx-auto px-6 py-3 text-primary-600 hover:text-primary-700 transition-colors font-medium"
                >
                  View Full Payment Details
                </button>
              )}

              <p className="text-sm text-gray-600">
                Thank you for your purchase! Your payment has been processed
                successfully.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

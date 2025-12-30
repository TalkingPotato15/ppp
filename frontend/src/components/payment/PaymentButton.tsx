'use client';

import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';

interface PaymentButtonProps {
  amount: number;
  orderName: string;
  customerData?: Record<string, any>;
  onSuccess?: (orderId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_yZqmkKeP8gBGmWXE7XJ4rbQRxB9l';
const SUCCESS_URL = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/payment/success`;
const FAIL_URL = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/payment/failure`;

export function PaymentButton({
  amount,
  orderName,
  customerData,
  onSuccess,
  onError,
  className = '',
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate unique order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store customer data in sessionStorage to retrieve after payment
      if (customerData) {
        sessionStorage.setItem(`payment_${orderId}`, JSON.stringify(customerData));
      }

      // Load Toss Payments SDK
      const tossPayments = await loadTossPayments(CLIENT_KEY);

      // Request payment
      await tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName,
        successUrl: SUCCESS_URL,
        failUrl: FAIL_URL,
      });

      onSuccess?.(orderId);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initiate payment';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(value);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
          isLoading
            ? 'bg-primary-300 text-white cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
        } ${className}`}
      >
        {isLoading ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
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
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span>Pay {formatCurrency(amount)}</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

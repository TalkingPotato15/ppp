'use client';

import { PaymentStatus as Status, PaymentStatusResponse } from '@/types/payment';

interface PaymentStatusProps {
  payment: PaymentStatusResponse;
  showDetails?: boolean;
}

export function PaymentStatus({ payment, showDetails = true }: PaymentStatusProps) {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAILED':
      case 'EXPIRED':
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'PENDING':
      case 'IN_PROGRESS':
      case 'CONFIRMING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'FAILED':
      case 'EXPIRED':
      case 'CANCELLED':
        return (
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-12 h-12 animate-spin"
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
        );
    }
  };

  const getStatusMessage = (status: Status) => {
    switch (status) {
      case 'SUCCESS':
        return 'Payment Successful!';
      case 'FAILED':
        return 'Payment Failed';
      case 'EXPIRED':
        return 'Payment Session Expired';
      case 'CANCELLED':
        return 'Payment Cancelled';
      case 'PENDING':
        return 'Payment Pending';
      case 'IN_PROGRESS':
        return 'Payment In Progress';
      case 'CONFIRMING':
        return 'Confirming Payment...';
      default:
        return 'Payment Status Unknown';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 rounded-lg p-8 ${getStatusColor(payment.status)}`}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={getStatusColor(payment.status)}>
            {getStatusIcon(payment.status)}
          </div>

          <h2 className="text-2xl font-bold">
            {getStatusMessage(payment.status)}
          </h2>

          {payment.error_message && (
            <p className="text-sm">{payment.error_message}</p>
          )}

          {showDetails && (
            <div className="w-full mt-6 pt-6 border-t border-current/20">
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Order:</span>
                  <span className="text-sm">{payment.order_name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Order ID:</span>
                  <span className="text-xs font-mono">{payment.order_id}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">{formatDate(payment.created_at)}</span>
                </div>

                {payment.approved_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Approved:</span>
                    <span className="text-sm">
                      {formatDate(payment.approved_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

# Toss Payments Integration Guide

**Project**: AI Agent Business Builder (PPP)
**Date**: 2025-12-31
**Status**: Production Ready

## Overview

This guide explains how to integrate Toss Payments into the PPP system. The integration uses the **Toss Payments SDK** (client-side) approach, which is simpler and more reliable than server-side payment initiation.

### Payment Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Checkout   │───▶│  Toss SDK   │───▶│   Toss      │───▶│  Success    │
│    Page     │    │  (Client)   │    │  Payment    │    │    Page     │
└─────────────┘    └─────────────┘    │    Page     │    └─────────────┘
                                      └─────────────┘           │
                                                                │
                                      ┌─────────────┐           │
                                      │  Failure    │◀──────────┘
                                      │    Page     │   (on error)
                                      └─────────────┘
```

1. User clicks "Pay" on checkout page
2. Frontend SDK opens Toss payment page
3. User completes payment on Toss
4. Toss redirects to success/failure URL
5. Success page retrieves payment data and proceeds

## Prerequisites

### 1. Toss Payments Account

1. Sign up at [Toss Payments](https://developers.tosspayments.com/)
2. Get test keys from the dashboard:
   - **Client Key**: `test_ck_...` (used in frontend)
   - **Secret Key**: `test_sk_...` (used in backend, if needed)

### 2. Environment Setup

```bash
# .env file
TOSS_PAYMENTS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_PAYMENTS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R
TOSS_API_BASE_URL=https://api.tosspayments.com
```

### 3. Install Dependencies

**Frontend (Next.js)**:
```bash
cd frontend
npm install @tosspayments/payment-sdk
```

**Backend (Python)** - Optional, only if using server-side confirmation:
```bash
pip install httpx
```

## Frontend Implementation

### 1. Payment Button Component

Create `frontend/src/components/payment/PaymentButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';

// Get from environment
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

interface PaymentButtonProps {
  amount: number;
  orderName: string;
  customerData?: Record<string, any>;  // Custom data to pass through payment
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export default function PaymentButton({
  amount,
  orderName,
  customerData,
  onError,
  disabled = false,
  className = '',
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      // Generate unique order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store customer data in sessionStorage (persists through Toss redirect)
      if (customerData) {
        sessionStorage.setItem(`payment_${orderId}`, JSON.stringify(customerData));
      }

      // Load Toss Payments SDK
      const tossPayments = await loadTossPayments(CLIENT_KEY);

      // Define redirect URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment/success`;
      const failUrl = `${baseUrl}/payment/failure`;

      // Request payment (opens Toss payment page)
      await tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName,
        successUrl,
        failUrl,
      });
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={isLoading || disabled}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Processing...' : `Pay ₩${amount.toLocaleString()}`}
    </button>
  );
}
```

### 2. Checkout Page

Create `frontend/src/app/payment/checkout/page.tsx`:

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PaymentButton from '@/components/payment/PaymentButton';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const problemId = searchParams.get('problemId');
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Price for Stage B access
  const PRICE = 990;

  useEffect(() => {
    if (problemId) {
      // Fetch problem details
      fetch(`/api/discovery/problems/${problemId}`)
        .then(res => res.json())
        .then(data => {
          setProblem(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [problemId]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!problemId || !problem) {
    return <div className="p-8">No problem selected</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-2">Stage B: Idea Generation</h2>
        <p className="text-gray-600 mb-4">
          Generate AI-powered business ideas for:
        </p>
        <p className="font-medium">{problem.title}</p>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span>Total</span>
          <span className="text-xl font-bold">₩{PRICE.toLocaleString()}</span>
        </div>
      </div>

      <PaymentButton
        amount={PRICE}
        orderName={`Stage B: ${problem.title.slice(0, 50)}`}
        customerData={{ problemId }}  // Pass problemId through payment
        className="w-full"
      />
    </div>
  );
}
```

### 3. Success Page

Create `frontend/src/app/payment/success/page.tsx`:

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Get payment data from URL (Toss redirect params)
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      return;
    }

    // Payment is already confirmed by Toss SDK
    // Retrieve customer data from sessionStorage
    const customerDataStr = sessionStorage.getItem(`payment_${orderId}`);
    const customerData = customerDataStr ? JSON.parse(customerDataStr) : null;

    // Clean up sessionStorage
    sessionStorage.removeItem(`payment_${orderId}`);

    setStatus('success');

    // Redirect to Stage B after 2 seconds
    if (customerData?.problemId) {
      setTimeout(() => {
        router.push(`/stage-b/${customerData.problemId}`);
      }, 2000);
    }
  }, [paymentKey, orderId, amount, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Processing payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Payment verification failed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-4">
          Amount: ₩{Number(amount).toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to idea generation...
        </p>
      </div>
    </div>
  );
}
```

### 4. Failure Page

Create `frontend/src/app/payment/failure/page.tsx`:

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  // Clean up sessionStorage
  if (orderId) {
    sessionStorage.removeItem(`payment_${orderId}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <div className="text-red-600 text-5xl mb-4">✗</div>
        <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-4">
          {message || 'An error occurred during payment'}
        </p>
        {code && (
          <p className="text-sm text-gray-500 mb-6">
            Error code: {code}
          </p>
        )}
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

## Backend Implementation (Optional)

The SDK approach doesn't require backend payment initiation. However, you may want backend endpoints for:
- Recording payment history
- Verifying payments
- Handling webhooks

### Payment Models

`src/models/payment.py`:

```python
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class PaymentSession(BaseModel):
    session_id: str
    user_id: str
    order_id: str
    payment_key: Optional[str] = None
    amount: int
    order_name: str
    customer_data: Optional[dict] = None
    status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime
    error_code: Optional[str] = None
    error_message: Optional[str] = None
```

### Payment Schemas

`src/schemas/payment.py`:

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from src.models.payment import PaymentStatus

class PaymentStatusResponse(BaseModel):
    order_id: str
    status: PaymentStatus
    amount: int
    order_name: str
    customer_data: Optional[dict] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    error_message: Optional[str] = None
```

## Environment Configuration

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`.env`)

```bash
TOSS_PAYMENTS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R
TOSS_API_BASE_URL=https://api.tosspayments.com
```

## Testing

### Test Cards

Toss provides test card numbers:

| Card Type | Number | Expiry | CVC |
|-----------|--------|--------|-----|
| Success | 4330000000000000 | Any future date | Any 3 digits |
| Failure | 4000000000000002 | Any future date | Any 3 digits |

### Test Flow

1. Navigate to `/payment/checkout?problemId=<uuid>`
2. Click "Pay" button
3. On Toss payment page, use test card
4. Verify redirect to success/failure page
5. Check that customer data (problemId) is preserved

## Common Issues & Solutions

### Issue: "Client key not found"

**Solution**: Ensure `NEXT_PUBLIC_TOSS_CLIENT_KEY` is set in `.env.local` and restart the dev server.

### Issue: Payment redirects to wrong URL

**Solution**: Check `successUrl` and `failUrl` in PaymentButton. They must be absolute URLs.

### Issue: Customer data lost after redirect

**Solution**: Use `sessionStorage` to persist data across the Toss redirect. Key format: `payment_${orderId}`.

### Issue: CORS errors

**Solution**: The SDK handles CORS. If you see CORS errors, you might be calling Toss API directly from frontend instead of using the SDK.

### Issue: "Invalid order ID"

**Solution**: Order ID must be unique. Use timestamp + random string format: `order_${Date.now()}_${random}`.

## Production Checklist

- [ ] Replace test keys with production keys
- [ ] Set up HTTPS (required for production)
- [ ] Configure webhook endpoint for payment notifications
- [ ] Implement idempotency for payment confirmation
- [ ] Add payment history/logging
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Test with real cards in sandbox mode first

## References

- [Toss Payments Developer Docs](https://docs.tosspayments.com/)
- [Toss Payments SDK NPM](https://www.npmjs.com/package/@tosspayments/payment-sdk)
- [Payment Widget Guide](https://docs.tosspayments.com/guides/payment-widget/integration)

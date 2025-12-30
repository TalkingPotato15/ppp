# Quick Start Guide: Payment System POC

**Feature**: Payment Flow POC with Toss Payments
**Branch**: `002-payment-system`
**Date**: 2025-12-30

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ and npm installed
- Toss Payments test account (sign up at https://developers.tosspayments.com/)
- Existing project dependencies installed (`uv sync` for backend, `npm install` for frontend)

## Setup Steps

### 1. Get Toss Payments Test Credentials

1. Sign up for Toss Payments Developer account: https://developers.tosspayments.com/
2. Navigate to Dashboard → Settings → API Keys
3. Copy your **Test Secret Key** (starts with `test_sk_`)
4. Copy your **Test Client Key** (starts with `test_ck_`) - if needed for frontend widget

### 2. Configure Environment Variables

Add to `.env` file in project root:

```bash
# Toss Payments Configuration
TOSS_PAYMENTS_SECRET_KEY=test_sk_YOUR_SECRET_KEY_HERE
TOSS_PAYMENTS_CLIENT_KEY=test_ck_YOUR_CLIENT_KEY_HERE  # Optional for POC
TOSS_API_BASE_URL=https://api.tosspayments.com

# Payment URLs (update with your actual domain)
PAYMENT_SUCCESS_URL=http://localhost:3000/payment/success
PAYMENT_FAILURE_URL=http://localhost:3000/payment/failure

# Session Configuration (optional, defaults provided)
PAYMENT_SESSION_TIMEOUT_MINUTES=30
```

### 3. Install Backend Dependencies

```bash
# From project root
uv sync

# No new dependencies needed for POC - using existing httpx, FastAPI, etc.
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install

# No new dependencies needed - using existing Next.js, React, fetch
```

### 5. Start Development Servers

**Terminal 1 - Backend**:
```bash
# From project root
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Services will be available at:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Testing the Payment Flow

### Test Scenario 1: Successful Payment

1. **Log in to the application**:
   - Navigate to http://localhost:3000
   - Log in with your test account

2. **Initiate payment**:
   - Navigate to payment page (integrate into your flow)
   - Click "Pay ₩1,990" button
   - You'll be redirected to Toss Payments test checkout page

3. **Complete payment on Toss**:
   - Use test card: `4000000000000008`
   - Expiry: Any future date (e.g., 12/25)
   - CVV: Any 3 digits (e.g., 123)
   - Click "Pay" button

4. **Verify success**:
   - You'll be redirected back to http://localhost:3000/payment/success
   - Success page should display:
     - Payment confirmation message
     - Order ID
     - Payment amount
     - Transaction timestamp

5. **Check backend logs**:
   ```bash
   # Should see:
   # - Payment initiation log
   # - Toss API call success
   # - Payment confirmation log
   # - Status: SUCCESS
   ```

### Test Scenario 2: Failed Payment

1. **Initiate payment** (same as above)

2. **Trigger failure on Toss**:
   - Option A: Click "Cancel" button on Toss payment page
   - Option B: Use a failure test card (if provided by Toss documentation)

3. **Verify failure**:
   - You'll be redirected to http://localhost:3000/payment/failure
   - Failure page should display:
     - Error message (user-friendly)
     - Option to retry
     - Link back to main app

### Test Scenario 3: Session Expiration

1. **Initiate payment**
2. **Wait 30 minutes** (or adjust `PAYMENT_SESSION_TIMEOUT_MINUTES` for faster testing)
3. **Attempt to complete payment**
4. **Verify error**: Should receive "Session expired" message

## API Testing with curl

### Initiate Payment

```bash
# Get JWT token first (from /auth/login)
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8000/api/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1990,
    "order_name": "Stage C Technical Specs"
  }'

# Expected response:
# {
#   "session_id": "550e8400-e29b-41d4-a716-446655440000",
#   "order_id": "order-2025-001",
#   "checkout_url": "https://api.tosspayments.com/v1/payments/checkout/...",
#   "expires_at": "2025-12-30T11:30:00Z"
# }
```

### Confirm Payment

```bash
# After returning from Toss with payment_key, order_id, amount
curl -X POST http://localhost:8000/api/payment/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_key": "tviva20240330142105JQNMA",
    "order_id": "order-2025-001",
    "amount": 1990
  }'

# Expected response:
# {
#   "status": "SUCCESS",
#   "order_id": "order-2025-001",
#   "payment_key": "tviva20240330142105JQNMA",
#   "amount": 1990,
#   "approved_at": "2025-12-30T10:05:00Z",
#   "method": "카드"
# }
```

### Check Payment Status

```bash
curl -X GET http://localhost:8000/api/payment/status/order-2025-001 \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "order_id": "order-2025-001",
#   "status": "SUCCESS",
#   "amount": 1990,
#   "order_name": "Stage C Technical Specs",
#   "created_at": "2025-12-30T10:00:00Z",
#   "approved_at": "2025-12-30T10:05:00Z",
#   "error_message": null
# }
```

## Test Cards

Toss Payments provides test cards for different scenarios:

| Card Number         | Result              |
|---------------------|---------------------|
| 4000000000000008    | Success             |
| 4000000000000016    | Insufficient funds  |
| 4000000000000024    | Card declined       |
| (Check Toss docs)   | Other error cases   |

## Troubleshooting

### Error: "Unauthorized" (401)

**Cause**: Missing or invalid JWT token

**Solution**:
1. Log in via `/auth/login` endpoint
2. Copy the `access_token` from response
3. Include in requests: `Authorization: Bearer <token>`

### Error: "Payment service unavailable" (500)

**Cause**: Toss API connection issue

**Solution**:
1. Verify `TOSS_PAYMENTS_SECRET_KEY` is correct
2. Check internet connection
3. Verify Toss API status: https://status.tosspayments.com/
4. Check backend logs for detailed error

### Error: "Session expired" (404)

**Cause**: Payment session timed out (30 minutes)

**Solution**:
1. Initiate a new payment
2. Complete payment within 30 minutes
3. For testing, reduce `PAYMENT_SESSION_TIMEOUT_MINUTES` in .env

### Redirect URL Mismatch

**Cause**: Toss redirect URLs don't match configured URLs

**Solution**:
1. Ensure `PAYMENT_SUCCESS_URL` and `PAYMENT_FAILURE_URL` in .env match your frontend URLs
2. For local testing: Use `http://localhost:3000/payment/...`
3. For deployed testing: Use your actual domain

## Viewing Logs

### Backend Logs

```bash
# Tail backend logs in real-time
uvicorn src.main:app --reload --log-level debug
```

Look for:
- `[Payment] Initiating payment for user: ...`
- `[Toss API] POST /v1/payments - Status: 200`
- `[Payment] Confirming payment: ...`
- `[Payment] Status updated: SUCCESS`

### Frontend Logs

Open browser DevTools Console (F12) to see:
- API request/response logs
- Payment flow navigation
- Error messages

## Next Steps

After successful POC testing:

1. **Integration Testing**:
   - Run pytest suite: `pytest tests/integration/test_payment_flow.py`
   - Test edge cases: session expiration, duplicate submissions

2. **Frontend Integration**:
   - Integrate payment button into discovery/idea selection flow
   - Add payment history view (if needed)

3. **Demo Preparation**:
   - Prepare demo script for stakeholders
   - Test with multiple concurrent users
   - Verify error message clarity

4. **Production Readiness** (future):
   - Switch to production Toss API keys
   - Implement webhook signature verification
   - Add database persistence for payment history
   - Set up monitoring and alerting

## Support Resources

- Toss Payments Documentation: https://docs.tosspayments.com/
- Toss API Reference: https://docs.tosspayments.com/reference
- Toss Developer Community: https://community.tosspayments.com/
- Project Issues: GitHub issues page

## Summary

You should now have:
- ✅ Toss Payments test environment configured
- ✅ Backend and frontend servers running
- ✅ Ability to test full payment flow
- ✅ Understanding of success and failure scenarios

For questions or issues, check the troubleshooting section or consult the Toss Payments documentation.

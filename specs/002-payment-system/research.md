# Research: Toss Payments Integration for POC

**Feature**: Payment Flow POC with Toss Payments
**Branch**: `002-payment-system`
**Date**: 2025-12-30

## Overview

This document consolidates research findings for implementing a proof-of-concept payment system using Toss Payments test environment. The research focuses on integration patterns, API workflows, and POC-appropriate simplifications.

## Research Tasks Completed

1. ✅ Toss Payments API integration patterns
2. ✅ Session-based state management for POC
3. ✅ Payment flow best practices (redirect-based)
4. ✅ Test mode configuration and credentials
5. ✅ Error handling strategies for POC

## Decision 1: Toss Payments Integration Method

**Decision**: Use Toss Payments REST API with redirect-based payment flow

**Rationale**:
- Toss Payments provides a well-documented REST API for payment initiation and verification
- Redirect flow is the recommended pattern for web applications - simpler and more secure than widget embedding
- No need for complex client-side SDK integration for POC
- Toss handles sensitive payment data, reducing PCI compliance burden

**Alternatives Considered**:
- **Widget/Modal Integration**: Requires more complex frontend JavaScript SDK integration. Overkill for POC.
- **Direct API (no redirect)**: Would require handling sensitive card data on our servers. Not suitable for POC or production.

**Implementation Approach**:
1. Backend generates payment request and calls Toss Payments API to initiate transaction
2. Toss returns payment checkout URL
3. Frontend redirects user to Toss checkout page
4. User completes payment on Toss's interface
5. Toss redirects back to our success/failure URLs with result parameters
6. Backend verifies payment result with Toss API

**API Endpoints Required**:
- `POST /v1/payments`: Create payment (initiate payment flow)
- `POST /v1/payments/{paymentKey}/confirm`: Confirm payment after user returns from Toss
- `GET /v1/payments/{paymentKey}`: Retrieve payment status (for verification)

## Decision 2: Session-Based State Management

**Decision**: Use in-memory Python dictionary for POC, with Redis as production-ready alternative

**Rationale**:
- POC only needs to track payment state during user session (30 min timeout)
- No persistent history required per spec assumptions
- In-memory dict is simplest for single-server POC demo
- Redis provides easy upgrade path if multi-server or longer retention needed

**Alternatives Considered**:
- **PostgreSQL/SQLite**: Overkill for POC. Adds database migrations and persistence complexity not required by spec.
- **Browser localStorage**: Cannot securely store payment keys server-side. Client-side only suitable for UI state.

**Implementation Approach**:
```python
# Simplified in-memory store
payment_sessions = {}  # {session_id: PaymentData}

# Production-ready alternative
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
```

**Data Stored**:
- `session_id` → mapping to payment transaction data
- `payment_key` (from Toss)
- `order_id` (our internal ID)
- `amount`
- `status` (pending/success/failed/cancelled)
- `created_at`, `updated_at`

## Decision 3: Authentication and Authorization

**Decision**: Use existing JWT-based authentication, require authenticated users for payment initiation

**Rationale**:
- Existing auth infrastructure (python-jose, FastAPI dependencies) already in place
- Payment flow should only be accessible to authenticated users (aligns with Stage C monetization)
- Prevents anonymous payment spam attempts

**Implementation Approach**:
- Payment endpoints require `Authorization: Bearer <token>` header
- Use existing `get_current_user` dependency in FastAPI routes
- Associate payment session with `user_id` from JWT token

## Decision 4: Test Mode Configuration

**Decision**: Use Toss Payments sandbox environment with test API keys

**Rationale**:
- Sandbox provides realistic payment flow without real money transactions
- Test credit card numbers provided by Toss for various success/failure scenarios
- Allows stakeholder demos without financial risk

**Configuration Required**:
```python
# .env additions
TOSS_PAYMENTS_SECRET_KEY=test_sk_...  # Test secret key from Toss dashboard
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...  # Test client key (if needed for frontend)
TOSS_API_BASE_URL=https://api.tosspayments.com  # Same URL for test and production
```

**Test Cards**:
- Success: 4000000000000008 (any valid expiry/CVV)
- Failure scenarios: Various test card numbers for insufficient funds, card errors, etc.

## Decision 5: Error Handling Strategy

**Decision**: Basic error handling with user-friendly messages, log all errors for debugging

**Rationale**:
- POC requires functional error communication, not production-grade recovery mechanisms
- Spec explicitly scopes out comprehensive error recovery
- Focus on clear user feedback for common failure cases

**Error Categories**:
1. **User-facing errors**: Display generic friendly message + error code
2. **System errors**: Log full details, show "Please try again" to user
3. **Toss API errors**: Map Toss error codes to user messages

**Implementation Approach**:
```python
try:
    response = await toss_client.create_payment(...)
except httpx.HTTPError as e:
    logger.error(f"Toss API error: {e}")
    raise HTTPException(status_code=500, detail="Payment service unavailable")
except TossPaymentError as e:
    # Map known Toss errors to user messages
    return {"status": "failed", "message": e.user_message}
```

## Decision 6: Frontend Framework Integration

**Decision**: Extend existing Next.js frontend with new payment pages in `/app/payment/`

**Rationale**:
- Project already uses Next.js 14 with App Router
- Payment flow integrates naturally with existing discovery/auth flows
- Server-side rendering beneficial for payment redirect handling

**Pages Required**:
- `/payment/checkout`: Display payment amount, initiate payment button
- `/payment/success`: Toss redirect target for successful payments
- `/payment/failure`: Toss redirect target for failed payments

**API Client**:
- Extend existing `services/api.ts` with payment methods
- Use `fetch` or `axios` for backend API calls
- Handle redirect logic in payment button component

## Decision 7: Callback and Webhook Handling

**Decision**: Use redirect-only flow (success/failure URLs), defer webhooks to future iteration

**Rationale**:
- Redirect flow is simpler and sufficient for POC
- Webhooks require public URL and signature verification (complexity not needed for POC)
- Success/failure redirect URLs provide synchronous status to user

**Implementation Notes**:
- Success URL: `https://yourdomain.com/payment/success?paymentKey=xxx&orderId=yyy&amount=zzz`
- Failure URL: `https://yourdomain.com/payment/failure?code=xxx&message=yyy&orderId=zzz`
- Backend confirms payment on success redirect using paymentKey

## References and Resources

**Toss Payments Documentation**:
- Official API Docs: https://docs.tosspayments.com/reference
- Integration Guide: https://docs.tosspayments.com/guides/payment-widget/integration
- Test Environment: https://docs.tosspayments.com/guides/dev-setting

**Technical References**:
- FastAPI async best practices: https://fastapi.tiangolo.com/async/
- httpx async client: https://www.python-httpx.org/async/
- Next.js App Router: https://nextjs.org/docs/app

**Code Examples**:
- Toss Payments Python examples: (official GitHub repo if available, or adapt from Node.js examples)
- Session management patterns: FastAPI-compatible session stores

## Open Questions / Deferred Decisions

**For POC**:
- ✅ All critical decisions resolved for POC implementation

**For Future Production**:
- Webhook signature verification (security hardening)
- Database persistence for payment history
- Retry logic for failed API calls
- Payment analytics and reporting
- Refund/cancellation workflow
- Multi-currency support
- Production API key rotation strategy

## Summary

All technical unknowns resolved for POC implementation. Key decisions:
1. Toss Payments REST API with redirect flow
2. In-memory session storage (Redis-ready architecture)
3. Existing JWT authentication
4. Sandbox test mode with test cards
5. Basic error handling with user-friendly messages
6. Next.js pages integration
7. Redirect-only (no webhooks)

No blockers for proceeding to Phase 1 (data model and contracts).

# Payment Flow POC with Toss Payments Card

feature: Payment Flow POC with Toss Payments
branch: 002-payment-system
created: 2025-12-30
spec: specs/002-payment-system/spec.md

## golden_path

goal: new developer reaches working state within 15 min

prerequisites:
- Python 3.11+
- Node.js 18+ and npm
- Toss Payments test account (https://developers.tosspayments.com/)
- uv package manager (backend)

steps:
1. Get Toss credentials: Dashboard → Settings → API Keys → Copy test_sk_* and test_ck_*
2. Configure environment:
   ```bash
   cat >> .env << 'EOF'
   TOSS_PAYMENTS_SECRET_KEY=test_sk_YOUR_SECRET_KEY
   TOSS_PAYMENTS_CLIENT_KEY=test_ck_YOUR_CLIENT_KEY
   TOSS_API_BASE_URL=https://api.tosspayments.com
   PAYMENT_SUCCESS_URL=http://localhost:3000/payment/success
   PAYMENT_FAILURE_URL=http://localhost:3000/payment/failure
   PAYMENT_SESSION_TIMEOUT_MINUTES=30
   EOF
   ```
3. Install dependencies:
   ```bash
   uv sync && cd frontend && npm install
   ```
4. Start backend:
   ```bash
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Start frontend (new terminal):
   ```bash
   cd frontend && npm run dev
   ```

success_check:
- `curl http://localhost:8000/docs` returns 200
- `curl http://localhost:3000` returns 200
- Test payment flow: Use card 4000000000000008 (any future expiry, any CVV)

## recipes

### add-payment-endpoint
when: Adding new payment-related API endpoint
steps:
1. Add schema in `src/schemas/payment.py` (Request/Response models)
2. Add method in `src/services/payment_service.py`
3. Add endpoint in `src/api/routers/payment.py`
4. Add TypeScript types in `frontend/src/types/payment.ts`
5. Add API client function in `frontend/src/lib/api.ts`
verify: `curl -X POST http://localhost:8000/api/payment/{endpoint} -H "Authorization: Bearer $TOKEN"`

### add-payment-status
when: Adding new payment state
steps:
1. Add value to `PaymentStatus` enum in `src/models/payment.py`
2. Update state transition documentation
3. Add TypeScript type in `frontend/src/types/payment.ts`
4. Update UI components to handle new status
verify: `grep -r "NEW_STATUS" src/ frontend/src/`

### integrate-toss-api
when: Calling new Toss Payments API endpoint
steps:
1. Read Toss API docs: https://docs.tosspayments.com/reference
2. Add method in `PaymentService` class with httpx async call
3. Handle response in try/except with proper logging
4. Update session storage on success/failure
verify: Check backend logs for `[Toss API]` entries

### add-frontend-payment-page
when: Creating new payment-related page
steps:
1. Create page in `frontend/src/app/payment/{page}/page.tsx`
2. Import types from `frontend/src/types/payment.ts`
3. Use API functions from `frontend/src/lib/api.ts`
4. Add proper loading/error states
verify: Navigate to `http://localhost:3000/payment/{page}`

## decisions

### toss-redirect-flow
context: Needed to choose payment integration pattern for Toss Payments
decision: Redirect-based flow (not widget/modal embedding)
alternatives:
- Widget/Modal SDK: Requires complex frontend JavaScript SDK integration, overkill for POC
- Direct API (no redirect): Would require handling sensitive card data on our servers, PCI compliance nightmare
consequences: Simpler implementation, user briefly leaves site during payment, Toss handles sensitive data
revisit_when: Need for seamless in-page checkout experience or conversion rate drops below 60%

### session-storage
context: Needed to persist payment state during redirect flow
decision: In-memory Python dictionary with Redis-ready interface
alternatives:
- PostgreSQL: Overkill for POC, adds migration complexity
- Browser localStorage: Cannot store payment keys server-side securely
consequences: Simple for single-server POC, data lost on restart, easy upgrade to Redis
revisit_when: Multi-server deployment required or session persistence needed across restarts

### auth-integration
context: Needed to associate payments with users
decision: Use existing JWT-based authentication, require auth for all payment endpoints
alternatives:
- Anonymous payments: Complicates tracking, increases spam risk
- Separate payment auth: Adds complexity, unnecessary duplication
consequences: Payment tied to user, prevents spam, integrates with existing user flow
revisit_when: Need for guest checkout or third-party payment initiation

### callback-handling
context: Toss can notify via webhooks or redirects
decision: Redirect-only flow, defer webhooks to production
alternatives:
- Webhooks: Require public URL, signature verification, more reliable for async
- Both: Most robust but complex for POC
consequences: Simpler setup, works for demo, might miss edge cases (browser close mid-payment)
revisit_when: Production deployment or missed payment confirmations exceed 1%

### amount-validation
context: Need to validate payment amounts
decision: Server-side validation: 100 <= amount <= 10,000,000 KRW
alternatives:
- Client-only: Easily bypassed, security risk
- Toss-only: Late error, poor UX
consequences: Early error detection, clear error messages, matches Toss limits
revisit_when: Toss changes limits or business needs sub-100 KRW amounts

## runbook

### toss-api-unauthorized
symptom: "Unauthorized" (401) from Toss API or payment initiation fails
confirm: `grep "TOSS_PAYMENTS_SECRET_KEY" .env | head -1`
fix:
1. Verify key starts with `test_sk_` (test) or `live_sk_` (prod)
2. Check for trailing whitespace: `cat -A .env | grep TOSS`
3. Regenerate key from Toss Dashboard if needed
4. Restart backend: `uvicorn src.main:app --reload`
verify: `curl -X POST http://localhost:8000/api/payment/initiate -H "Authorization: Bearer $TOKEN" -d '{"amount":1990,"order_name":"Test"}'`
prevent: Add key format validation on startup in `src/config/settings.py`

### session-expired
symptom: "Session expired" (404) after returning from Toss payment page
confirm: Check session age vs `PAYMENT_SESSION_TIMEOUT_MINUTES` (default 30)
fix:
1. Initiate new payment
2. Complete within timeout window
3. For testing: Set `PAYMENT_SESSION_TIMEOUT_MINUTES=60` in .env
verify: Complete payment within timeout, check status shows SUCCESS
prevent: Show countdown timer on checkout page, warn at 5 min remaining

### redirect-url-mismatch
symptom: User redirected to wrong URL or 404 after Toss payment
confirm: `grep PAYMENT_SUCCESS_URL .env && grep PAYMENT_FAILURE_URL .env`
fix:
1. Set URLs to match frontend: `PAYMENT_SUCCESS_URL=http://localhost:3000/payment/success`
2. For production: Use actual domain
3. Restart backend
verify: Complete test payment, observe correct redirect
prevent: Validate URL format on startup, warn if localhost in production

### payment-confirmation-failed
symptom: User sees success page but payment not confirmed in database
confirm: `grep "Confirming payment" backend.log | tail -5`
fix:
1. Check Toss API response in logs
2. Verify amount matches original request
3. Check for duplicate confirmation attempts
4. Manually verify in Toss Dashboard
verify: GET /api/payment/status/{orderId} returns SUCCESS
prevent: Add idempotency key, implement retry with backoff

### frontend-api-connection
symptom: Frontend shows "Network Error" or CORS errors
confirm: Browser DevTools → Network tab → Check failed requests
fix:
1. Verify backend running: `curl http://localhost:8000/docs`
2. Check CORS settings in `src/api/app.py`
3. Verify frontend API base URL in `.env.local`
4. Restart both servers
verify: Payment button triggers successful API call
prevent: Add health check endpoint, verify connectivity on page load

### duplicate-payment-prevention
symptom: Same order getting charged multiple times
confirm: `grep "order_id" backend.log | sort | uniq -d`
fix:
1. Check for existing pending session before creating new
2. Disable payment button after click
3. Use idempotent order IDs (UUID v4)
verify: Rapid-click payment button, only one charge created
prevent: Add frontend debounce, backend duplicate check in T019

## templates

### payment-schema
purpose: Add new payment request/response schema
location: src/schemas/payment.py
variables:
- schema_name: PascalCase name (e.g., RefundPaymentRequest)
- fields: Pydantic Field definitions
usage: `class RefundPaymentRequest(BaseModel): amount: int = Field(..., description="Refund amount")`

### payment-service-method
purpose: Add new method to PaymentService
location: src/services/payment_service.py
variables:
- method_name: snake_case async method name
- toss_endpoint: Toss API endpoint path
- response_type: Return schema type
usage:
```python
async def refund_payment(self, payment_key: str, amount: int) -> RefundResponse:
    """Refund a payment."""
    try:
        response = await self.client.post(f"/v1/payments/{payment_key}/cancel", json={"cancelReason": "...", "cancelAmount": amount})
        response.raise_for_status()
        return RefundResponse(**response.json())
    except httpx.HTTPError as e:
        logger.error(f"Toss refund error: {e}")
        raise
```

### payment-router-endpoint
purpose: Add new payment API endpoint
location: src/api/routers/payment.py
variables:
- http_method: GET/POST/PUT/DELETE
- path: Endpoint path
- request_schema: Input schema
- response_schema: Output schema
usage:
```python
@router.post("/refund", response_model=RefundResponse)
async def refund_payment(request: RefundRequest, current_user: User = Depends(get_current_user)):
    service = PaymentService()
    return await service.refund_payment(request.payment_key, request.amount)
```

### frontend-payment-page
purpose: Add new payment flow page
location: frontend/src/app/payment/{name}/page.tsx
variables:
- page_name: URL path segment
- api_function: API client function to call
usage:
```tsx
'use client';
import { useState, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/PaymentStatus';
export default function RefundPage() {
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  // ... implementation
}
```

### typescript-payment-type
purpose: Add new payment TypeScript interface
location: frontend/src/types/payment.ts
variables:
- interface_name: PascalCase interface name
- fields: TypeScript field definitions
usage: `export interface RefundResponse { refund_id: string; amount: number; status: PaymentStatus; }`

## tuning

metrics:
- payment_initiation_latency: `time curl -X POST .../payment/initiate` (target: <5s)
- confirmation_latency: Toss redirect to success page load (target: <3s)
- session_cleanup_interval: Expired session removal frequency (default: 5 min)
- active_sessions: `len(payment_sessions)` at any time

levers:
- PAYMENT_SESSION_TIMEOUT_MINUTES: 5-120 (default: 30)
- httpx timeout: 10-60s (default: 30s in PaymentService)
- cleanup_interval: 1-30 min (default: 5 in app.py)

guardrails:
- payment_initiation_latency > 10s → Check Toss API status, add timeout handling
- active_sessions > 1000 → Consider Redis, check for session leaks
- error_rate > 5% → Review error logs, check Toss service status

## invariants

- Amount must be 100 <= amount <= 10,000,000 KRW
- Order ID must be unique UUID v4 format
- Session expires in exactly PAYMENT_SESSION_TIMEOUT_MINUTES
- User can only view their own payment status (user_id match)
- Payment confirmation requires exact amount match with initiation
- PaymentStatus transitions: PENDING → IN_PROGRESS → CONFIRMING → SUCCESS/FAILED
- is_used can only transition from FALSE to TRUE (never back)
- payment_key is null until Toss returns it, then immutable
- All Toss API calls use Basic auth with base64-encoded secret_key

## task_decomposition

unit: One endpoint or component per task (file boundary)
parallel_boundaries:
- Backend service methods (T009-T012): Different methods in same class
- Frontend pages (T024-T026): Different route directories
- Schema + Storage (T006-T008): Different files
pr_sequence:
1. Phase 1 (Setup): T001-T003 → Environment ready
2. Phase 2 (Foundation): T004-T008 → Models and storage ready
3. Phase 3 (US1 Backend): T009-T020 → API endpoints working
4. Phase 3 (US1 Frontend): T021-T028 → UI complete
5. Phase 4 (US2): T029-T032 → Status viewing complete
6. Phase 5 (Polish): T033-T043 → Production-ready
definition_of_done:
- Code passes ruff check
- Endpoint returns expected response
- Frontend page renders without errors
- Manual test with Toss test card succeeds
- Logs show expected flow

## evolution

rules:
- 1 incident → add 1 runbook entry + 1 regression test
- 2 repeated tasks → promote to recipe or template
- 6 months no reference → archive or delete

---

## Summary

| Section | Items |
|---------|-------|
| golden_path | 5 steps |
| recipes | 4 recipes |
| decisions | 5 ADRs |
| runbook | 5 entries |
| templates | 5 templates |
| tuning | 4 metrics, 3 levers, 3 guardrails |
| invariants | 9 rules |
| task_decomposition | 6 PR phases |

**Expected time savings**: 2-4 hours per new developer onboarding, 1-2 hours per similar payment integration.

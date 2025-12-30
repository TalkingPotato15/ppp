# Data Model: Payment System

**Feature**: Payment Flow POC with Toss Payments
**Branch**: `002-payment-system`
**Date**: 2025-12-30

## Overview

This document defines the data entities and their relationships for the payment system POC. The model supports session-based payment flow with Toss Payments integration.

## Entity Definitions

### PaymentSession

Represents a payment transaction session from initiation through completion.

**Attributes**:
- `session_id` (str, primary key): Unique identifier for the payment session (UUID)
- `user_id` (str, foreign key): User who initiated the payment (from JWT token)
- `order_id` (str, unique): Our internal order identifier (UUID)
- `payment_key` (str, nullable): Toss Payments payment key (returned after initiation)
- `amount` (int): Payment amount in KRW (smallest currency unit, e.g., 1000 = ₩1,000)
- `order_name` (str): Description of what's being purchased (e.g., "Stage C Technical Specs")
- `status` (PaymentStatus enum): Current payment state
- `created_at` (datetime): When payment was initiated
- `updated_at` (datetime): Last status update
- `expires_at` (datetime): Session expiration (created_at + 30 minutes)
- `toss_response` (dict, nullable): Raw response from Toss API (for debugging)
- `error_code` (str, nullable): Error code if payment failed
- `error_message` (str, nullable): User-friendly error message

**Validation Rules**:
- `amount` must be >= 100 (minimum ₩100)
- `amount` must be <= 10000000 (maximum ₩10,000,000 for POC)
- `order_name` must be 1-100 characters
- `expires_at` must be > `created_at`
- `payment_key` is populated after successful Toss API call

**Storage Location**: In-memory dictionary or Redis (key: `session_id`, value: JSON-serialized PaymentSession)

### PaymentStatus (Enum)

Enumeration of possible payment states.

**Values**:
- `PENDING`: Payment initiated, awaiting user action on Toss page
- `IN_PROGRESS`: User is on Toss payment page (redirect occurred)
- `CONFIRMING`: User returned, backend is confirming with Toss
- `SUCCESS`: Payment successfully confirmed by Toss
- `FAILED`: Payment failed (user cancellation, insufficient funds, etc.)
- `EXPIRED`: Payment session expired (30 min timeout)
- `CANCELLED`: Payment explicitly cancelled by user before completion

**State Transitions**:
```
PENDING → IN_PROGRESS → CONFIRMING → SUCCESS
                              ↓
                            FAILED
         ↓
      EXPIRED

PENDING → CANCELLED (user clicks cancel before redirect)
IN_PROGRESS → CANCELLED (user cancels on Toss page)
```

### User (Existing)

Reference to existing user entity for payment association.

**Relevant Attributes**:
- `id` (UUID): User identifier
- `email` (str): User email (for payment confirmation)

**Relationship**: One user can have many payment sessions

### TossPaymentRequest (Pydantic Schema)

Request payload for initiating payment with Toss.

**Attributes**:
- `amount` (int): Payment amount in KRW
- `orderId` (str): Our order ID
- `orderName` (str): Purchase description
- `successUrl` (str): Redirect URL for successful payment
- `failUrl` (str): Redirect URL for failed payment
- `customerEmail` (str, optional): User email
- `customerName` (str, optional): User name

**Example**:
```json
{
  "amount": 1990,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "orderName": "Stage C Technical Specs",
  "successUrl": "https://yourapp.com/payment/success",
  "failUrl": "https://yourapp.com/payment/failure",
  "customerEmail": "user@example.com"
}
```

### TossPaymentResponse (Pydantic Schema)

Response from Toss Payments API after initiating payment.

**Attributes**:
- `paymentKey` (str): Toss payment identifier
- `orderId` (str): Our order ID (echoed back)
- `amount` (int): Payment amount (echoed back)
- `checkout` (dict): Checkout details including `url` for redirect

**Example**:
```json
{
  "paymentKey": "tviva20240330142105JQNMA",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1990,
  "checkout": {
    "url": "https://api.tosspayments.com/v1/payments/checkout/tviva20240330142105JQNMA"
  }
}
```

### PaymentConfirmRequest (Pydantic Schema)

Request to confirm payment after user returns from Toss.

**Attributes**:
- `paymentKey` (str): From Toss redirect query params
- `orderId` (str): From Toss redirect query params
- `amount` (int): From Toss redirect query params

**Validation**:
- All three values must match the original PaymentSession

### PaymentConfirmResponse (Pydantic Schema)

Response from Toss after confirming payment.

**Attributes**:
- `paymentKey` (str): Toss payment identifier
- `orderId` (str): Our order ID
- `status` (str): Payment status from Toss ("DONE", "CANCELED", "ABORTED", etc.)
- `totalAmount` (int): Final payment amount
- `approvedAt` (str): ISO datetime of approval
- `method` (str): Payment method used (card, transfer, etc.)
- `receipt` (dict, nullable): Receipt information

## Relationships

```
User (1) ───< (many) PaymentSession
             └─ user_id foreign key

PaymentSession (1) ──── (1) TossPaymentRequest (transient)
                 └─ Creates payment on Toss

TossPaymentResponse (transient) ───> PaymentSession
                     └─ Updates payment_key

PaymentSession (1) ──── (1) PaymentConfirmRequest (transient)
                 └─ Confirms payment with Toss

PaymentConfirmResponse (transient) ───> PaymentSession
                        └─ Updates status to SUCCESS/FAILED
```

## Data Flow

### 1. Payment Initiation

```
User → Frontend → Backend POST /api/payment/initiate
                    ↓
            Create PaymentSession (status=PENDING)
                    ↓
            Build TossPaymentRequest
                    ↓
            Call Toss API POST /v1/payments
                    ↓
            Receive TossPaymentResponse
                    ↓
            Update PaymentSession (payment_key, status=IN_PROGRESS)
                    ↓
            Return checkout URL to Frontend
                    ↓
Frontend → Redirect user to Toss checkout URL
```

### 2. Payment Completion (Success)

```
Toss → Redirect to successUrl with query params
         ↓
Frontend → Extract paymentKey, orderId, amount
         ↓
         POST /api/payment/confirm
         ↓
Backend → Build PaymentConfirmRequest
         ↓
         Validate params against PaymentSession
         ↓
         Call Toss API POST /v1/payments/{paymentKey}/confirm
         ↓
         Receive PaymentConfirmResponse (status=DONE)
         ↓
         Update PaymentSession (status=SUCCESS)
         ↓
         Return success response to Frontend
         ↓
Frontend → Display success page with transaction details
```

### 3. Payment Completion (Failure)

```
Toss → Redirect to failUrl with error query params
         ↓
Frontend → Extract code, message, orderId
         ↓
         POST /api/payment/fail (or just display failure page)
         ↓
Backend → Update PaymentSession (status=FAILED, error_code, error_message)
         ↓
Frontend → Display failure page with error message
```

## Storage Considerations

### In-Memory Storage (POC Default)

```python
# Global dict (single process)
payment_sessions: Dict[str, PaymentSession] = {}

# Cleanup task
async def cleanup_expired_sessions():
    now = datetime.utcnow()
    expired = [sid for sid, ps in payment_sessions.items() if ps.expires_at < now]
    for sid in expired:
        del payment_sessions[sid]
```

### Redis Storage (Production-Ready Alternative)

```python
# Redis with JSON serialization
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def save_payment_session(session: PaymentSession):
    key = f"payment:{session.session_id}"
    value = session.json()
    ttl = 1800  # 30 minutes
    redis_client.setex(key, ttl, value)

def get_payment_session(session_id: str) -> Optional[PaymentSession]:
    key = f"payment:{session_id}"
    value = redis_client.get(key)
    if value:
        return PaymentSession.parse_raw(value)
    return None
```

## Validation and Constraints

### Payment Amount Validation

```python
def validate_amount(amount: int) -> None:
    if amount < 100:
        raise ValueError("Amount must be at least ₩100")
    if amount > 10_000_000:
        raise ValueError("Amount exceeds POC limit of ₩10,000,000")
```

### Session Expiration

```python
def is_session_expired(session: PaymentSession) -> bool:
    return datetime.utcnow() > session.expires_at

def enforce_session_validity(session: PaymentSession) -> None:
    if is_session_expired(session):
        session.status = PaymentStatus.EXPIRED
        raise SessionExpiredError("Payment session has expired")
```

### Order ID Uniqueness

```python
def generate_order_id() -> str:
    return str(uuid.uuid4())

# Ensure no duplicate order IDs in active sessions
def is_order_id_unique(order_id: str) -> bool:
    return not any(ps.order_id == order_id for ps in payment_sessions.values())
```

## Security Considerations

1. **Session ID**: Use cryptographically secure UUIDs (uuid4)
2. **Amount Validation**: Always validate amount on backend, never trust frontend
3. **Payment Confirmation**: Always confirm with Toss API, never trust redirect params alone
4. **User Association**: Link payment to authenticated user_id from JWT
5. **Timeout**: Enforce 30-minute session expiration to prevent stale sessions

## Testing Data

### Test Payment Session (Success Flow)

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "order_id": "order-test-001",
  "payment_key": "tviva20240330142105JQNMA",
  "amount": 1990,
  "order_name": "Stage C Technical Specs",
  "status": "SUCCESS",
  "created_at": "2025-12-30T10:00:00Z",
  "updated_at": "2025-12-30T10:05:00Z",
  "expires_at": "2025-12-30T10:30:00Z",
  "toss_response": {...},
  "error_code": null,
  "error_message": null
}
```

### Test Payment Session (Failure Flow)

```json
{
  "session_id": "660f9511-f3ac-52e5-b827-557766551111",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "order_id": "order-test-002",
  "payment_key": null,
  "amount": 1990,
  "order_name": "Stage C Technical Specs",
  "status": "FAILED",
  "created_at": "2025-12-30T11:00:00Z",
  "updated_at": "2025-12-30T11:02:00Z",
  "expires_at": "2025-12-30T11:30:00Z",
  "toss_response": null,
  "error_code": "INSUFFICIENT_FUNDS",
  "error_message": "Insufficient funds in account"
}
```

## Summary

The data model supports:
- ✅ Payment session lifecycle tracking
- ✅ Integration with Toss Payments API
- ✅ User association via existing auth
- ✅ Session-based storage (in-memory or Redis)
- ✅ Clear state transitions and validation
- ✅ POC-appropriate simplicity (no database)

Ready for contract definition and implementation.

# Implementation Plan: Payment Flow POC with Toss Payments

**Branch**: `002-payment-system` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-payment-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a proof-of-concept payment system integrated with Toss Payments test environment. The system demonstrates a complete payment flow: initiating payments, redirecting to Toss Payments interface, handling success/failure callbacks, and clearly communicating transaction status to users. Session-based storage is used for POC simplicity.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript/Next.js 14+ (frontend)
**Primary Dependencies**: FastAPI (existing), httpx (existing), Toss Payments REST API (NEW); Next.js, React, Axios (frontend)
**Storage**: Session-based (Redis recommended, or in-memory dict for simplest POC), no persistent database required
**Package Manager**: uv (backend), npm (frontend)
**Testing**: pytest + pytest-asyncio (backend), Jest/React Testing Library (frontend)
**Target Platform**: Linux server (backend), Web browser (frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: <5s payment initiation, <3s status display after redirect
**Constraints**: POC-level error handling, test mode only, session timeout 30 minutes
**Scale/Scope**: POC for internal stakeholders, 10-50 concurrent demo sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Implementation |
|-----------|-------------|--------|----------------|
| I. Data-First | N/A | ✅ PASS | No market data collection in payment feature |
| II. Multi-Agent | N/A | ✅ PASS | Payment system, not agent pipeline |
| III. RAG-Driven | N/A | ✅ PASS | No RAG required for payment flow |
| IV. Budget-Aware | Low-cost POC | ✅ PASS | Test mode only, no real transactions, minimal infrastructure |
| V. Staged Monetization | Supports Stage C | ✅ PASS | Payment system enables $1.99 Stage C conversion |

**All gates passed. No violations.**

**Constitution Alignment Notes**:
- This feature enables **Principle V: Staged Monetization** by implementing the payment infrastructure required for Stage C ($1.99 technical specs)
- POC approach aligns with budget-aware design - validates flow before production investment
- Test mode integration ensures no real payment costs during development

## Project Structure

### Documentation (this feature)

```text
specs/002-payment-system/
├── plan.md              # This file
├── research.md          # Toss Payments integration patterns (to be generated)
├── data-model.md        # Payment entities and state models (to be generated)
├── quickstart.md        # Developer setup and testing guide (to be generated)
├── contracts/           # API contracts (to be generated)
│   └── payment-api.yaml
└── tasks.md             # Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Backend (existing structure extended)
src/
├── api/
│   ├── __init__.py
│   ├── main.py              # Existing FastAPI app
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Existing
│       └── payment.py       # NEW: Payment endpoints
├── models/
│   ├── __init__.py
│   ├── user.py              # Existing
│   └── payment.py           # NEW: Payment transaction models
├── services/
│   ├── __init__.py
│   ├── auth.py              # Existing
│   └── payment_service.py   # NEW: Toss Payments integration logic
├── schemas/
│   ├── __init__.py
│   ├── user.py              # Existing
│   └── payment.py           # NEW: Request/response schemas
├── config/
│   ├── __init__.py
│   └── settings.py          # Updated: Add Toss Payments credentials
└── storage/
    ├── __init__.py
    └── session_store.py     # NEW: Session-based payment state storage

# Frontend (existing Next.js structure extended)
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Existing
│   │   ├── discovery/       # Existing
│   │   └── payment/         # NEW: Payment flow pages
│   │       ├── checkout/
│   │       │   └── page.tsx
│   │       ├── success/
│   │       │   └── page.tsx
│   │       └── failure/
│   │           └── page.tsx
│   ├── components/
│   │   ├── auth/            # Existing
│   │   └── payment/         # NEW: Payment UI components
│   │       ├── PaymentButton.tsx
│   │       └── PaymentStatus.tsx
│   └── services/
│       ├── api.ts           # Existing
│       └── payment.ts       # NEW: Payment API client

# Tests
tests/
├── unit/
│   └── test_payment_service.py    # NEW
├── integration/
│   └── test_payment_flow.py       # NEW
└── fixtures/
    └── toss_responses.json         # NEW: Mock Toss API responses

frontend/src/
└── __tests__/
    └── payment/
        ├── PaymentButton.test.tsx  # NEW
        └── PaymentStatus.test.tsx  # NEW
```

**Structure Decision**: Web application pattern (backend + frontend). Extends existing FastAPI backend and Next.js frontend. Payment feature integrates into existing authentication and discovery UI flows. Session storage avoids database dependency for POC.

## Complexity Tracking

> No Constitution violations. Table not applicable.

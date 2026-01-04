# Tasks: Payment Flow POC with Toss Payments

**Input**: Design documents from `/specs/002-payment-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/payment-api.yaml

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are omitted per guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `src/` (existing FastAPI structure)
- Frontend: `frontend/src/` (existing Next.js structure)
- Tests: `tests/` (backend), `frontend/src/__tests__/` (frontend)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment configuration

- [X] T001 Add Toss Payments environment variables to .env.example file
- [X] T002 Update src/config/settings.py with Toss Payments configuration (TOSS_PAYMENTS_SECRET_KEY, TOSS_PAYMENTS_CLIENT_KEY, TOSS_API_BASE_URL, PAYMENT_SUCCESS_URL, PAYMENT_FAILURE_URL, PAYMENT_SESSION_TIMEOUT_MINUTES)
- [X] T003 [P] Create tests/fixtures directory and add toss_responses.json with mock Toss API responses

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core payment infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create PaymentStatus enum in src/models/payment.py with states (PENDING, IN_PROGRESS, CONFIRMING, SUCCESS, FAILED, EXPIRED, CANCELLED)
- [X] T005 Create PaymentSession model in src/models/payment.py with all attributes per data-model.md (session_id, user_id, order_id, payment_key, amount, order_name, status, timestamps, toss_response, error fields)
- [X] T006 [P] Create payment request/response schemas in src/schemas/payment.py (InitiatePaymentRequest, InitiatePaymentResponse, ConfirmPaymentRequest, ConfirmPaymentResponse, PaymentFailureRequest, PaymentFailureResponse, PaymentStatusResponse)
- [X] T007 Create session storage module in src/storage/session_store.py with in-memory dict implementation (save_payment_session, get_payment_session, delete_payment_session, cleanup_expired_sessions functions)
- [X] T008 Create PaymentService class in src/services/payment_service.py with Toss API client initialization and basic structure (httpx async client with Toss API base URL and auth headers)

### **NEW: Payment-Generation Linking (Per Updated Spec)**

- [ ] T008a **[NEW]** Add `problem_id` field to PaymentSession model in src/models/payment.py (FK to DocumentSummary)
- [ ] T008b **[NEW]** Add `is_used` boolean field to PaymentSession model (DEFAULT FALSE)
- [ ] T008c **[NEW]** Add `used_at` datetime field to PaymentSession model (nullable)
- [ ] T008d **[NEW]** Create Supabase migration for payment_sessions table with new fields
- [ ] T008e **[NEW]** Update payment storage to use PostgreSQL/Supabase instead of in-memory (persistent storage required)
- [ ] T008f **[NEW]** Add `get_unused_payment(user_id, problem_id)` function to payment storage
- [ ] T008g **[NEW]** Add `mark_payment_used(payment_id)` function to payment storage

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initiate Toss Payment Flow (Priority: P1) 🎯 MVP

**Goal**: Enable users to initiate payment, redirect to Toss, and receive success/failure status

**Independent Test**: Initiate a Toss payment transaction (using test mode), complete or cancel payment on Toss page, verify clear success or failure status displayed to user

### Implementation for User Story 1

#### Backend Implementation

- [X] T009 [P] [US1] Implement create_payment method in src/services/payment_service.py (calls Toss POST /v1/payments API, returns checkout URL)
- [X] T010 [P] [US1] Implement confirm_payment method in src/services/payment_service.py (calls Toss POST /v1/payments/{paymentKey}/confirm API)
- [X] T011 [P] [US1] Implement get_payment_status method in src/services/payment_service.py (retrieves payment session from storage)
- [X] T012 [P] [US1] Implement record_payment_failure method in src/services/payment_service.py (updates session with error details)
- [X] T013 [US1] Implement POST /api/payment/initiate endpoint in src/api/routers/payment.py (creates session, calls create_payment, returns checkout_url)
- [X] T014 [US1] Implement POST /api/payment/confirm endpoint in src/api/routers/payment.py (validates params, calls confirm_payment, updates session to SUCCESS)
- [X] T015 [US1] Implement POST /api/payment/fail endpoint in src/api/routers/payment.py (updates session to FAILED with error message)
- [X] T016 [US1] Register payment router in src/api/app.py (app.include_router with /api prefix)
- [X] T017 [US1] Add payment amount validation logic in src/services/payment_service.py (100 <= amount <= 10000000, order_name length 1-100)
- [X] T018 [US1] Add session expiration check logic in src/services/payment_service.py (enforce 30-minute timeout)
- [X] T019 [US1] Add duplicate payment prevention logic in src/services/payment_service.py (check for existing pending/in_progress session before creating new one)
- [X] T020 [US1] Add error handling and logging for Toss API calls in src/services/payment_service.py (handle httpx exceptions, log all API interactions)

#### Frontend Implementation

- [X] T021 [P] [US1] Create payment API client in frontend/src/lib/api.ts (initiatePayment, confirmPayment, recordFailure, getPaymentStatus functions)
- [X] T022 [P] [US1] Create PaymentButton component in frontend/src/components/payment/PaymentButton.tsx (triggers initiatePayment on click, redirects to checkout_url)
- [X] T023 [P] [US1] Create PaymentStatus component in frontend/src/components/payment/PaymentStatus.tsx (displays payment status with transaction details or error message)
- [X] T024 [P] [US1] Create checkout page in frontend/src/app/payment/checkout/page.tsx (displays payment amount, order name, PaymentButton)
- [ ] T024a **[NEW]** [US1] Update checkout page to accept problem_id parameter and include in payment initiation request
- [X] T025 [P] [US1] Create success page in frontend/src/app/payment/success/page.tsx (extracts query params, calls confirmPayment, displays PaymentStatus with success message)
- [X] T026 [P] [US1] Create failure page in frontend/src/app/payment/failure/page.tsx (extracts error from query params, calls recordFailure, displays PaymentStatus with error message)
- [X] T027 [US1] Add loading states and error handling to PaymentButton component (disable button during payment initiation, show spinner, handle API errors)
- [X] T028 [US1] Add redirect handling in success page (handle case where confirmPayment fails, show appropriate error)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can initiate payment, complete it on Toss, and see success/failure status

---

## Phase 4: User Story 2 - View Payment Status (Priority: P2)

**Goal**: Enable users to view payment status after completing a payment attempt

**Independent Test**: Complete a Toss payment, navigate to status page, verify payment status is displayed with transaction details or error message

### Implementation for User Story 2

- [X] T029 [US2] Implement GET /api/payment/status/{order_id} endpoint in src/api/routers/payment.py (retrieves payment session by order_id, returns PaymentStatusResponse)
- [X] T030 [US2] Add authorization check in GET /api/payment/status/{order_id} endpoint (verify user_id from JWT matches payment session user_id)
- [X] T031 [P] [US2] Create status page in frontend/src/app/payment/status/[orderId]/page.tsx (calls getPaymentStatus, displays PaymentStatus component with full transaction details)
- [X] T032 [US2] Add navigation link from success/failure pages to status page in frontend (allow users to view full payment details after redirect)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - payment flow complete with status retrieval

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and finalize POC

- [X] T033 [P] Add session cleanup background task in src/api/app.py (periodic task to cleanup_expired_sessions every 5 minutes)
- [X] T034 [P] Add comprehensive logging for all payment operations in src/services/payment_service.py (log session creation, Toss API calls, status updates, errors)
- [X] T035 Update src/api/app.py to start session cleanup task on application startup
- [X] T036 [P] Add environment variable validation on startup in src/config/settings.py (raise error if TOSS_PAYMENTS_SECRET_KEY is missing or invalid format)
- [X] T037 [P] Create payment flow documentation in specs/002-payment-system/DEMO.md (step-by-step demo script for stakeholders)
- [X] T038 [P] Add TypeScript type definitions for payment API responses in frontend/src/types/payment.ts
- [ ] T039 Test complete payment flow using quickstart.md guide (success scenario with test card 4000000000000008)
- [ ] T040 Test payment failure scenarios (cancellation, invalid card if available)
- [ ] T041 Test session expiration scenario (verify 30-minute timeout works correctly)
- [X] T042 [P] Code cleanup and remove any unused imports or commented code
- [X] T043 [P] Add inline comments for complex Toss API integration logic in src/services/payment_service.py

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-4)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Technically independent but builds on US1 endpoints (GET /payment/status uses same session storage as US1)

### Within Each User Story

**User Story 1**:
- Backend service methods (T009-T012) must complete before endpoints (T013-T015)
- Endpoints must be registered (T016) before frontend can call them
- Frontend API client (T021) must exist before components use it
- Pages can be built in parallel once API client exists

**User Story 2**:
- Backend endpoint (T029-T030) before frontend page (T031)
- Frontend page before navigation links (T032)

### Parallel Opportunities

**Setup (Phase 1)**:
- T001, T002, T003 can all run in parallel (different files)

**Foundational (Phase 2)**:
- T004, T005 (same file, sequential)
- T006 (different file, parallel with T007, T008)
- T007, T008 (different files, parallel with each other and T006)

**User Story 1 Backend**:
- T009, T010, T011, T012 all parallel (same class, different methods)
- T013, T014, T015 sequential (same router file)
- T017, T018, T019, T020 parallel (can be added to service concurrently)

**User Story 1 Frontend**:
- T021, T022, T023, T024, T025, T026 all parallel (different files)
- T027, T028 sequential with their respective components

**User Story 2**:
- T031 can be built in parallel with T029-T030 (different codebases)

**Polish (Phase 5)**:
- T033, T034, T036, T037, T038, T042, T043 all parallel (different files/concerns)

---

## Parallel Example: User Story 1 Backend Services

```bash
# Launch all payment service methods together:
Task: "Implement create_payment method in src/services/payment_service.py"
Task: "Implement confirm_payment method in src/services/payment_service.py"
Task: "Implement get_payment_status method in src/services/payment_service.py"
Task: "Implement record_payment_failure method in src/services/payment_service.py"
```

## Parallel Example: User Story 1 Frontend Pages

```bash
# Launch all payment pages together (after API client T021 is done):
Task: "Create checkout page in frontend/src/app/payment/checkout/page.tsx"
Task: "Create success page in frontend/src/app/payment/success/page.tsx"
Task: "Create failure page in frontend/src/app/payment/failure/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) ⚠️ CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T009-T028)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md
5. Deploy/demo if ready (core payment flow functional)

**This gives you a working POC with full payment flow - sufficient for stakeholder demonstration**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)**
   - Users can initiate payment and see success/failure
3. Add User Story 2 → Test independently → Deploy/Demo
   - Users can additionally view payment status details
4. Add Polish (Phase 5) → Final POC refinement

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together (T001-T008)
2. Once Foundational is done:
   - **Developer A**: User Story 1 Backend (T009-T020)
   - **Developer B**: User Story 1 Frontend (T021-T028)
3. Test integration (T039-T041)
4. If needed, split User Story 2:
   - **Developer A**: Backend (T029-T030)
   - **Developer B**: Frontend (T031-T032)
5. Both work on Polish tasks (T033-T043)

---

## Task Summary

- **Total Tasks**: 43
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 5 tasks (BLOCKING)
- **User Story 1 (Phase 3)**: 20 tasks (Backend: 12, Frontend: 8)
- **User Story 2 (Phase 4)**: 4 tasks
- **Polish (Phase 5)**: 11 tasks

**Parallel Opportunities**: 28 tasks marked [P] can run in parallel with other tasks in their phase

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 28 tasks for a working payment POC

---

## Notes

- [P] tasks = different files or independent methods, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are NOT included (not requested in spec)
- All file paths are absolute from repository root
- Frontend uses Next.js App Router structure (app/ directory)
- Backend extends existing FastAPI application structure

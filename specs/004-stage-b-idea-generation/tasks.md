# Tasks: Stage B - Idea Generation

**Input**: Design documents from `/specs/004-stage-b-idea-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ideas-api.yaml

**Note**: This feature enhances existing Stage B implementation with AI agent, RAG integration, **payment-based generation** (1 payment = 1 generation), and bookmarking as a filter for My Ideas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Backend code: `src/` | Frontend code: `frontend/src/`

---

## Phase 1: Setup (Data Preparation)

**Purpose**: Scrape market data for RAG testing and prepare environment

- [ ] T001 Run data scraper to collect 100+ market problems: `python -m src.main collect --limit 200` (DEFERRED - using mock for dev)
- [ ] T002 Verify ChromaDB has embeddings for all documents: `python -m src.main stats` (DEFERRED - 2 docs exist)
- [x] T003 [P] Add OpenAI API key to `.env`: `OPENAI_API_KEY=sk-...`
- [x] T004 [P] Verify dependencies installed: `pip install openai` if not in pyproject.toml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migrations and model updates that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add `is_bookmarked` field to GeneratedIdea model in `src/models/generated_idea.py`
- [x] T006 Add `market_signals` JSON field to GeneratedIdea model in `src/models/generated_idea.py`
- [x] T007 Add `confidence_score` float field to GeneratedIdea model in `src/models/generated_idea.py`
- [x] T008 Add `rag_context` JSON field to GenerationSession model in `src/models/generation_session.py`
- [x] T009 Create Alembic migration for new fields: `alembic revision --autogenerate -m "add_rag_and_bookmark_fields"`
- [x] T010 Run migration: `alembic upgrade head`
- [x] T011 [P] Update IdeaResponse schema with new fields in `src/schemas/ideas.py`
- [x] T012 [P] Update frontend Idea type with new fields in `frontend/src/types/idea.ts`

### **NEW: Payment-Generation Linking & Soft Delete (Per Updated Spec)**

- [ ] T012a **[NEW]** Add `payment_id` field to GenerationSession model (FK to payment_sessions, UNIQUE)
- [ ] T012b **[NEW]** Add `is_deleted` boolean field to GeneratedIdea model (DEFAULT FALSE for soft delete)
- [ ] T012c **[NEW]** Create Supabase migration for new payment_id and is_deleted fields
- [ ] T012d **[NEW]** Add index on `payment_id` (unique constraint)
- [ ] T012e **[NEW]** Add partial index on `is_deleted` WHERE is_deleted = FALSE

**Checkpoint**: Database schema ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Idea Generation Request (Priority: P1) 🎯 MVP

**Goal**: Users can generate AI-powered business ideas grounded in real market data via RAG

**Independent Test**: Log in → Select problem → Pay → Click "Generate Ideas" → See 3-5 relevant ideas with market signals

**⚠️ UPDATED**: Generation is now **per-payment**, not per-problem. Multiple payments = multiple generations allowed.

### Backend: RAG Service

- [x] T013 [US1] Create RAG retrieval service in `src/services/rag_service.py`:
  - Function `retrieve_similar_problems(problem_id, top_k=5)` using ChromaDB
  - Query formulation from title + keywords
  - Domain filtering and similarity threshold (>0.7)
  - Return formatted context for LLM prompt

- [x] T014 [US1] Create embedding helper in `src/services/rag_service.py`:
  - Function `embed_query(text)` using OpenAI embeddings
  - Reuse existing embedder from `src/agents/analyst/embedder.py` if compatible

### Backend: AI Agent Implementation

- [x] T015 [US1] Update AIAgentService with real LLM implementation in `src/services/ai_agent.py`:
  - Add OpenAI client initialization
  - Create system prompt for Agent 2 (Strategic Planner)
  - Implement `_generate_real_ideas()` method with structured output

- [x] T016 [US1] Implement RAG-enhanced prompt building in `src/services/ai_agent.py`:
  - Accept `rag_context` parameter in `generate_ideas()`
  - Build prompt with target problem + related market context
  - Parse LLM response into GeneratedIdeaData objects

- [x] T017 [US1] Add market_signals and confidence_score to GeneratedIdeaData in `src/services/ai_agent.py`

### Backend: Payment-Based Generation Enforcement (UPDATED)

- [ ] T018 **[UPDATED]** [US1] Add payment validation in `src/api/routers/ideas.py`:
  - Before generating, check if unused payment exists for (user_id, problem_id)
  - If no unused payment, return 402 Payment Required
  - If unused payment exists, proceed with generation
  - ~~One-time per problem~~ → **One-time per payment**

- [ ] T018a **[NEW]** [US1] Add payment consumption in `src/api/routers/ideas.py`:
  - After successful generation, mark payment as `is_used = TRUE`
  - Record `used_at` timestamp
  - Link `payment_id` to GenerationSession

- [x] T019 [US1] Update `generate_ideas` endpoint to integrate RAG in `src/api/routers/ideas.py`:
  - Call RAG service to retrieve similar problems
  - Pass RAG context to AI agent
  - Store RAG context in session for debugging

- [ ] T019a **[NEW]** [US1] Update `generate_ideas` to accept and validate `payment_id` parameter

### Backend: Store New Fields

- [x] T020 [US1] Update idea_store to save new fields in `src/storage/idea_store.py`:
  - Save `market_signals`, `confidence_score` on GeneratedIdea
  - Save `rag_context` on GenerationSession

### Frontend: Stage B Page Updates (UPDATED for payment-based flow)

- [ ] T021 **[UPDATED]** [US1] Update Stage B page for payment-based generation in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - On page load, check for unused payment via `GET /api/payment/unused?problem_id={problemId}`
  - If no unused payment, show "Pay to Generate" button → redirect to checkout
  - If unused payment exists, show "Generate Ideas" button
  - Show ALL previous generation sessions for this problem (multiple generations allowed)

- [x] T022 [US1] Remove FeedbackInput component usage in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - Remove regeneration-related UI elements
  - Simplify to single "Generate Ideas" flow

- [ ] T023 **[UPDATED]** [US1] Update GenerateButton in `frontend/src/components/stage-b/GenerateButton.tsx`:
  - Accept `payment_id` prop
  - Pass `payment_id` to generation API call
  - After generation, refresh to show new ideas alongside existing ones

- [ ] T024 **[UPDATED]** [US1] Update useIdeas hook in `frontend/src/hooks/useIdeas.ts`:
  - Add `checkUnusedPayment(problemId)` function
  - Add `getAllSessionsForProblem(problemId)` to show multiple generations
  - Handle 402 Payment Required response gracefully

**Checkpoint**: User Story 1 complete - users can generate RAG-powered ideas once per payment

---

## Phase 4: User Story 2 - Idea Viewing and Exploration (Priority: P1)

**Goal**: Users can view and explore generated ideas with full details including market signals

**Independent Test**: After generation → Click idea card → See expanded details with market_signals and confidence_score

### Frontend: Enhanced Idea Display

- [x] T025 [P] [US2] Update IdeaCard to show market signals in `frontend/src/components/stage-b/IdeaCard.tsx`:
  - Display confidence_score as visual indicator (e.g., progress bar)
  - Show first 1-2 market_signals as preview text

- [x] T026 [P] [US2] Update IdeaDetail to show full details in `frontend/src/components/stage-b/IdeaDetail.tsx`:
  - Show all market_signals as bullet list
  - Display confidence_score prominently
  - Format market_opportunity and implementation_hints

- [x] T027 [US2] Add smooth navigation between ideas in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - Previous/Next buttons or swipe gestures
  - Idea count indicator (e.g., "2 of 5")

**Checkpoint**: User Story 2 complete - users can view and navigate ideas with full details

---

## Phase 5: User Story 3 - My Ideas (All Generated) & Bookmark Filter (Priority: P1)

**Goal**: ALL generated ideas auto-saved to My Ideas. Bookmark is a FILTER, not a save action.

**Independent Test**: Generate ideas → ALL appear in My Ideas automatically → Click bookmark → Filter by bookmarked → See only bookmarked

**⚠️ UPDATED**: My Ideas now shows ALL generated ideas. Bookmark = filter, not save.

### Backend: My Ideas API (UPDATED)

- [ ] T028 **[UPDATED]** [US3] Add "Get all user's ideas" endpoint in `src/api/routers/ideas.py`:
  - `GET /my-ideas` with pagination
  - Return ALL ideas from ALL sessions (not just bookmarked)
  - Filter out `is_deleted = TRUE`
  - Include problem context (title, id)

- [x] T029 [US3] Add list bookmarked ideas endpoint in `src/api/routers/ideas.py`:
  - `GET /bookmarked` with pagination (filter for bookmark = true)
  - Return ideas with problem context

- [x] T030 [US3] Add bookmark schemas in `src/schemas/ideas.py`:
  - `BookmarkRequest(is_bookmarked: bool)`
  - `BookmarkResponse(idea_id: str, is_bookmarked: bool)`
  - `IdeaWithContextResponse` including problem_id and problem_title

- [x] T031 [US3] Add bookmark operations to idea_store in `src/storage/idea_store.py`:
  - `toggle_bookmark(idea_id, user_id, is_bookmarked)`
  - `get_bookmarked_ideas(user_id, limit, offset)`

### Backend: Soft Delete API (NEW)

- [ ] T031a **[NEW]** [US3] Add soft delete endpoint in `src/api/routers/ideas.py`:
  - `DELETE /{idea_id}` sets `is_deleted = TRUE` (soft delete)
  - Verify user owns the idea
  - Return 204 No Content

- [ ] T031b **[NEW]** [US3] Add `get_all_user_ideas(user_id, include_deleted=False)` in `src/storage/idea_store.py`

- [ ] T031c **[NEW]** [US3] Add `soft_delete_idea(idea_id, user_id)` in `src/storage/idea_store.py`

### Frontend: My Ideas Page (UPDATED)

- [x] T032 [P] [US3] Add bookmark icon to IdeaCard in `frontend/src/components/stage-b/IdeaCard.tsx`:
  - Star/bookmark icon that toggles on click
  - Visual feedback for bookmarked state (filled vs outline)
  - Optimistic UI update

- [x] T033 [P] [US3] Add bookmark types in `frontend/src/types/idea.ts`:
  - `BookmarkRequest`, `BookmarkResponse`
  - `IdeaWithContext` type

- [x] T034 [US3] Add bookmark API calls in `frontend/src/lib/api.ts`:
  - `toggleBookmark(ideaId, isBookmarked)`
  - `getBookmarkedIdeas(limit, offset)`

- [ ] T034a **[NEW]** [US3] Add `getAllMyIdeas(limit, offset)` in `frontend/src/lib/api.ts`

- [ ] T034b **[NEW]** [US3] Add `deleteIdea(ideaId)` in `frontend/src/lib/api.ts`

- [x] T035 [US3] Add bookmark hooks in `frontend/src/hooks/useIdeas.ts`:
  - `useToggleBookmark()` mutation hook
  - `useBookmarkedIdeas()` query hook

- [ ] T036 **[UPDATED]** [US3] Rewrite My Ideas page in `frontend/src/app/my-ideas/page.tsx`:
  - Show ALL generated ideas by default (not just saved)
  - Group by problem/session
  - Add "Bookmarked Only" filter toggle
  - Add delete button with confirmation
  - Show multiple generation sessions for same problem separately

**Checkpoint**: User Story 3 complete - My Ideas shows all generated ideas, bookmark filters favorites

---

## Phase 6: User Story 4 - Generation History (Priority: P3)

**Goal**: Users can view past idea generation sessions across different problems

**Independent Test**: Generate ideas for 2+ problems → Go to History → See all sessions with dates → Click to view each

### Backend: History Already Exists

Note: `GET /sessions` and `GET /sessions/{sessionId}` already implemented - verify they work

- [x] T037 [US4] Verify session list endpoint works in `src/api/routers/ideas.py`:
  - Ensure pagination works correctly
  - Verify ideas are included in response

### Frontend: History Page

- [x] T038 [US4] Create generation history page in `frontend/src/app/history/page.tsx`:
  - List past sessions with problem titles and dates
  - Show session status (COMPLETED, FAILED)
  - Click to navigate to session details

- [x] T039 [US4] Add history navigation link in `frontend/src/components/layout/Header.tsx`:
  - Add "History" link in authenticated user menu

- [x] T040 [US4] Add session history hooks in `frontend/src/hooks/useIdeas.ts`:
  - `useSessions()` to fetch paginated session list
  - `useSession(sessionId)` to fetch single session

**Checkpoint**: User Story 4 complete - users can browse their generation history

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and cleanup

- [X] T041 [P] Add error handling for AI agent failures in `src/api/routers/ideas.py`:
  - 503 for AI unavailable
  - 504 for timeout
  - 502 for invalid response
  - User-friendly error messages

- [X] T042 [P] Add loading states in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - Skeleton UI while checking existing session
  - Generation progress indicator (may take 20+ seconds)

- [X] T043 [P] Add error UI components in `frontend/src/components/stage-b/`:
  - Error state with retry option (for failed sessions only)
  - Timeout warning message

- [X] T044 Remove deprecated FeedbackInput component: `frontend/src/components/stage-b/FeedbackInput.tsx`

- [X] T045 Run quickstart.md validation - verify all flows work end-to-end

- [X] T046 Update CLAUDE.md with new AI agent configuration if needed

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────┐
                                                       │
Phase 2 (Foundational) ◀──────────────────────────────┘
    │
    ├───▶ Phase 3 (US1: Generation) 🎯 MVP
    │         │
    │         ▼
    ├───▶ Phase 4 (US2: Viewing) ─── Can start after US1 backend
    │
    ├───▶ Phase 5 (US3: Bookmark) ─── Independent of US1/US2
    │
    └───▶ Phase 6 (US4: History) ─── Independent, mostly exists
                                                       │
Phase 7 (Polish) ◀─────────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 (Generation) | Phase 2 only | Core MVP - must complete first |
| US2 (Viewing) | US1 backend | Needs ideas to display |
| US3 (Bookmark) | Phase 2 only | Independent - can parallel with US1 |
| US4 (History) | Phase 2 only | Mostly exists - verify only |

### Parallel Opportunities

**Within Phase 2** (all [P] tasks):
```
T011 (backend schemas) + T012 (frontend types)
```

**Within Phase 3** (US1):
```
T013 + T014 (RAG service) ─┐
                           ├──▶ T015-T017 (AI Agent)
T021 + T022 + T023 (FE) ───┘
```

**Within Phase 5** (US3):
```
T028-T031 (backend) || T032-T033 (frontend types)
    └─────────────────▶ T034-T036 (frontend integration)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (scrape data)
2. Complete Phase 2: Foundational (migrations)
3. Complete Phase 3: User Story 1 (generation with RAG)
4. Complete Phase 4: User Story 2 (viewing)
5. **STOP and VALIDATE**: Full generation flow works
6. Demo/deploy MVP

### Incremental Delivery

1. **MVP**: Setup + Foundation + US1 + US2 → Users can generate and view ideas
2. **v1.1**: Add US3 (Bookmarks) → Users can save favorites
3. **v1.2**: Add US4 (History) → Users can browse past sessions
4. **v1.3**: Polish phase → Error handling, edge cases

---

## Task Summary

| Phase | Tasks | Parallel Opportunities | Status |
|-------|-------|------------------------|--------|
| Phase 1: Setup | 4 | 2 parallel groups | Mostly done |
| Phase 2: Foundational | 8 + **5 NEW** | 2 parallel groups | **NEW tasks pending** |
| Phase 3: US1 Generation | 12 + **4 UPDATED** | 4 parallel groups | **Needs rework** |
| Phase 4: US2 Viewing | 3 | 2 parallel tasks | Done |
| Phase 5: US3 My Ideas | 9 + **6 NEW** | 3 parallel groups | **Needs rework** |
| Phase 6: US4 History | 4 | 1 parallel group | Done |
| Phase 7: Polish | 6 | 4 parallel tasks | Mostly done |
| **Total** | **46 + 15 NEW/UPDATED** | | |

### NEW Tasks Summary (Per Updated Spec)

| Task ID | Description | Phase |
|---------|-------------|-------|
| T012a-e | Payment-Generation linking, soft delete | Phase 2 |
| T018, T018a, T019a | Payment validation & consumption | Phase 3 |
| T021, T023, T024 | Frontend payment-based flow | Phase 3 |
| T028 | Get all user's ideas endpoint | Phase 5 |
| T031a-c | Soft delete API | Phase 5 |
| T034a-b | Frontend delete API | Phase 5 |
| T036 | Rewrite My Ideas page | Phase 5 |

---

## Notes

- Backend: `src/` (Python/FastAPI)
- Frontend: `frontend/src/` (TypeScript/Next.js)
- All user stories except US1 can be worked on in parallel after Phase 2
- US1 is the critical path - complete it first for MVP
- Existing code is enhanced, not replaced - be careful with existing functionality
- RAG requires scraped data - don't skip Phase 1

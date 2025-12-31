# Tasks: Stage B - Idea Generation

**Input**: Design documents from `/specs/004-stage-b-idea-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ideas-api.yaml

**Note**: This feature enhances existing Stage B implementation with AI agent, RAG integration, one-time generation, and bookmarking.

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

**Checkpoint**: Database schema ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Idea Generation Request (Priority: P1) 🎯 MVP

**Goal**: Users can generate AI-powered business ideas grounded in real market data via RAG

**Independent Test**: Log in → Select problem → Pay → Click "Generate Ideas" → See 3-5 relevant ideas with market signals

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

### Backend: One-Time Generation Enforcement

- [x] T018 [US1] Add one-time generation check in `src/api/routers/ideas.py`:
  - Before generating, check if completed session exists for (user_id, problem_id)
  - If exists, return 409 Conflict with existing session data
  - Use existing `get_latest_session_for_problem` helper

- [x] T019 [US1] Update `generate_ideas` endpoint to integrate RAG in `src/api/routers/ideas.py`:
  - Call RAG service to retrieve similar problems
  - Pass RAG context to AI agent
  - Store RAG context in session for debugging

### Backend: Store New Fields

- [x] T020 [US1] Update idea_store to save new fields in `src/storage/idea_store.py`:
  - Save `market_signals`, `confidence_score` on GeneratedIdea
  - Save `rag_context` on GenerationSession

### Frontend: Stage B Page Updates

- [x] T021 [US1] Update Stage B page to check existing session in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - On page load, call `GET /api/ideas/problem/{problemId}/latest`
  - If session exists with COMPLETED status, show ideas directly
  - Only show "Generate" button if no completed session

- [x] T022 [US1] Remove FeedbackInput component usage in `frontend/src/app/stage-b/[problemId]/page.tsx`:
  - Remove regeneration-related UI elements
  - Simplify to single "Generate Ideas" flow

- [x] T023 [US1] Update GenerateButton to handle one-time generation in `frontend/src/components/stage-b/GenerateButton.tsx`:
  - Disable button after successful generation
  - Show "Ideas Generated" state instead of "Generate Again"

- [x] T024 [US1] Update useIdeas hook for one-time flow in `frontend/src/hooks/useIdeas.ts`:
  - Add `checkExistingSession(problemId)` function
  - Handle 409 Conflict response gracefully

**Checkpoint**: User Story 1 complete - users can generate RAG-powered ideas once per problem

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

## Phase 5: User Story 3 - Bookmark Favorite Ideas (Priority: P2)

**Goal**: Users can bookmark/star their favorite ideas for quick access

**Independent Test**: View ideas → Click bookmark icon → Go to My Ideas → Filter by bookmarked → See bookmarked idea

### Backend: Bookmark API

- [x] T028 [US3] Add bookmark endpoint in `src/api/routers/ideas.py`:
  - `PATCH /{idea_id}/bookmark` accepting `BookmarkRequest`
  - Verify user owns the idea (via session ownership)
  - Return `BookmarkResponse` with updated status

- [x] T029 [US3] Add list bookmarked ideas endpoint in `src/api/routers/ideas.py`:
  - `GET /bookmarked` with pagination
  - Return ideas with problem context

- [x] T030 [US3] Add bookmark schemas in `src/schemas/ideas.py`:
  - `BookmarkRequest(is_bookmarked: bool)`
  - `BookmarkResponse(idea_id: str, is_bookmarked: bool)`
  - `IdeaWithContextResponse` including problem_id and problem_title

- [x] T031 [US3] Add bookmark operations to idea_store in `src/storage/idea_store.py`:
  - `toggle_bookmark(idea_id, user_id, is_bookmarked)`
  - `get_bookmarked_ideas(user_id, limit, offset)`

### Frontend: Bookmark UI

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

- [x] T035 [US3] Add bookmark hooks in `frontend/src/hooks/useIdeas.ts`:
  - `useToggleBookmark()` mutation hook
  - `useBookmarkedIdeas()` query hook

- [x] T036 [US3] Update My Ideas page with bookmark filter in `frontend/src/app/my-ideas/page.tsx`:
  - Add "Bookmarked" filter toggle
  - Show bookmark status on each idea
  - Use `getBookmarkedIdeas` when filter active

**Checkpoint**: User Story 3 complete - users can bookmark and filter their favorite ideas

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

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Phase 1: Setup | 4 | 2 parallel groups |
| Phase 2: Foundational | 8 | 2 parallel groups |
| Phase 3: US1 Generation | 12 | 4 parallel groups |
| Phase 4: US2 Viewing | 3 | 2 parallel tasks |
| Phase 5: US3 Bookmark | 9 | 3 parallel groups |
| Phase 6: US4 History | 4 | 1 parallel group |
| Phase 7: Polish | 6 | 4 parallel tasks |
| **Total** | **46** | |

---

## Notes

- Backend: `src/` (Python/FastAPI)
- Frontend: `frontend/src/` (TypeScript/Next.js)
- All user stories except US1 can be worked on in parallel after Phase 2
- US1 is the critical path - complete it first for MVP
- Existing code is enhanced, not replaced - be careful with existing functionality
- RAG requires scraped data - don't skip Phase 1

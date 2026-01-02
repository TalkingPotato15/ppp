# Implementation Plan: Stage B - Idea Generation

**Branch**: `004-stage-b-idea-generation` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-stage-b-idea-generation/spec.md`

**Note**: This plan covers enhancements to the existing Stage B implementation to support the updated spec requirements (no regeneration, auto-save, bookmarking).

## Summary

Stage B is the core value-creation stage where authenticated, paying users generate business ideas for selected problems. The AI agent (provided via separate API) generates 3-5 ideas per problem. Ideas are automatically saved as paid content and persist indefinitely. Users can bookmark favorites and view generation history. Regeneration is explicitly not supported - users get one set of ideas per problem to ensure commitment.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript/Next.js 14+ (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, httpx (backend); React 18, Axios, TailwindCSS (frontend)
**Storage**: SQLite with SQLAlchemy ORM (dev), PostgreSQL (production)
**Testing**: pytest, pytest-asyncio (backend); Jest/React Testing Library (frontend - future)
**Target Platform**: Linux server (backend), Web browser (frontend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Idea generation completes within 30 seconds for 95% of requests; support 500 concurrent requests
**Constraints**: AI agent API response time ~20 seconds; must handle timeouts gracefully
**Scale/Scope**: 10k users initial target; 3-5 ideas per generation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Data-First | Ideas must originate from real market data | PASS | AI agent receives problem context (title, keywords, domain, trend, sentiment) from Stage A data |
| II. Multi-Agent Specialization | Agent 2 generates ideas ONLY | PASS | AIAgentService handles idea generation only; no overlap with data collection or tech planning |
| III. RAG-Driven Accuracy | Context-dependent responses use RAG | PASS | Problem context passed to AI agent for grounded generation |
| IV. Budget-Aware Design | Respect user constraints | N/A | Budget constraints apply to Stage C, not Stage B |
| V. Staged Monetization | Stage B costs $0.99 after problem selection | PASS | Payment integration (002-payment-system) required before idea generation |

**Gate Result**: PASS - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/004-stage-b-idea-generation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ideas-api.yaml   # OpenAPI spec
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Web application structure (frontend + backend)
backend/
├── src/
│   ├── models/
│   │   ├── generation_session.py  # Exists - needs is_bookmarked field
│   │   ├── generated_idea.py      # Exists - needs is_bookmarked field
│   │   └── saved_idea.py          # Exists - may deprecate in favor of bookmarking
│   ├── services/
│   │   └── ai_agent.py            # Exists - mock implementation ready
│   ├── storage/
│   │   └── idea_store.py          # Exists - needs bookmark operations
│   ├── api/
│   │   └── routers/
│   │       └── ideas.py           # Exists - needs one-time generation check
│   └── schemas/
│       └── ideas.py               # Exists - needs bookmark response types
└── tests/

frontend/
├── src/
│   ├── components/
│   │   └── stage-b/
│   │       ├── IdeaCard.tsx       # Exists - needs bookmark icon
│   │       ├── IdeaDetail.tsx     # Exists
│   │       ├── GenerateButton.tsx # Exists - needs one-time check
│   │       └── FeedbackInput.tsx  # Remove (no regeneration)
│   ├── app/
│   │   ├── stage-b/
│   │   │   └── [problemId]/
│   │   │       └── page.tsx       # Exists - update flow
│   │   └── my-ideas/
│   │       └── page.tsx           # Exists - add bookmark filter
│   ├── hooks/
│   │   └── useIdeas.ts            # Exists - add bookmark hooks
│   └── types/
│       └── idea.ts                # Exists - add bookmark types
└── tests/
```

**Structure Decision**: Using existing web application structure. Backend code is in `src/` (not `backend/src/`), frontend code is in `frontend/src/`.

## Complexity Tracking

No violations to justify - design follows constitution principles.

## Key Changes Required

### Backend Changes

1. **One-time generation enforcement**
   - Check if user already has a completed session for the problem
   - Return existing ideas instead of generating new ones
   - Remove `feedback` parameter from generation (no regeneration context needed)

2. **Bookmark functionality**
   - Add `is_bookmarked` field to `GeneratedIdea` model
   - Replace or augment `SavedIdea` with simpler bookmark toggle
   - Add bookmark/unbookmark endpoints
   - Add filter by bookmark status

3. **Payment verification**
   - Verify payment completed before allowing generation
   - Check payment session for problemId

### Frontend Changes

1. **Stage B Page updates**
   - Check for existing ideas before showing generate button
   - Remove regeneration UI (FeedbackInput component)
   - Show existing ideas immediately if already generated

2. **Bookmark UI**
   - Add bookmark icon to IdeaCard
   - Toggle bookmark state on click
   - Visual indicator for bookmarked ideas

3. **My Ideas page**
   - Add bookmark filter toggle
   - Show bookmark status on each idea

## Next Steps

1. Generate `research.md` - Resolve any remaining technical decisions
2. Generate `data-model.md` - Document entity changes
3. Generate `contracts/ideas-api.yaml` - API contract updates
4. Generate `quickstart.md` - Developer setup guide
5. Run `/speckit.tasks` to create implementation tasks

# Implementation Plan: Stage C - Technical Execution

**Branch**: `005-stage-c-execution` | **Date**: 2025-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-stage-c-execution/spec.md`

**User Request**: "다른 개발 스펙들에 호환성이 좋게 만들고 싶다." (Want to ensure good compatibility with other feature specs)

## Summary

Stage C transforms selected business ideas from Stage B into developer-ready technical specifications using a Tech Architect Agent (Agent 3). Users provide constraints (budget, team size, timeline, technical preferences), and the system generates PRD, architecture diagrams, MVP roadmap, and tech stack recommendations with rationale. Payment: ₩2,500 with up to 3 regenerations included.

**Key Compatibility Goal**: Follow the established Vercel + Supabase architecture pattern from 002-payment-system and 004-stage-b-idea-generation.

## Technical Context

**Language/Version**: TypeScript 5.4+ / Next.js 14+ (App Router)
**Primary Dependencies**:
- @supabase/supabase-js (^2.89.0) - Database client
- openai (^6.15.0) - Tech Architect Agent LLM
- jose (^6.1.3) - JWT authentication
- @tosspayments/payment-sdk (^1.9.2) - Payment processing
- axios (^1.7.0) - HTTP client
- tailwindcss (^3.4.0) - Styling

**Storage**: Supabase PostgreSQL with pgvector extension (ap-northeast-2)
**Testing**: Vercel function testing, manual E2E testing
**Target Platform**: Vercel (서울 리전 icn1), Supabase (ap-northeast-2)
**Project Type**: Next.js App Router (frontend + API routes on Vercel serverless)
**Performance Goals**: Spec generation <60 seconds for 95% requests (Vercel function timeout: 60초)
**Constraints**:
- Vercel Function maxDuration: 60초 (vercel.json 설정)
- Tech Architect Agent response time ~45 seconds
- Regeneration limit: 3 per paid idea (total 4 generations)
**Scale/Scope**: PoC with 10 target users, single domain (real estate/housing)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| **I. Data-First** | ✅ PASS | Stage C uses context from Stage A (problems via `document_summaries`) and Stage B (ideas via `generated_ideas`) through Supabase pgvector RAG. |
| **II. Multi-Agent Specialization** | ✅ PASS | Agent 3 (Tech Architect) has single responsibility: creating technical implementation plans. Clear boundary with Agent 2 (`ai-agent.ts` for idea generation). |
| **III. RAG-Driven Accuracy** | ✅ PASS | Tech Architect receives full context via Supabase `match_documents()` RPC. Output includes rationale for each tech recommendation. |
| **IV. Budget-Aware Design** | ✅ PASS | Core feature: User constraints (budget, team, timeline) directly influence architecture recommendations. Budget ranges in KRW. |
| **V. Staged Monetization** | ✅ PASS | Stage C costs ₩2,500. Paid users receive tangible PRD, architecture, roadmap artifacts. Single payment covers 1 initial + 3 regenerations. |
| **Testing Standards** | ✅ PASS | Spec enables cost estimation without follow-up (FR-017). Success criteria: 4+/5 user rating for tech stack rationale. |
| **Git Branching** | ✅ PASS | Feature branch `005-stage-c-execution` → merge to `dev` first → then `main`. |

**Gate Status**: ✅ All gates passed. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-stage-c-execution/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── stage-c-api.yaml # OpenAPI specification
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Database Schema (Supabase SQL)
supabase/
└── schema.sql                        # ADD: technical_specifications, user_constraints, regeneration_quota tables

# Frontend + Vercel Serverless (Next.js App Router)
frontend/src/
├── app/
│   ├── stage-c/
│   │   └── [ideaId]/
│   │       └── page.tsx              # NEW: Stage C main page (constraint form → generation → viewer)
│   └── api/
│       └── stage-c/                  # NEW: Vercel serverless API routes
│           ├── specifications/
│           │   ├── route.ts          # POST: create spec (with payment verification)
│           │   └── [specId]/
│           │       ├── route.ts      # GET: spec detail
│           │       ├── regenerate/
│           │       │   └── route.ts  # POST: regenerate with new constraints
│           │       └── export/
│           │           └── route.ts  # GET: download PDF/Markdown
│           └── constraints/
│               └── validate/
│                   └── route.ts      # POST: validate constraints before generation
├── components/
│   └── stage-c/                      # NEW: Stage C components
│       ├── ConstraintsForm.tsx       # Budget, team, timeline, tech preferences input
│       ├── SpecificationViewer.tsx   # Main viewer with tabbed navigation
│       ├── DocumentNav.tsx           # PRD | Architecture | Roadmap | TechStack tabs
│       ├── PRDSection.tsx            # PRD document display
│       ├── ArchitectureSection.tsx   # Architecture diagram (Mermaid.js) + description
│       ├── RoadmapSection.tsx        # MVP roadmap phases display
│       ├── TechStackSection.tsx      # Tech recommendations with rationale
│       ├── ExportButton.tsx          # PDF/Markdown download
│       ├── RegenerationCounter.tsx   # "남은 재생성 횟수: 2/3" display
│       ├── GenerationProgress.tsx    # Loading state with estimated time
│       └── VersionHistory.tsx        # View past specification versions
├── hooks/
│   └── useStageC.ts                  # NEW: Stage C state management (generation, export, regeneration)
├── lib/
│   ├── supabase.ts                   # EXISTING: Supabase client (add Stage C types)
│   ├── ai-agent.ts                   # EXISTING: Agent 2 (idea generation)
│   ├── tech-architect-agent.ts       # NEW: Agent 3 (specification generation)
│   ├── vector-search.ts              # EXISTING: RAG context retrieval
│   ├── document-exporter.ts          # NEW: PDF/Markdown generation
│   └── auth-middleware.ts            # EXISTING: Authentication helper
└── types/
    ├── idea.ts                       # EXISTING: Stage B types
    └── stage-c.ts                    # NEW: Stage C type definitions

# Legacy Backend (NOT USED for Stage C - Data Pipeline only)
src/
└── agents/analyst/                   # Data collection agent (separate service)
```

**Structure Decision**: Follows established Vercel + Supabase pattern from 004-stage-b-idea-generation. All backend logic as Next.js API Routes (Vercel serverless). Database via Supabase client. Python `src/` is only for Data Pipeline (separate service).

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| **I. Data-First** | ✅ PASS | `tech-architect-agent.ts` uses `getRAGContext()` from `vector-search.ts` to ground recommendations in real market data. Constraints are frozen in `constraints_snapshot` JSONB. |
| **II. Multi-Agent Specialization** | ✅ PASS | Agent 3 clearly separated in `lib/tech-architect-agent.ts`. Agent 2 remains in `lib/ai-agent.ts`. No overlap in responsibilities. |
| **III. RAG-Driven Accuracy** | ✅ PASS | Problem context (Stage A) and idea details (Stage B) retrieved via Supabase pgvector. Tech stack rationale includes explicit constraint alignment. |
| **IV. Budget-Aware Design** | ✅ PASS | `UserConstraints` schema enforces budget ranges. `constraintAlignment` field in tech recommendations explicitly addresses budget/team/timeline fit. |
| **V. Staged Monetization** | ✅ PASS | ₩2,500 payment verified before generation. Single payment covers initial + 3 regenerations. `regeneration_quotas` table enforces limit. |
| **Testing Standards** | ✅ PASS | Output structure includes `estimatedCost` and `constraintAlignment` enabling cost estimation. Acceptance criteria mapped to PRD requirements. |
| **Git Branching** | ✅ PASS | All changes in `005-stage-c-execution` branch. Will merge to `dev` first via PR. |

**Post-Design Gate Status**: ✅ All gates passed. Ready for Phase 2 (tasks generation).

## Key Integration Points

### With Existing Features

| Feature | Integration Point | How Stage C Uses It |
|---------|-------------------|---------------------|
| 001-data-pipeline | `document_summaries` table | RAG context for problem domain |
| 002-payment-system | `/api/payment/` routes | Verify ₩2,500 payment before generation |
| 003-discovery-ui-auth | `auth-middleware.ts`, `jwt.ts` | User authentication |
| 004-stage-b-idea-generation | `generated_ideas`, `generation_sessions` tables | Selected idea context |

### Shared Libraries to Reuse

| Library | Purpose | Stage C Usage |
|---------|---------|---------------|
| `lib/supabase.ts` | Database client | All DB operations |
| `lib/auth-middleware.ts` | `requireAuth()` function | Protect all Stage C routes |
| `lib/vector-search.ts` | `getRAGContext()` function | Build context for Tech Architect |
| `lib/jwt.ts` | Token verification | Cookie-based auth |

### New Libraries to Create

| Library | Purpose | Pattern Reference |
|---------|---------|-------------------|
| `lib/tech-architect-agent.ts` | Agent 3 LLM integration | Follow `lib/ai-agent.ts` pattern |
| `lib/document-exporter.ts` | PDF/Markdown export | New (research needed) |

## Phase Outputs

### Phase 0: Research (Next Step)
- Tech Architect Agent prompt engineering (structured JSON output for PRD, architecture, roadmap, tech stack)
- PDF generation in Vercel serverless (jspdf vs @react-pdf/renderer vs puppeteer alternatives)
- Markdown ZIP generation (jszip in browser)
- Architecture diagram rendering (Mermaid.js live rendering)
- Korean Won budget range handling and validation
- Regeneration quota management pattern

### Phase 1: Design (After Research)
- `data-model.md`: Supabase table definitions (`technical_specifications`, `user_constraints`, `specification_versions`, `regeneration_quota`)
- `contracts/stage-c-api.yaml`: OpenAPI specification for all Stage C API routes
- `quickstart.md`: Development setup guide (Vercel + Supabase local development)

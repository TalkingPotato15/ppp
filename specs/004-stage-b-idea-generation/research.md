# Research: Stage B - Idea Generation

**Feature**: 004-stage-b-idea-generation
**Date**: 2025-12-31
**Status**: Complete

## Technical Decisions

### 1. One-Time Generation Enforcement

**Decision**: Check for existing completed session at API level before generating

**Rationale**:
- Users pay for idea generation, so they should get ideas only once per problem
- Prevents abuse and ensures commitment to the generated ideas
- Existing `get_latest_session_for_problem` endpoint already supports this pattern

**Alternatives Considered**:
- Database constraint (rejected: too rigid, harder to handle edge cases)
- Frontend-only check (rejected: can be bypassed, not secure)

**Implementation**:
- Modify `POST /api/ideas/generate` to check for existing completed session
- If exists, return 409 Conflict with existing session data
- Frontend checks before showing "Generate" button

### 2. Bookmark vs SavedIdea Model

**Decision**: Add `is_bookmarked` boolean field to `GeneratedIdea` model; deprecate `SavedIdea`

**Rationale**:
- All ideas are now automatically saved (paid content)
- `SavedIdea` was designed for manual save/unsave which is no longer needed
- Simpler data model: bookmark is just a flag on the idea itself
- Better query performance (no join table needed)

**Alternatives Considered**:
- Keep `SavedIdea` for bookmarks (rejected: adds unnecessary complexity)
- Separate `BookmarkedIdea` table (rejected: same problem as SavedIdea)
- Use tags/labels system (rejected: over-engineering for single bookmark feature)

**Implementation**:
- Add `is_bookmarked: Mapped[bool]` to `GeneratedIdea` model
- Create migration to add column with default False
- Keep `SavedIdea` table for backwards compatibility but deprecate its use
- New endpoints: `PATCH /api/ideas/{idea_id}/bookmark` (toggle)

### 3. Payment Verification Strategy

**Decision**: Verify payment via sessionStorage customer_data on frontend; backend trusts authenticated requests

**Rationale**:
- Payment is already completed via Toss SDK before reaching Stage B
- Payment system stores `customer_data` with `problemId` in sessionStorage
- Backend can verify user has paid by checking payment session exists for the problem
- Existing flow: Problem select → Payment checkout → Toss redirect → Success → Stage B

**Alternatives Considered**:
- Backend payment check on every request (rejected: adds latency, payment already confirmed)
- JWT claim with paid problems (rejected: over-engineering, token refresh complexity)

**Implementation**:
- Frontend: After payment success, redirect to Stage B with problemId
- Backend: Optional check in `/api/ideas/generate` to verify payment session exists
- For MVP: Trust that user reached Stage B through valid payment flow

### 4. AI Agent API Integration Pattern

**Decision**: Use async HTTP client with timeout and retry; mock for development

**Rationale**:
- AI agent is external API with variable response time (typically <20s)
- Need graceful timeout handling (30s max per spec)
- Mock implementation already exists for development

**Alternatives Considered**:
- Synchronous calls (rejected: blocks event loop)
- Background job queue (rejected: over-engineering for <30s operation)
- WebSocket streaming (rejected: not supported by AI agent API)

**Implementation**:
- Existing `AIAgentService` with async httpx client
- Configure 30-second timeout
- Implement `_generate_real_ideas` when AI agent endpoint is available
- Mock remains for development/testing

### 5. Error Handling for Edge Cases

**Decision**: Handle each edge case with specific error responses

| Edge Case | Handling |
|-----------|----------|
| AI agent API unavailable | Return 503 Service Unavailable; show user-friendly message |
| AI agent timeout | Return 504 Gateway Timeout; suggest retry |
| Empty response from AI | Return 502 Bad Gateway; log for investigation |
| User navigates away | Session stays in GENERATING status; cleanup via cron (future) |
| Concurrent requests | Database transaction ensures only one session created |
| Session expires | Auth middleware handles; return 401 |
| Problem not found | Return 404 Not Found |

**Implementation**:
- Wrap AI agent call in try/except
- Set session status to FAILED with error message on failure
- Frontend polls session status for long operations

## Dependencies Analysis

### 003-discovery-ui-auth
- Provides: User authentication, problem selection, ProblemPreview component
- Integration: Stage B page requires authenticated user; receives problemId from navigation

### 002-payment-system
- Provides: Payment checkout flow, Toss SDK integration
- Integration: Payment success redirects to Stage B; customer_data includes problemId

### 001-data-pipeline
- Provides: Problem data (DocumentSummary) with title, keywords, domain, trend, sentiment
- Integration: Stage B fetches problem details for AI agent context

### AI Agent API (External)
- Provides: Idea generation endpoint (TBD)
- Integration: AIAgentService calls external API with problem context
- Current status: Mock implementation; real endpoint to be configured

## Best Practices Applied

### FastAPI/Backend
- Use dependency injection for services
- Async/await for I/O operations
- Pydantic for request/response validation
- SQLAlchemy 2.0 style mappings

### Next.js/Frontend
- Server components where possible
- Client components for interactivity
- Custom hooks for data fetching (useIdeas)
- Optimistic UI updates for bookmarks

### Database
- Indexed foreign keys for query performance
- Enum types for status fields
- Cascading deletes for referential integrity
- Migration-based schema changes

## Open Questions (Resolved)

1. ~~Should regeneration feedback be removed?~~ **Yes** - Spec explicitly excludes regeneration
2. ~~Keep SavedIdea table?~~ **Yes** for backwards compatibility, but deprecated
3. ~~How to verify payment?~~ Trust authenticated flow; optional backend check
4. ~~Bookmark persistence?~~ Inline field on GeneratedIdea, not separate table

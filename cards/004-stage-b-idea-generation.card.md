# Stage B - Idea Generation Card

feature: Stage B - Idea Generation
branch: 004-stage-b-idea-generation
created: 2025-12-31
spec: specs/004-stage-b-idea-generation/spec.md

## golden_path

goal: new developer reaches working state within 15 min

prerequisites:
- Python 3.11+
- Node.js 18+
- OpenAI API key (https://platform.openai.com/api-keys)
- Supabase project with users table
- ChromaDB with embeddings (from 001-data-pipeline)

steps:
1. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env:
   # OPENAI_API_KEY=sk-...
   # NEXT_PUBLIC_SUPABASE_URL=...
   # SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. Install dependencies and run migrations:
   ```bash
   source .venv/bin/activate
   pip install -e ".[dev]"
   alembic upgrade head
   ```
3. Start backend:
   ```bash
   python -m src.main serve --reload
   ```
4. Start frontend (new terminal):
   ```bash
   cd frontend && npm install && npm run dev
   ```
5. Test flow:
   - Login at http://localhost:3000/auth/login
   - Select problem from discovery page
   - Pay for Stage B ($0.99 test)
   - Click "Generate Ideas" and wait ~5 seconds

success_check:
- `curl http://localhost:8000/docs` returns 200
- `curl http://localhost:3000` returns 200
- Generate ideas returns 3-5 ideas with market_signals and confidence_score

## recipes

### add-ai-agent-method
when: Adding new AI agent capability (e.g., new generation type)
steps:
1. Add method signature to `AIAgentService` class in `src/services/ai_agent.py`
2. Add mock implementation in `_generate_mock_*` method
3. Add real implementation in `_generate_real_*` method with OpenAI call
4. Add new system prompt constant for the capability
5. Update `GeneratedIdeaData` dataclass if new output fields needed
verify: `pytest tests/unit/test_ai_agent.py -v`

### add-rag-retrieval
when: Adding new RAG context source or retrieval strategy
steps:
1. Add retrieval function in `src/services/rag_service.py`
2. Create `RAGDocument` subclass if new fields needed
3. Add formatting function `format_*_for_prompt`
4. Call from `generate_ideas` endpoint before AI agent
5. Store in `rag_context` JSON field on GenerationSession
verify: Check logs for "RAG retrieved X documents"

### add-idea-field
when: Adding new field to generated ideas
steps:
1. Add field to `GeneratedIdeaData` dataclass in `src/services/ai_agent.py`
2. Add column to `GeneratedIdea` model in `src/models/generated_idea.py`
3. Create Alembic migration: `alembic revision --autogenerate -m "add_field"`
4. Run migration: `alembic upgrade head`
5. Update `IdeaResponse` schema in `src/schemas/ideas.py`
6. Add TypeScript type in `frontend/src/types/idea.ts`
7. Update UI components to display new field
verify: Generate ideas and verify field appears in response

### add-generation-endpoint
when: Adding new API endpoint for idea operations
steps:
1. Add route in `src/api/routers/ideas.py`
2. Add request/response schemas in `src/schemas/ideas.py`
3. Add storage function in `src/storage/idea_store.py`
4. Add API client function in `frontend/src/lib/api.ts`
5. Add hook method in `frontend/src/hooks/useIdeas.ts`
verify: `curl -X POST http://localhost:8000/api/ideas/{endpoint}`

### add-bookmark-filter
when: Adding new filter option to My Ideas page
steps:
1. Add filter parameter to `get_*_ideas` in `src/storage/idea_store.py`
2. Add query parameter to GET endpoint in `src/api/routers/ideas.py`
3. Add filter state to `frontend/src/app/my-ideas/page.tsx`
4. Add filter UI toggle component
verify: Filter toggle shows/hides correct ideas

## decisions

### one-payment-one-generation
context: Needed to enforce payment-based access to idea generation
decision: One payment = one generation session; payment_id is UNIQUE on GenerationSession
alternatives:
- Unlimited generations per problem: No monetization, abuse potential
- Subscription model: Over-engineering for MVP
consequences: Clear value exchange, prevents abuse, allows multiple paid generations per problem
revisit_when: Subscription model requested or user complaints exceed 10% about generation limits

### rag-enhanced-generation
context: Ideas must be grounded in real market data (constitution Principle III)
decision: Retrieve 3-5 similar problems from ChromaDB before LLM generation
alternatives:
- No RAG (pure LLM): Generic ideas, not grounded in data
- Full document context: Too much context, high token cost
consequences: Ideas reference real market signals, higher quality, slightly higher latency (~1s)
revisit_when: RAG retrieval latency exceeds 3s or similarity threshold needs adjustment

### openai-structured-output
context: Need consistent JSON output from LLM for parsing
decision: Use OpenAI's `response_format={"type": "json_object"}` with explicit schema
alternatives:
- Free-text parsing: Unreliable, parsing errors
- Function calling: More complex, similar outcome
consequences: Reliable JSON output, easier parsing, model-specific feature
revisit_when: Switching LLM providers or OpenAI deprecates feature

### bookmark-inline-field
context: Users need to filter favorite ideas in My Ideas page
decision: Add `is_bookmarked` boolean field directly on GeneratedIdea (not separate table)
alternatives:
- SavedIdea join table: Extra complexity, N+1 query risk
- Separate BookmarkedIdea table: Same issues as SavedIdea
consequences: Simple queries, fast filtering, deprecated SavedIdea table
revisit_when: Need for multiple bookmark categories or sharing bookmarks

### mock-mode-development
context: Development shouldn't require OpenAI API calls
decision: AIAgentService has `_generate_mock_ideas` when OPENAI_API_KEY is empty
alternatives:
- Always require API key: Expensive development, flaky tests
- Fixture files: Less realistic, harder to maintain
consequences: Fast development cycle, realistic mock responses, easy testing
revisit_when: Mock templates diverge significantly from real output format

### soft-delete-ideas
context: Users may want to remove ideas from My Ideas without permanent deletion
decision: Add `is_deleted` boolean field, filter in queries
alternatives:
- Hard delete: Data loss, no undo
- Archive table: More complex, same outcome
consequences: Recoverable deletions, simple implementation, slight query overhead
revisit_when: Storage costs become concern or GDPR hard-delete requirement

## runbook

### openai-api-error
symptom: "LLM generation failed" or 500 error on idea generation
confirm: Check backend logs for OpenAI error details
fix:
1. Verify OPENAI_API_KEY is set: `grep OPENAI_API_KEY .env`
2. Check API key validity: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
3. Check rate limits on OpenAI dashboard
4. If quota exceeded, wait or upgrade plan
verify: Generate ideas returns 3-5 ideas successfully
prevent: Add API key validation on startup, implement retry with backoff

### rag-empty-results
symptom: "No related market data available" in generation or low confidence scores
confirm: Check `RAG retrieved 0 documents` in logs
fix:
1. Verify ChromaDB has data: `python -m src.main stats`
2. Check distance threshold (default 0.5): lower = stricter
3. Verify domain_tag filter matches data
4. Run data scraper to add more documents
verify: RAG logs show "retrieved X documents" where X >= 3
prevent: Seed data on first run, monitor document count

### generation-timeout
symptom: 504 Gateway Timeout or "generation taking too long"
confirm: Check request duration > 30s in logs
fix:
1. Check OpenAI API status: https://status.openai.com/
2. Reduce max_tokens if response too large (default 4000)
3. Check RAG retrieval latency (should be <1s)
4. Consider switching to faster model (gpt-3.5-turbo)
verify: Generation completes within 30 seconds
prevent: Set httpx timeout, add progress indicator on frontend

### ideas-already-generated
symptom: 409 Conflict "Ideas already generated for this problem"
confirm: Check if session exists: `GET /api/ideas/problem/{problemId}/latest`
fix:
1. This is expected behavior for one-time generation
2. User should view existing ideas instead of regenerating
3. If payment was made but session failed, mark session as FAILED for retry
verify: User can view existing ideas from My Ideas page
prevent: Check for existing session before showing Generate button

### bookmark-not-persisting
symptom: Bookmark toggles but reverts on page refresh
confirm: Check `is_bookmarked` column in database after toggle
fix:
1. Verify migration ran: `alembic current` should show latest
2. Check PATCH request reaches backend (network tab)
3. Verify user owns the idea (authorization check)
4. Check for optimistic update not syncing with server
verify: Bookmark persists after page refresh
prevent: Add error handling for failed bookmark API calls

### mock-mode-unexpected
symptom: Mock ideas returned when real API expected
confirm: Check logs for "Using mock ideas (no API key or mock mode)"
fix:
1. Verify OPENAI_API_KEY is set in .env
2. Restart backend after .env changes
3. Check AIAgentService instantiation (use_mock=False)
verify: Real LLM response with varied confidence scores (mock always 0.6-0.9)
prevent: Add startup log showing "Using OpenAI GPT model: {model}"

## templates

### ai-agent-service-method
purpose: Add new generation method to AIAgentService
location: src/services/ai_agent.py
variables:
- method_name: snake_case method name
- output_type: Dataclass for output
- system_prompt: LLM system prompt constant
usage:
```python
async def generate_{type}(self, problem_context: dict, rag_context: Optional[str] = None) -> list[{OutputType}]:
    if self._use_mock or not settings.openai_api_key:
        return await self._generate_mock_{type}(problem_context)
    else:
        return await self._generate_real_{type}(problem_context, rag_context)
```

### rag-retrieval-function
purpose: Add new RAG retrieval strategy
location: src/services/rag_service.py
variables:
- function_name: retrieval function name
- filter_type: ChromaDB where filter
usage:
```python
async def retrieve_{type}(
    query_text: str,
    top_k: int = 5,
    distance_threshold: float = 0.5,
) -> RAGContext:
    query_embedding = await generate_embedding(query_text)
    results = await search_similar(query_embedding=query_embedding, n_results=top_k)
    # Filter and convert to RAGDocument
    return RAGContext(documents=documents, query_text=query_text, total_retrieved=len(documents))
```

### idea-router-endpoint
purpose: Add new ideas API endpoint
location: src/api/routers/ideas.py
variables:
- http_method: GET/POST/PATCH/DELETE
- path: Endpoint path
- request_schema: Pydantic request model
- response_schema: Pydantic response model
usage:
```python
@router.{method}("/{path}", response_model={ResponseSchema})
async def {endpoint_name}(
    request: {RequestSchema},
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> {ResponseSchema}:
    # Implementation
    pass
```

### frontend-ideas-hook
purpose: Add new hook method for ideas data
location: frontend/src/hooks/useIdeas.ts
variables:
- hook_name: camelCase hook name
- api_function: API client function to call
usage:
```typescript
const {hookName} = useCallback(async (ideaId: string, ...params) => {
  try {
    const response = await ideasApi.{apiFunction}(ideaId, ...params);
    // Update local state
    setSession(prev => /* update logic */);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed');
    throw err;
  }
}, []);
```

### stage-b-component
purpose: Add new Stage B UI component
location: frontend/src/components/stage-b/{ComponentName}.tsx
variables:
- ComponentName: PascalCase component name
- props_interface: TypeScript props
usage:
```typescript
'use client';

import { GeneratedIdea } from '@/types/idea';

interface {ComponentName}Props {
  idea: GeneratedIdea;
  onAction: (ideaId: string) => void;
}

export function {ComponentName}({ idea, onAction }: {ComponentName}Props) {
  return (
    <div className="...">
      {/* Component content */}
    </div>
  );
}
```

## tuning

metrics:
- generation_latency: Time from "Generate" click to ideas displayed (target: <30s P95)
- rag_retrieval_time: ChromaDB query + embedding time (target: <1s)
- llm_response_time: OpenAI API call duration (target: <20s)
- ideas_per_session: Number of ideas generated (target: 3-5)
- confidence_score_avg: Average confidence across ideas (target: >0.7)

levers:
- LLM_MODEL: gpt-4o-mini (fast), gpt-4o (quality) (default: gpt-4o-mini)
- max_tokens: 2000-6000 (default: 4000)
- temperature: 0.5-1.0 (default: 0.8, higher = more creative)
- RAG_TOP_K: 3-10 similar documents (default: 5)
- RAG_DISTANCE_THRESHOLD: 0.3-0.7 (default: 0.5, lower = stricter)

guardrails:
- generation_latency > 45s → Switch to gpt-4o-mini, reduce max_tokens
- rag_retrieval_time > 3s → Check ChromaDB index, reduce TOP_K
- confidence_score_avg < 0.5 → Check RAG data quality, adjust threshold
- LLM cost > $0.50/generation → Switch to smaller model

## invariants

- One payment_id can only be used for one GenerationSession (UNIQUE constraint)
- Each session generates exactly 3-5 ideas (min 3, max 5)
- All generated ideas are automatically stored in My Ideas (paid content)
- Idea fields (title, description, target_audience, etc.) are immutable after creation
- Only is_bookmarked and is_deleted can be modified on GeneratedIdea
- RAG must retrieve at least 3 documents before generation (RQ-001)
- Retrieved documents must have similarity > 0.7 (RQ-002)
- market_signals must reference data from RAG context
- confidence_score is 0.0-1.0 range
- Generation timeout is 30 seconds max
- User can only access their own sessions and ideas (user_id check)

## task_decomposition

unit: One service/component per task; backend and frontend can parallel
parallel_boundaries:
- RAG service (T013-T014) || Frontend page updates (T021-T024)
- Backend schemas (T011) || Frontend types (T012)
- Bookmark backend (T028-T031) || Bookmark frontend (T032-T035)
pr_sequence:
1. Phase 1 (Setup): Environment and data → Foundation ready
2. Phase 2 (Foundational): Database migrations → Models ready
3. Phase 3 (US1 Generation): RAG + AI Agent + API → Core flow working
4. Phase 4 (US2 Viewing): Enhanced display → Full UX
5. Phase 5 (US3 My Ideas): Bookmark + soft delete → Complete feature
6. Phase 7 (Polish): Error handling, cleanup → Production ready
definition_of_done:
- Backend endpoint returns expected JSON
- Frontend displays data without errors
- Mock mode works for development
- Real API mode generates grounded ideas
- Bookmarks persist across sessions
- My Ideas shows all generated ideas

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
| recipes | 5 recipes |
| decisions | 6 ADRs |
| runbook | 6 entries |
| templates | 5 templates |
| tuning | 5 metrics, 5 levers, 4 guardrails |
| invariants | 11 rules |
| task_decomposition | 6 PR phases |

**Expected time savings**: 4-6 hours per new developer onboarding, 3-4 hours per similar AI agent feature.

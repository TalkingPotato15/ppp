# Stage C - Technical Execution Card

feature: Stage C - Technical Execution
branch: 005-stage-c-execution
created: 2025-01-02
spec: specs/005-stage-c-execution/spec.md

## golden_path

goal: new developer reaches working state within 15 min

prerequisites:
- Node.js 18+
- Supabase project with users and generated_ideas tables
- OpenAI API key (GPT-4o for structured outputs)
- Vercel account (optional for deployment)

steps:
1. Install dependencies:
   ```bash
   cd frontend
   npm install mermaid pdfmake jszip file-saver
   npm install -D @types/file-saver
   ```
2. Configure environment:
   ```bash
   # Add to .env.local (most should exist):
   OPENAI_API_KEY=sk-...
   LLM_MODEL=gpt-4o  # Required for structured outputs
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Run database migration (Supabase SQL Editor):
   ```sql
   -- Copy from specs/005-stage-c-execution/data-model.md "Migration SQL"
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

success_check:
- `curl http://localhost:3000` returns 200
- Navigate to `/stage-c/{ideaId}` and see constraint form
- Submit constraints and verify specification generates within 60s
- View PRD, Architecture, Roadmap, TechStack tabs render correctly

## recipes

### add-tech-architect-output-field
when: Adding new field to LLM-generated specification output
steps:
1. Add field to JSON schema in `lib/tech-architect-agent.ts`
2. Add TypeScript interface in `types/stage-c.ts`
3. Add column to JSONB content field in `technical_specifications` table
4. Update viewer component to display new field
5. Update PDF/Markdown exporter in `lib/document-exporter.ts`
verify: Generate specification, verify new field appears in viewer and export

### add-constraint-input
when: Adding new user constraint input to form
steps:
1. Add field to `UserConstraints` interface in `types/stage-c.ts`
2. Add input component in `components/stage-c/`
3. Integrate into `ConstraintsForm.tsx`
4. Update validation in `lib/constraint-validator.ts`
5. Update Tech Architect system prompt to use new constraint
6. Update `constraints_snapshot` JSONB schema documentation
verify: Fill constraint form, verify value passed to LLM and reflected in output

### add-specification-api-route
when: Adding new API route for specification operations
steps:
1. Create route in `app/api/specifications/{path}/route.ts`
2. Add `export const dynamic = 'force-dynamic'`
3. Import `requireAuth` from `lib/auth-middleware`
4. Add request/response types in `types/stage-c.ts`
5. Add API client function in `lib/api.ts`
6. Add hook method in `hooks/useStageC.ts`
verify: `curl -X POST/GET http://localhost:3000/api/specifications/{path}`

### add-viewer-section
when: Adding new document section to specification viewer
steps:
1. Create viewer component in `components/stage-c/{Section}Viewer.tsx`
2. Add tab option in `DocumentTabs.tsx`
3. Add content type in `types/stage-c.ts`
4. Add JSONB field to `technical_specifications` table
5. Update LLM schema to generate new section
6. Update exporters for PDF and Markdown
verify: New tab appears in viewer, content renders correctly

### add-export-format
when: Adding new export format (e.g., DOCX, HTML)
steps:
1. Add format to `ExportFormat` type in `types/stage-c.ts`
2. Implement generation function in `lib/document-exporter.ts`
3. Add format option to `ExportButton.tsx`
4. Update export API route if server-side generation needed
verify: Select format in UI, verify download produces valid file

## decisions

### gpt4o-structured-outputs
context: Need reliable JSON schema compliance from Tech Architect Agent
decision: GPT-4o with `response_format` + `json_schema` + `strict: true`
alternatives:
- JSON mode (legacy): Only guarantees valid JSON, not schema adherence
- Prompt-only enforcement: Unreliable, produces malformed JSON
- Function calling: More suited for tool use, overkill for document generation
consequences: 100% schema compliance, higher cost than gpt-4o-mini (~$0.03 vs $0.0005 per 1K tokens)
revisit_when: OpenAI releases cheaper model with structured outputs or costs exceed $50/month

### pdfmake-client-side
context: Need PDF generation within Vercel serverless constraints (60s timeout, 50MB limit)
decision: pdfmake with client-side generation
alternatives:
- @react-pdf/renderer: 1.5MB+ bundle, errors on Vercel
- Puppeteer/Playwright: 50MB+, exceeds deployment limit
- External PDF service: Adds cost, latency, dependency
consequences: 400KB bundle, JSON-declarative, Korean font support requires custom setup
revisit_when: Need for complex layouts or server-side PDF generation required

### mermaid-diagrams
context: Need architecture diagram rendering from LLM output
decision: Mermaid.js for client-side rendering with LLM-generated diagram code
alternatives:
- PlantUML: Requires Java backend
- Graphviz/DOT: Less LLM training data
- Draw.io/Excalidraw: Complex custom rendering
consequences: GPT-4o well-trained on Mermaid syntax, browser-native, SVG export for PDF
revisit_when: Need for interactive diagrams or complex visualizations

### optimistic-locking-quota
context: Regeneration quota (3 per idea) must be atomic under concurrent requests
decision: PostgreSQL optimistic locking with version column
alternatives:
- Pessimistic locking: Performance overhead, deadlock risk
- Redis atomic counter: Additional infrastructure
- SELECT FOR UPDATE: Connection blocking
consequences: Simple implementation, atomic decrements, retry on conflict
revisit_when: Concurrent modification rate exceeds 5% or need for distributed locking

### jsonb-specification-storage
context: Specification structure may evolve; need flexible schema
decision: Store prd, architecture, roadmap, techstack as separate JSONB columns
alternatives:
- Single JSONB document: Harder to query individual sections
- Normalized tables: Over-engineering for document storage
- File storage: Adds complexity for simple JSON data
consequences: Flexible schema, PostgreSQL JSON operators for queries, TypeScript types for app layer
revisit_when: Need for full-text search or complex document queries

### korean-localized-constraints
context: Target market is Korea; budget/timeline must be in familiar units
decision: Budget ranges in KRW (원), timeline in Korean (개월)
alternatives:
- USD with conversion: Adds complexity, unfamiliar to users
- Generic "Small/Medium/Large": Less specific, harder for LLM to interpret
consequences: User-friendly for Korean market, Tech Architect prompt includes Korean context
revisit_when: Expanding to non-Korean markets

## runbook

### vercel-function-timeout
symptom: 504 Gateway Timeout on specification generation
confirm: Check Vercel function logs for duration > 60s
fix:
1. Verify `vercel.json` has `maxDuration: 60` for specification routes
2. Check OpenAI API latency (should be < 45s)
3. If on Vercel Hobby, upgrade to Pro for 60s limit
4. Consider streaming response for long generations
verify: Specification generates within 60s
prevent: Monitor generation times, add timeout handling in tech-architect-agent.ts

### mermaid-diagram-not-rendering
symptom: Blank or error in architecture diagram section
confirm: Check browser console for Mermaid errors
fix:
1. Ensure component has `'use client'` directive
2. Verify `mermaid.initialize({ startOnLoad: false })` in useEffect
3. Check diagram code syntax from LLM output
4. Wrap in try/catch with fallback display of raw code
verify: Diagram renders correctly after page load
prevent: Add Mermaid syntax validation before rendering

### korean-fonts-in-pdf
symptom: Korean text shows as boxes or question marks in exported PDF
confirm: Download PDF and check Korean characters
fix:
1. Add NotoSansKR font to pdfmake vfs
2. Convert font to base64 and import in document-exporter.ts
3. Set `defaultStyle: { font: 'NotoSansKR' }` in docDefinition
verify: PDF shows Korean text correctly
prevent: Include Korean font in initial PDF setup

### regeneration-quota-not-updating
symptom: Regeneration allowed beyond 3 times or quota shows wrong count
confirm: Check `regeneration_quotas` table in Supabase
fix:
1. Verify version check in UPDATE query: `WHERE version = ?`
2. Check for concurrent modification (version mismatch)
3. Ensure used_count increment is atomic
4. Add retry logic for optimistic locking failure
verify: Regeneration blocked after 3 uses, quota displays correctly
prevent: Add unit tests for quota consumption logic

### structured-output-parse-error
symptom: "Invalid JSON" or missing fields in LLM response
confirm: Check tech-architect-agent.ts logs for parse errors
fix:
1. Verify using GPT-4o (not gpt-4o-mini) for structured outputs
2. Check JSON schema has `additionalProperties: false` and all `required` fields
3. Verify `response_format: { type: "json_schema", ... }` in API call
4. Log raw response for debugging
verify: Specification generates with all required fields
prevent: Use strict JSON schema, add response validation

### specification-not-saving
symptom: Generation succeeds but specification not in database
confirm: Check Supabase logs for INSERT errors
fix:
1. Verify foreign key constraints (user_id, idea_id exist)
2. Check version_number constraint (1-4 range)
3. Verify status enum value is valid
4. Check for duplicate version (unique constraint)
verify: Specification appears in `technical_specifications` table
prevent: Add transaction rollback on generation failure

## templates

### tech-architect-prompt
purpose: System prompt for Tech Architect Agent (Agent 3)
location: frontend/src/lib/tech-architect-agent.ts
variables:
- budget_context: Korean Won ranges with recommended tech levels
- team_context: Team size to architecture complexity mapping
- timeline_context: Duration to scope mapping
usage:
```typescript
const systemPrompt = `You are a Tech Architect Agent specializing in Korean startup technical planning.
Your output MUST be in Korean (한국어) for user-facing content.

CONSTRAINTS HANDLING:
- Budget ranges: 1,000만원 미만, 1,000만원~5,000만원, 5,000만원~2억원, 2억원 이상
- Team size: 1-2 (monolithic), 3-5 (modular), 6+ (microservices)
- Timeline: 1-3개월 (MVP only), 3-6개월 (MVP + integrations), 6-12개월 (full features)`;
```

### specification-json-schema
purpose: OpenAI structured output schema for Tech Architect
location: frontend/src/lib/tech-architect-agent.ts
variables:
- prd_schema: PRD document structure
- architecture_schema: Mermaid diagram + components
- roadmap_schema: Phases with milestones
- techstack_schema: Recommendations with rationale
usage: See `research.md` for complete JSON schema definition

### stage-c-viewer-component
purpose: Create new specification document viewer
location: frontend/src/components/stage-c/{Section}Viewer.tsx
variables:
- section_name: PascalCase component name
- content_type: TypeScript content interface
usage:
```typescript
'use client';

import { {ContentType} } from '@/types/stage-c';

interface {Section}ViewerProps {
  content: {ContentType};
}

export function {Section}Viewer({ content }: {Section}ViewerProps) {
  return (
    <div className="space-y-6">
      {/* Section content */}
    </div>
  );
}
```

### stage-c-api-route
purpose: Create new Stage C API route
location: frontend/src/app/api/specifications/{path}/route.ts
variables:
- http_method: GET/POST/PUT/DELETE
- request_type: TypeScript request body type
- response_type: TypeScript response type
usage:
```typescript
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    // Implementation
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
```

### constraint-form-input
purpose: Create new constraint input component
location: frontend/src/components/stage-c/{Input}Input.tsx
variables:
- input_name: Component name
- value_type: Value type (string, number, enum)
usage:
```typescript
'use client';

import { useState } from 'react';

interface {Input}InputProps {
  value: {ValueType};
  onChange: (value: {ValueType}) => void;
  error?: string;
}

export function {Input}Input({ value, onChange, error }: {Input}InputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{Label}</label>
      {/* Input element */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

## tuning

metrics:
- generation_latency: Time from submit to complete (target: <60s P95)
- llm_response_time: OpenAI API call duration (target: <45s)
- pdf_generation_time: Client-side PDF creation (target: <5s)
- mermaid_render_time: Diagram rendering (target: <2s)
- regeneration_rate: % of users who regenerate (target: 30-50%)

levers:
- LLM_MODEL: gpt-4o (quality) vs gpt-4o-mini (speed, no structured outputs)
- max_tokens: 4000-8000 (default: 6000 for full spec)
- temperature: 0.5-0.9 (default: 0.7, lower = more consistent)
- VERCEL_MAX_DURATION: 10-300s (default: 60, Vercel plan dependent)

guardrails:
- generation_latency > 60s → Check Vercel plan, reduce max_tokens
- llm_response_time > 50s → Monitor OpenAI status, add retry logic
- regeneration_rate < 20% → Initial quality good; > 60% → Quality issue
- LLM cost > $100/month → Consider caching, reduce token usage

## invariants

- Version number is 1-4 (1 = initial, 2-4 = regenerations)
- Regeneration quota max is 3 per idea (used_count <= max_count)
- Single payment (₩2,500) covers initial + 3 regenerations
- constraints_snapshot is frozen at generation time (immutable)
- Specification status transitions: generating → completed / failed
- Budget ranges in KRW: UNDER_10M, 10M_TO_50M, 50M_TO_200M, OVER_200M
- Timeline options: 1_TO_3_MONTHS, 3_TO_6_MONTHS, 6_TO_12_MONTHS, OVER_12_MONTHS
- Team composition: junior + middle + senior = total size
- User can only access their own specifications (user_id check)
- All specification versions retained indefinitely for paid users
- Architecture diagram uses Mermaid.js syntax
- Tech stack recommendations include constraintAlignment explaining fit

## task_decomposition

unit: One component or API route per task; can parallel across different files
parallel_boundaries:
- Constraint input components (T009-T013): Different input types
- Viewer components (T024-T028): Different document sections
- API routes (T014, T016, T030): Different endpoints
pr_sequence:
1. Phase 1 (Setup): Dependencies, types, database → Foundation ready
2. Phase 2 (Foundational): Tech Architect Agent, exporters, validators → Core libraries ready
3. Phase 3 (US4): Constraint form → Can accept user input
4. Phase 4 (US1): Generation flow → Core feature working
5. Phase 5 (US2): Document viewers → Full viewing experience
6. Phase 6 (US3): Export → Tangible output
7. Phase 7 (US5): Regeneration → Flexibility feature
8. Phase 8 (US6): Version history → Polish
9. Phase 9 (Polish): Responsive, loading states → Production ready
definition_of_done:
- Component renders without errors
- API route returns expected JSON
- LLM generates valid specification
- Viewer displays all document sections
- Export produces valid PDF/Markdown
- Regeneration quota enforced
- 65 tests passing

## evolution

rules:
- 1 incident → add 1 runbook entry + 1 regression test
- 2 repeated tasks → promote to recipe or template
- 6 months no reference → archive or delete

---

## Summary

| Section | Items |
|---------|-------|
| golden_path | 4 steps |
| recipes | 5 recipes |
| decisions | 6 ADRs |
| runbook | 6 entries |
| templates | 5 templates |
| tuning | 5 metrics, 4 levers, 4 guardrails |
| invariants | 12 rules |
| task_decomposition | 9 PR phases |

**Expected time savings**: 4-6 hours per new developer onboarding, 3-5 hours per similar LLM-powered specification feature.

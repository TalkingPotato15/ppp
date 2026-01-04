# Stage C - Quickstart Guide

**Feature**: Stage C - Technical Execution
**Branch**: `005-stage-c-execution`
**Date**: 2025-01-02

---

## Prerequisites

- Node.js 18+ installed
- Supabase project (from existing setup)
- OpenAI API key
- Vercel account (for deployment)

---

## Local Development Setup

### 1. Clone and Switch Branch

```bash
git checkout 005-stage-c-execution
cd frontend
```

### 2. Install Dependencies

```bash
npm install

# New dependencies for Stage C
npm install mermaid pdfmake jszip file-saver
npm install -D @types/file-saver
```

### 3. Environment Variables

Ensure `.env.local` has these variables (most should exist from previous features):

```env
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (existing)
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o  # Upgrade from gpt-4o-mini for better structured output

# JWT (existing)
JWT_SECRET_KEY=your-secret-key

# Toss Payments (existing)
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
```

### 4. Database Migration

Run the Stage C migration in Supabase SQL Editor:

```sql
-- Copy content from specs/005-stage-c-execution/data-model.md
-- "Migration SQL" section
```

Or run the migration script:

```bash
# From project root
psql $DATABASE_URL -f supabase/migrations/005_stage_c_tables.sql
```

### 5. Start Development Server

```bash
npm run dev
```

App will be available at `http://localhost:3000`

---

## File Structure to Create

```
frontend/src/
├── app/
│   ├── stage-c/
│   │   └── [ideaId]/
│   │       └── page.tsx          # Main Stage C page
│   └── api/
│       └── stage-c/
│           ├── specifications/
│           │   ├── route.ts      # POST: create
│           │   └── [specId]/
│           │       ├── route.ts  # GET: detail
│           │       ├── regenerate/
│           │       │   └── route.ts
│           │       └── export/
│           │           └── route.ts
│           ├── constraints/
│           │   └── validate/
│           │       └── route.ts
│           └── quota/
│               └── [ideaId]/
│                   └── route.ts
├── components/
│   └── stage-c/
│       ├── index.ts              # Barrel export
│       ├── ConstraintsForm.tsx
│       ├── SpecificationViewer.tsx
│       ├── DocumentNav.tsx
│       ├── PRDSection.tsx
│       ├── ArchitectureSection.tsx
│       ├── RoadmapSection.tsx
│       ├── TechStackSection.tsx
│       ├── ExportButton.tsx
│       ├── RegenerationCounter.tsx
│       ├── GenerationProgress.tsx
│       └── VersionHistory.tsx
├── hooks/
│   └── useStageC.ts
├── lib/
│   ├── tech-architect-agent.ts   # NEW
│   └── document-exporter.ts      # NEW
└── types/
    └── stage-c.ts                # NEW
```

---

## Implementation Order

### Phase 1: Types and Agent (Backend Logic)

1. **Create `types/stage-c.ts`**
   - Copy TypeScript types from `data-model.md`

2. **Create `lib/tech-architect-agent.ts`**
   - Follow pattern from `lib/ai-agent.ts`
   - Use GPT-4o with structured outputs
   - System prompt from `research.md`

3. **Create `lib/document-exporter.ts`**
   - pdfmake for PDF generation
   - JSZip for Markdown export

### Phase 2: API Routes

1. **`/api/stage-c/constraints/validate/route.ts`**
   - Validate constraints before generation

2. **`/api/stage-c/specifications/route.ts`**
   - POST: Create initial specification
   - Verify payment, check for existing spec

3. **`/api/stage-c/specifications/[specId]/route.ts`**
   - GET: Retrieve specification detail

4. **`/api/stage-c/specifications/[specId]/regenerate/route.ts`**
   - POST: Regenerate with new constraints
   - Check and consume quota

5. **`/api/stage-c/specifications/[specId]/export/route.ts`**
   - GET: Return PDF or Markdown ZIP

6. **`/api/stage-c/quota/[ideaId]/route.ts`**
   - GET: Check remaining regenerations

### Phase 3: Components

1. **`ConstraintsForm.tsx`**
   - Budget range selector (Korean Won)
   - Team size/composition inputs
   - Timeline selector
   - Tech preferences (optional)

2. **`GenerationProgress.tsx`**
   - Loading spinner
   - Estimated time display

3. **`SpecificationViewer.tsx`**
   - Container with tab navigation

4. **`DocumentNav.tsx`**
   - PRD | 아키텍처 | 로드맵 | 기술스택 tabs

5. **`PRDSection.tsx`**, `ArchitectureSection.tsx`, etc.
   - Individual document displays

6. **`ExportButton.tsx`**
   - PDF/Markdown format selection

7. **`RegenerationCounter.tsx`**
   - "남은 재생성 횟수: 2/3"

### Phase 4: Main Page and Hook

1. **`hooks/useStageC.ts`**
   - State management for specification
   - Generate, regenerate, export functions

2. **`app/stage-c/[ideaId]/page.tsx`**
   - Main page combining all components
   - Flow: constraints → generate → view → export

---

## Testing Checklist

### Manual Testing

- [ ] Constraint form validation works
- [ ] Specification generates within 60 seconds
- [ ] All document sections display correctly
- [ ] Mermaid diagram renders properly
- [ ] PDF export includes all sections
- [ ] Markdown ZIP contains all files
- [ ] Regeneration quota enforced (max 3)
- [ ] Previous versions accessible
- [ ] Payment verification works

### API Testing with curl

```bash
# Create specification
curl -X POST http://localhost:3000/api/stage-c/specifications \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "ideaId": "uuid-here",
    "constraints": {
      "budget": { "range": "10M_TO_50M", "displayText": "1,000만원~5,000만원" },
      "team": { "size": 3, "composition": { "junior": 1, "middle": 1, "senior": 1 } },
      "timeline": "3_TO_6_MONTHS"
    }
  }'

# Get specification
curl http://localhost:3000/api/stage-c/specifications/SPEC_ID \
  -H "Cookie: access_token=YOUR_TOKEN"

# Check quota
curl http://localhost:3000/api/stage-c/quota/IDEA_ID \
  -H "Cookie: access_token=YOUR_TOKEN"

# Regenerate
curl -X POST http://localhost:3000/api/stage-c/specifications/SPEC_ID/regenerate \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{ "constraints": { ... } }'

# Export PDF
curl http://localhost:3000/api/stage-c/specifications/SPEC_ID/export?format=pdf \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -o specification.pdf
```

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "feat(005): Add Stage C Technical Execution"
git push origin 005-stage-c-execution
```

### 2. Create PR to `dev`

```bash
gh pr create --base dev --title "feat(005): Stage C Technical Execution"
```

### 3. Vercel Configuration

Ensure `vercel.json` has appropriate function settings:

```json
{
  "functions": {
    "app/api/stage-c/specifications/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "app/api/stage-c/specifications/[specId]/regenerate/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### 4. Environment Variables in Vercel

Add/verify these in Vercel Dashboard:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`
- (other existing variables)

---

## Troubleshooting

### "Function timeout" on Vercel

- Upgrade to Vercel Pro for 60-second timeout
- Verify `maxDuration: 60` in vercel.json
- Consider streaming response for long generations

### Mermaid diagram not rendering

```typescript
// Ensure client-side rendering
'use client';

// Initialize mermaid on mount
useEffect(() => {
  mermaid.initialize({ startOnLoad: false });
}, []);
```

### Korean fonts in PDF

```typescript
// Add NotoSansKR font to pdfmake
// Download from Google Fonts, convert to base64
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;
// Add Korean font to vfs...
```

### Regeneration quota not updating

- Check optimistic locking version in database
- Ensure version check in UPDATE query
- Retry on concurrent modification

---

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [research.md](./research.md) - Technical research
- [data-model.md](./data-model.md) - Database schema
- [contracts/stage-c-api.yaml](./contracts/stage-c-api.yaml) - API specification

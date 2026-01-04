# Stage C Technical Execution - Research Report

**Feature**: Stage C - Technical Execution
**Branch**: `005-stage-c-execution`
**Date**: 2025-01-02

---

## 1. Tech Architect Agent Prompt Engineering

### Decision: GPT-4o with Structured Outputs (`response_format` with `json_schema` and `strict: true`)

### Rationale

OpenAI's Structured Outputs feature with GPT-4o achieves **100% reliability** in matching JSON schemas, compared to less than 40% for older models. This guarantees that the Tech Architect Agent outputs will conform exactly to our defined schema for PRD, architecture diagrams, MVP roadmap, and tech stack recommendations.

### Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| JSON mode (legacy) | Only guarantees valid JSON, not schema adherence |
| Function calling | More suited for tool use; response_format is cleaner for document generation |
| Prompt-only JSON enforcement | Unreliable; can produce malformed JSON or missing fields |

### Implementation Notes

**System Prompt Structure:**
```typescript
const systemPrompt = `You are a Tech Architect Agent specializing in Korean startup technical planning.
Your output MUST be in Korean (한국어) for user-facing content.
You will analyze user constraints and business ideas to generate developer-ready specifications.

CONSTRAINTS HANDLING:
- Budget ranges are in Korean Won (KRW):
  - 1,000만원 미만 (< ₩10M): Focus on free/open-source, serverless, minimal infrastructure
  - 1,000만원~5,000만원 (₩10M-50M): Can include managed services, basic paid tools
  - 5,000만원~2억원 (₩50M-200M): Can include enterprise tools, dedicated infrastructure
  - 2억원 이상 (> ₩200M): Full enterprise stack options available

- Team size affects complexity:
  - 1-2 developers: Prefer monolithic, simpler architecture
  - 3-5 developers: Can handle microservices-lite, modular monolith
  - 6+ developers: Can manage full microservices

- Timeline affects scope:
  - 1-3개월: Focus on core MVP only
  - 3-6개월: MVP + essential integrations
  - 6-12개월: Full feature set
  - 12개월 이상: Enterprise-grade with scalability

Generate recommendations that DIRECTLY address these constraints with explicit rationale.`;
```

**JSON Schema Definition:**
```typescript
const specificationSchema = {
  type: "object",
  properties: {
    prd: {
      type: "object",
      properties: {
        title: { type: "string" },
        overview: { type: "string" },
        requirements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
              description: { type: "string" },
              acceptanceCriteria: { type: "array", items: { type: "string" } }
            },
            required: ["id", "priority", "description", "acceptanceCriteria"],
            additionalProperties: false
          }
        },
        userStories: { type: "array", items: { type: "string" } },
        scope: {
          type: "object",
          properties: {
            included: { type: "array", items: { type: "string" } },
            excluded: { type: "array", items: { type: "string" } }
          },
          required: ["included", "excluded"],
          additionalProperties: false
        }
      },
      required: ["title", "overview", "requirements", "userStories", "scope"],
      additionalProperties: false
    },
    architecture: {
      type: "object",
      properties: {
        diagramCode: { type: "string", description: "Mermaid.js diagram code" },
        components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              technology: { type: "string" },
              responsibilities: { type: "array", items: { type: "string" } }
            },
            required: ["name", "description", "technology", "responsibilities"],
            additionalProperties: false
          }
        },
        integrations: { type: "array", items: { type: "string" } }
      },
      required: ["diagramCode", "components", "integrations"],
      additionalProperties: false
    },
    roadmap: {
      type: "object",
      properties: {
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              duration: { type: "string" },
              milestones: { type: "array", items: { type: "string" } },
              deliverables: { type: "array", items: { type: "string" } },
              dependencies: { type: "array", items: { type: "string" } }
            },
            required: ["name", "duration", "milestones", "deliverables"],
            additionalProperties: false
          }
        },
        totalDuration: { type: "string" }
      },
      required: ["phases", "totalDuration"],
      additionalProperties: false
    },
    techStack: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["frontend", "backend", "database", "infrastructure", "monitoring", "ci_cd"] },
          recommended: { type: "string" },
          alternatives: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
          estimatedCost: { type: "string" },
          constraintAlignment: {
            type: "object",
            properties: {
              budget: { type: "string" },
              team: { type: "string" },
              timeline: { type: "string" }
            },
            required: ["budget", "team", "timeline"],
            additionalProperties: false
          }
        },
        required: ["category", "recommended", "alternatives", "rationale", "estimatedCost", "constraintAlignment"],
        additionalProperties: false
      }
    }
  },
  required: ["prd", "architecture", "roadmap", "techStack"],
  additionalProperties: false
};
```

---

## 2. PDF Generation in Vercel Serverless

### Decision: **pdfmake** with client-side generation

### Rationale

Given Vercel's constraints (60-second timeout, 50MB deployment size limit), heavy libraries like Puppeteer are impractical.

| Library | Bundle Size | Best For | Serverless Suitability |
|---------|-------------|----------|------------------------|
| **jsPDF** | ~150KB | Simple documents | Excellent |
| **pdfmake** | ~400KB (includes fonts) | Complex layouts, tables | Good |
| **@react-pdf/renderer** | 1.5MB+ | React component PDFs | Poor (too large) |
| **Puppeteer** | 50MB+ | HTML-to-PDF | Not viable |

### Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| @react-pdf/renderer | 1.5MB+ bundle causes errors on Vercel |
| Puppeteer/Playwright | Requires headless browser; exceeds 50MB limit |
| External PDF service | Adds dependency, cost, latency |

### Implementation Notes

```typescript
// lib/document-exporter.ts
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export async function generateSpecificationPDF(spec: TechnicalSpecification): Promise<Blob> {
  const docDefinition = {
    content: [
      { text: spec.prd.title, style: 'header' },
      { text: '제품 요구사항 명세서 (PRD)', style: 'subheader' },
      { text: spec.prd.overview, margin: [0, 10, 0, 10] },

      // Requirements table
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*'],
          body: [
            ['ID', '우선순위', '설명', '수락 기준'],
            ...spec.prd.requirements.map(req => [
              req.id, req.priority, req.description, req.acceptanceCriteria.join('\n')
            ])
          ]
        }
      },

      // Architecture diagram as image
      { text: '시스템 아키텍처', style: 'subheader', pageBreak: 'before' },
      { image: spec.architecture.diagramImage, width: 500 },
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 16, bold: true, margin: [0, 20, 0, 5] }
    },
    defaultStyle: { font: 'NotoSansKR' }
  };

  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob(resolve);
  });
}
```

---

## 3. Markdown ZIP Export

### Decision: **JSZip** for client-side ZIP generation

### Rationale

JSZip is a mature library (8,500+ GitHub stars) that works reliably in browsers. Client-side generation avoids Vercel serverless timeout concerns.

### ZIP Structure

```
specification-{ideaId}-v{version}.zip
├── README.md
├── prd.md
├── architecture.md
├── roadmap.md
├── techstack.md
└── diagrams/
    └── architecture.svg
```

### Implementation Notes

```typescript
// lib/document-exporter.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function generateSpecificationZIP(
  spec: TechnicalSpecification,
  ideaId: string,
  version: number
): Promise<void> {
  const zip = new JSZip();

  zip.file('README.md', generateReadme(spec));
  zip.file('prd.md', generatePRDMarkdown(spec.prd));
  zip.file('architecture.md', generateArchitectureMarkdown(spec.architecture));
  zip.file('roadmap.md', generateRoadmapMarkdown(spec.roadmap));
  zip.file('techstack.md', generateTechStackMarkdown(spec.techStack));

  const diagramsFolder = zip.folder('diagrams');
  if (spec.architecture.diagramSvg) {
    diagramsFolder?.file('architecture.svg', spec.architecture.diagramSvg);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `specification-${ideaId}-v${version}.zip`);
}
```

---

## 4. Architecture Diagram Rendering

### Decision: **Mermaid.js** for live rendering with LLM-generated diagram code

### Rationale

Mermaid.js is the de facto standard for text-based diagram generation. LLMs (especially GPT-4o) are well-trained on Mermaid syntax and can reliably generate valid diagram code.

### Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| PlantUML | Requires Java backend |
| Graphviz/DOT | Less LLM training data |
| Draw.io/Excalidraw | Complex; requires custom rendering |

### Implementation Notes

**React Component:**
```typescript
// components/stage-c/ArchitectureSection.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export function ArchitectureSection({ diagramCode, onSvgGenerated }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      fontFamily: 'Noto Sans KR, sans-serif'
    });

    const renderDiagram = async () => {
      if (!containerRef.current) return;
      const { svg } = await mermaid.render('architecture-diagram', diagramCode);
      containerRef.current.innerHTML = svg;
      onSvgGenerated?.(svg);
    };

    renderDiagram();
  }, [diagramCode, onSvgGenerated]);

  return <div ref={containerRef} className="mermaid-container" />;
}
```

**SVG to PNG Conversion:**
```typescript
export async function convertSvgToPng(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx!.fillStyle = 'white';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
}
```

---

## 5. Regeneration Quota Management

### Decision: **Optimistic Locking with Version Numbers** in PostgreSQL

### Rationale

The regeneration quota (3 per paid idea) is a critical business constraint. Optimistic locking ensures:
1. Data consistency without performance-heavy pessimistic locks
2. Atomic quota decrements even under concurrent requests
3. Simple implementation with PostgreSQL's native features

### Database Schema

```sql
-- supabase/schema.sql

CREATE TABLE regeneration_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 3,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_idea UNIQUE (user_id, idea_id),
  CONSTRAINT valid_count CHECK (used_count >= 0 AND used_count <= max_count)
);

CREATE TABLE technical_specifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  constraints_snapshot JSONB NOT NULL,
  prd_content JSONB NOT NULL,
  architecture_content JSONB NOT NULL,
  roadmap_content JSONB NOT NULL,
  techstack_content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_version UNIQUE (idea_id, version_number),
  CONSTRAINT valid_version CHECK (version_number >= 1 AND version_number <= 4)
);
```

### Implementation Notes

```typescript
// lib/regeneration-quota.ts
export async function consumeRegenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string
): Promise<QuotaResult> {
  const { data: quota } = await supabase
    .from('regeneration_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('idea_id', ideaId)
    .single();

  if (!quota) {
    // First generation - create quota record
    await supabase.from('regeneration_quotas').insert({
      user_id: userId,
      idea_id: ideaId,
      used_count: 0,
      max_count: 3,
      version: 1
    });
    return { success: true, remainingCount: 3 };
  }

  if (quota.used_count >= quota.max_count) {
    return { success: false, remainingCount: 0, error: '재생성 횟수를 모두 사용했습니다 (3/3)' };
  }

  // Optimistic update with version check
  const { data: updated } = await supabase
    .from('regeneration_quotas')
    .update({
      used_count: quota.used_count + 1,
      version: quota.version + 1
    })
    .eq('id', quota.id)
    .eq('version', quota.version)
    .select()
    .single();

  if (!updated) {
    return { success: false, remainingCount: quota.max_count - quota.used_count, error: '동시 요청이 감지되었습니다. 다시 시도해주세요.' };
  }

  return { success: true, remainingCount: quota.max_count - updated.used_count };
}
```

---

## Summary of Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| **Tech Architect Prompts** | GPT-4o with Structured Outputs | 100% JSON schema compliance |
| **PDF Generation** | pdfmake (client-side) | JSON-declarative, Korean fonts |
| **Markdown Export** | JSZip (client-side) | Simple API, avoids serverless timeout |
| **Architecture Diagrams** | Mermaid.js + Canvas SVG-to-PNG | LLM-friendly, browser-native |
| **Regeneration Quotas** | PostgreSQL optimistic locking | Simple, atomic, no external deps |

---

## Next Steps

This research completes **Phase 0**. Next phases:

1. **Phase 1 - Design**: Create `data-model.md` and `contracts/stage-c-api.yaml`
2. **Phase 2 - Tasks**: Generate `tasks.md` with `/speckit.tasks`

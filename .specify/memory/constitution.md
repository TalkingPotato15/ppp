<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial creation)
Modified principles: N/A (new constitution)
Added sections:
  - Core Principles (5 principles)
  - Technical Standards
  - Quality Gates
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (no updates required - compatible)
  - .specify/templates/spec-template.md ✅ (no updates required - compatible)
  - .specify/templates/tasks-template.md ✅ (no updates required - compatible)
Follow-up TODOs: None
-->

# AI Agent Business Builder Constitution

## Core Principles

### I. Data-First

All business insights and recommendations MUST originate from real, collected market data—not assumptions or hallucinations.

**Rules**:
- Every market problem card MUST have a traceable source URL
- Agent 1 (Data Analyst) MUST filter out 80%+ noise (ads, spam, irrelevant content)
- RAG retrieval MUST be used over pure LLM generation for market-related responses
- Hallucination rate MUST remain below 5% as measured by citation verification

**Rationale**: Developers trust this system because it provides validated market signals, not hypotheticals. Losing data integrity destroys the core value proposition.

### II. Multi-Agent Specialization

Each agent MUST have a single, well-defined responsibility within the pipeline.

**Rules**:
- Agent 1 (Data Analyst): Collects and cleans market data ONLY
- Agent 2 (Strategic Planner): Generates business ideas from problems ONLY
- Agent 3 (Tech Architect): Creates technical implementation plans ONLY
- Agents MUST NOT overlap in responsibilities or bypass the pipeline stages
- Each agent output MUST be a structured, documented artifact

**Rationale**: Clear boundaries enable independent testing, scaling, and replacement of individual agents without system-wide disruption.

### III. RAG-Driven Accuracy

All context-dependent responses MUST use Retrieval-Augmented Generation with source attribution.

**Rules**:
- Vector DB MUST store full context with embeddings for RAG retrieval
- RDB MUST store UI-ready summaries (titles, keywords) for display
- Every RAG-generated response MUST include source citations
- Context retrieval MUST precede generation for all market and business recommendations

**Rationale**: RAG grounds LLM outputs in real data, preventing fabricated insights that would undermine user trust and business viability.

### IV. Budget-Aware Design

All technical recommendations MUST respect user-specified constraints.

**Rules**:
- Agent 3 MUST accept budget, team size, and tech stack preferences as input
- Architecture recommendations MUST scale appropriately:
  - Low budget → Serverless, Flutter, Firebase
  - Medium budget → Microservices, React, PostgreSQL
- Technical specs MUST allow cost estimation without additional clarification
- Designs MUST NOT recommend technologies exceeding stated constraints

**Rationale**: Users come with real-world limitations. Ignoring constraints produces unusable recommendations and wastes the $1.99 payment.

### V. Staged Monetization

The user journey MUST progress through free discovery to paid conversion with clear value gates.

**Rules**:
- Stage A (Discovery): MUST be free—browse problem cards without barriers
- Stage B (Ideation): Unlocks after problem selection; costs $0.99
- Stage C (Execution): Unlocks after idea selection; costs $1.99
- Each paid stage MUST deliver tangible, documented artifacts
- Conversion target: 5%+ users from Stage B → Stage C

**Rationale**: Free discovery reduces acquisition friction. Paid gates align revenue with demonstrated value delivery.

## Technical Standards

### Data Layer Requirements

**Document Pipeline (Pre-Stage → Stage A)**:
1. Raw data collected from sources
2. Agent 1 transforms raw data into AI-friendly structured documents
3. Title and keywords extracted from each document for user display
4. Documents stored with relationship metadata for context retrieval

**Document Relationships**:
- Each document MUST reference related documents (similar problems, shared domain, trend correlation)
- Relationships enable RAG to retrieve contextually connected information
- User can discover related problems through document connections

**Storage**:
- Vector DB stores full AI-friendly documents with embeddings
- Each document contains: content, title, keywords, trend, sentiment, source_url, related document references, domain tag

**Freshness**: Data collection runs continuously in pre-stage

### Agent Output Contracts
- Agent 1 → AI-friendly documents with extracted metadata (title, keywords) and relationship links
- Agent 2 → 3-5 business idea cards with: value proposition, revenue model, risks, market fit score
- Agent 3 → PRD, architecture diagram, MVP roadmap, tech stack rationale

### Testing Standards
- Agent 1: 80%+ noise filtering accuracy
- Agent 2: User rating 4+/5 for idea completeness
- Agent 3: Specs enable cost estimation without follow-up questions
- RAG: <5% hallucination rate

## Quality Gates

### PoC Constraints
- **Domain**: Real estate/housing ONLY for initial validation
- **Data Source**: Single community forum
- **User Group**: 10 target users for testing

### Success Metrics (PoC Exit Criteria)
1. Data quality: 80%+ noise filtering accuracy
2. Idea quality: 4+/5 average user rating
3. Tech viability: Cost-estimable specs
4. Conversion: 5%+ Stage B → Stage C
5. Accuracy: <5% hallucination rate

## Governance

### Amendment Procedure
1. Propose changes with rationale in writing
2. Document impact on existing agents and data contracts
3. Update all affected design documents and templates
4. Version bump according to semantic versioning rules

### Versioning Policy
- **MAJOR**: Backward-incompatible principle changes or agent redesigns
- **MINOR**: New principle additions or expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance Review
- All PRs MUST verify alignment with Core Principles
- Agent modifications MUST pass defined testing standards
- Architecture changes MUST respect Budget-Aware Design constraints

**Version**: 1.0.0 | **Ratified**: 2025-12-28 | **Last Amended**: 2025-12-28
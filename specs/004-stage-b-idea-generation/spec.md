# Feature Specification: Stage B - Idea Generation

**Feature Branch**: `004-stage-b-idea-generation`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Stage B development with AI agent for idea generation. Idea generation happens only once per problem - no regeneration feature."

## Overview

Stage B is the core value-creation stage of the AI Agent Business Builder service. After users select a market problem in Stage A (Discovery), they proceed to Stage B where **Agent 2 (Strategic Planner)** generates business ideas targeting that problem. This feature includes the AI agent implementation, UI, and backend integration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Idea Generation Request (Priority: P1)

Authenticated users who selected a problem in Stage A can request the AI agent to generate business ideas. The system displays a loading state while the AI processes the request, then shows the generated ideas.

**Why this priority**: Core functionality of Stage B. Without idea generation, users cannot derive value from the problem they selected. This is the primary conversion point where free browsing turns into actionable business insights.

**Independent Test**: Log in, select a problem from Stage A, and verify that clicking "Generate Ideas" triggers the AI agent and displays results.

**Acceptance Scenarios**:

1. **Given** authenticated user has selected a problem from Stage A, **When** they land on Stage B page, **Then** the selected problem summary is displayed with a "Generate Ideas" button
2. **Given** user is on Stage B with selected problem, **When** they click "Generate Ideas" button, **Then** loading indicator appears and generation request is sent to AI agent API
3. **Given** AI agent is processing the request, **When** processing completes successfully, **Then** generated ideas are displayed in a readable format
4. **Given** AI agent returns multiple ideas, **When** ideas are displayed, **Then** each idea shows title, description, target audience, and key differentiators

---

### User Story 2 - Idea Viewing and Exploration (Priority: P1)

Users can view generated ideas in detail, expand individual ideas for more information, and navigate between multiple generated ideas.

**Why this priority**: Essential for users to understand and evaluate the AI-generated ideas. Without proper viewing, the generated content has no practical value.

**Independent Test**: Generate ideas and verify that each idea can be expanded to show full details.

**Acceptance Scenarios**:

1. **Given** ideas have been generated, **When** user views the idea list, **Then** each idea is displayed as a card with title and brief summary
2. **Given** idea cards are displayed, **When** user clicks on an idea card, **Then** expanded view shows full details including description, target audience, market opportunity, and implementation hints
3. **Given** multiple ideas are generated, **When** user navigates between ideas, **Then** they can easily browse all generated ideas

---

### User Story 3 - Bookmark Favorite Ideas (Priority: P2)

All generated ideas are automatically saved since users paid for them. Users can bookmark/star their favorite ideas for quick access.

**Why this priority**: Enhances user experience by allowing users to highlight their most valuable ideas from their collection. Not essential for MVP but improves usability.

**Independent Test**: Generate ideas, bookmark one, then verify it appears with bookmark indicator in the ideas list.

**Acceptance Scenarios**:

1. **Given** ideas have been generated, **When** user views "My Ideas" page, **Then** all generated ideas are listed with problem context (automatically saved)
2. **Given** ideas are displayed, **When** user clicks bookmark/star icon on an idea, **Then** the idea is marked as bookmarked
3. **Given** user has bookmarked ideas, **When** they filter by bookmarked, **Then** only bookmarked ideas are shown

---

### User Story 4 - Generation History (Priority: P3)

Users can view their past idea generation sessions, allowing them to revisit previously generated ideas for different problems.

**Why this priority**: Nice-to-have feature for user convenience. Can be deferred to later iterations.

**Independent Test**: Generate ideas for multiple problems, then verify history shows all sessions.

**Acceptance Scenarios**:

1. **Given** user has generated ideas for multiple problems, **When** they access generation history, **Then** list of past sessions is displayed with problem titles and dates
2. **Given** history list is displayed, **When** user clicks on a past session, **Then** the generated ideas from that session are shown

---

### Edge Cases

- What happens when AI agent API is unavailable or times out?
- How to handle when AI agent returns empty or invalid response?
- What happens when user navigates away during generation?
- How to handle concurrent generation requests from same user?
- What happens when user's session expires during generation?
- How to handle when selected problem data is no longer available?

## Requirements *(mandatory)*

### Functional Requirements

**Idea Generation**
- **FR-001**: System MUST accept problem context from Stage A and pass it to AI agent API
- **FR-002**: System MUST display loading state while AI agent processes the request
- **FR-003**: System MUST display generated ideas in structured format (title, description, target audience, differentiators)
- **FR-004**: System MUST support generating 3-5 ideas per request
- **FR-005**: System MUST handle AI agent API errors gracefully with user-friendly messages
- **FR-006**: System MUST automatically save generated ideas to user's account (paid service - ideas persist indefinitely)

**Idea Viewing**
- **FR-007**: System MUST display idea list with expandable cards
- **FR-008**: System MUST show full idea details on expansion (description, target audience, market opportunity, implementation hints)
- **FR-009**: System MUST allow users to navigate between multiple generated ideas

**Bookmarking Ideas**
- **FR-010**: Users MUST be able to bookmark/star favorite ideas from their saved ideas
- **FR-011**: System MUST provide access to all generated ideas via "My Ideas" page
- **FR-012**: System MUST allow filtering by bookmarked status

**Access Control**
- **FR-013**: Stage B MUST be accessible only to authenticated users
- **FR-014**: System MUST redirect unauthenticated users to login
- **FR-015**: System MUST preserve selected problem context after login redirect

**History**
- **FR-016**: System MUST record idea generation sessions for each user
- **FR-017**: System MUST allow users to view past generation sessions

### Key Entities

- **GenerationSession**: A single idea generation request (session ID, user ID, problem ID, timestamp, status, rag_context)
- **GeneratedIdea**: An individual idea from AI agent (idea ID, session ID, title, description, target audience, differentiators, market opportunity, implementation hints, market_signals, confidence_score, is_bookmarked, created_at)
- **Problem**: Reference to problem selected from Stage A (from 001-data-pipeline)
- **RAGContext**: Retrieved documents used for generation (document IDs, similarity scores, extracted content)

## AI Agent Specification *(mandatory)*

### Agent 2: Strategic Planner

**Role**: Generate actionable business ideas based on market problems identified in Stage A.

**Responsibility**: Per constitution (Principle II - Multi-Agent Specialization), Agent 2 generates business ideas from problems ONLY. It does not collect data (Agent 1's job) or create technical plans (Agent 3's job).

### Agent Input

The AI agent receives problem context from Stage A:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| problem_title | string | Title of the market problem | "Rising demand for pet-friendly housing" |
| keywords | string[] | Extracted keywords | ["pet", "housing", "rental", "policy"] |
| domain | string | Domain/industry tag | "real-estate" |
| trend | enum | Trend indicator | RISING, STABLE, DECLINING |
| sentiment | enum | Community sentiment | POSITIVE, NEUTRAL, NEGATIVE |
| source_content | string | Original problem description (optional) | Full text from Stage A |

### Agent Output

The AI agent returns 3-5 structured business ideas:

| Field | Type | Description |
|-------|------|-------------|
| title | string | Concise idea title (max 100 chars) |
| description | string | Detailed description of the business idea (200-500 words) |
| target_audience | string | Who this idea serves and why |
| differentiators | string[] | 3-5 key differentiators from existing solutions |
| market_opportunity | string | Market size, growth potential, timing rationale |
| implementation_hints | string | High-level approach without technical details |
| market_signals | string[] | References to specific data from RAG context (e.g., "Based on rising demand in pet-friendly housing trend...") |
| confidence_score | float | 0.0-1.0 score based on how well idea is grounded in data |

### Agent Behavior

**Generation Rules**:
- MUST generate exactly 3-5 ideas per request
- MUST ground ideas in the provided problem context (Data-First principle)
- MUST NOT hallucinate market data or statistics
- MUST provide diverse ideas (not variations of the same concept)
- MUST consider the trend and sentiment when proposing ideas
- SHOULD prioritize ideas with clear monetization paths

**Quality Standards** (per constitution):
- User rating target: 4+/5 for idea completeness
- Ideas MUST be actionable (not vague suggestions)
- Each idea MUST have a clear value proposition

### Agent Implementation

**Technology**: LLM-based generation with structured output

**Prompt Strategy**:
1. System prompt defines the Strategic Planner role and output format
2. User prompt includes problem context from Stage A + RAG context
3. Output is parsed into structured GeneratedIdea objects

### RAG Integration *(mandatory per constitution Principle III)*

RAG (Retrieval-Augmented Generation) grounds the AI agent's ideas in real market data from Stage A, ensuring concrete and meaningful insights rather than generic suggestions.

**Data Sources for RAG**:

| Source | Storage | Content | Usage |
|--------|---------|---------|-------|
| Problem Documents | ChromaDB (Vector) | Full problem content with embeddings | Semantic similarity search |
| Document Summaries | SQLite/PostgreSQL | Title, keywords, domain, trend, sentiment | Metadata filtering |
| Related Problems | Document relationships | Similar problems in same domain | Context enrichment |

**RAG Pipeline**:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Selected       │────▶│  Embed Query    │────▶│  Vector Search  │
│  Problem        │     │  (title+keywords)│     │  (ChromaDB)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Generate       │◀────│  Build Context  │◀────│  Retrieve Top-K │
│  Ideas (LLM)    │     │  Prompt         │     │  Similar Docs   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**RAG Retrieval Strategy**:

1. **Query Formulation**: Combine problem title + keywords into query
2. **Semantic Search**: Find top 5-10 similar problems from ChromaDB
3. **Domain Filtering**: Prioritize documents in same domain_tag
4. **Trend Weighting**: Boost RISING trend documents for opportunity insights
5. **Context Assembly**: Include retrieved documents as grounding context

**Retrieved Context Format**:

```
## Related Market Problems (for context)

### Problem 1: [Title]
- Domain: [domain_tag]
- Trend: [RISING/STABLE/DECLINING]
- Sentiment: [POSITIVE/NEUTRAL/NEGATIVE]
- Key Points: [extracted from content]
- Source: [source_url]

### Problem 2: [Title]
...
```

**RAG-Enhanced Prompt Structure**:

```
[System Prompt]
You are Agent 2 (Strategic Planner). Generate business ideas grounded in
real market data. Use the provided context to ensure ideas are:
- Addressing real, validated problems
- Aligned with current market trends
- Differentiated from existing solutions mentioned in context

[User Prompt]
## Target Problem
Title: {problem_title}
Keywords: {keywords}
Domain: {domain}
Trend: {trend}
Sentiment: {sentiment}

## Related Market Context (from RAG)
{retrieved_documents}

## Your Task
Generate 3-5 business ideas that address this problem. Ground your ideas
in the market context provided. Each idea must reference relevant market
signals from the context.
```

**RAG Quality Requirements**:

- **RQ-001**: Agent MUST retrieve at least 3 related documents before generation
- **RQ-002**: Retrieved documents MUST have similarity score > 0.7 (cosine)
- **RQ-003**: Agent MUST cite specific market signals from retrieved context
- **RQ-004**: Ideas MUST reference real problems/trends from the data
- **RQ-005**: Hallucination rate MUST remain below 5% (verified by source check)

### Agent Functional Requirements

- **FR-AI-001**: Agent MUST accept problem context as structured input
- **FR-AI-002**: Agent MUST return ideas in the defined output format
- **FR-AI-003**: Agent MUST complete generation within 20 seconds
- **FR-AI-004**: Agent MUST handle malformed input gracefully with error response
- **FR-AI-005**: Agent MUST generate diverse ideas (no duplicate concepts)
- **FR-AI-006**: Agent output MUST be deterministic enough for testing (seeded randomness)

## Success Criteria *(mandatory)*

### Measurable Outcomes

**User Experience**
- **SC-001**: 80% or more of users who start idea generation receive results successfully
- **SC-002**: Idea generation completes within 30 seconds for 95% of requests
- **SC-003**: 60% or more of users view at least 2 generated ideas in detail
- **SC-004**: 30% or more of users bookmark at least 1 idea as favorite
- **SC-005**: System handles 500 concurrent generation requests
- **SC-006**: Average user rates generated ideas as "useful" or better (3+ on 5-point scale) for 70% of sessions

**AI Agent Quality** (per constitution)
- **SC-AI-001**: Agent 2 idea quality rating averages 4+/5 for completeness
- **SC-AI-002**: Hallucination rate remains below 5% (ideas grounded in problem context)
- **SC-AI-003**: Generated ideas are diverse (no more than 2 ideas in same category per session)
- **SC-AI-004**: Each idea includes all required output fields with meaningful content

**RAG Effectiveness**
- **SC-RAG-001**: 95% of generations retrieve at least 3 relevant documents from vector store
- **SC-RAG-002**: Average similarity score of retrieved documents is > 0.75
- **SC-RAG-003**: 80% of generated ideas include at least 2 market_signals references
- **SC-RAG-004**: Users rate ideas as "more relevant" when RAG context is used vs. generic generation
- **SC-RAG-005**: Confidence scores correlate with user satisfaction (>0.8 score = >4/5 rating)

## Assumptions

- OpenAI API (or compatible LLM API) is available with valid API key
- Agent 2 uses GPT-4 or equivalent model for high-quality idea generation
- LLM response time is typically under 20 seconds per generation
- Each generation request produces 3-5 ideas
- Users must complete Stage A (problem selection) before accessing Stage B
- Users must pay before accessing Stage B idea generation (via 002-payment-system)
- Problem data from Stage A is passed via URL parameter or session storage
- Generated ideas are automatically saved and persist indefinitely (paid content)
- Users can only generate ideas once per problem (no regeneration)
- Generation history is retained indefinitely for paid users
- LLM costs are acceptable (~$0.10-0.30 per generation with GPT-4)

## Dependencies

- **003-discovery-ui-auth**: User authentication and problem selection from Stage A
- **002-payment-system**: Payment required before idea generation
- **001-data-pipeline**: Problem data structure, content, and vector embeddings in ChromaDB
- **OpenAI API**: LLM provider for Agent 2 idea generation (GPT-4 or equivalent)
- **ChromaDB**: Vector store containing problem documents with embeddings for RAG retrieval

## Out of Scope

- Idea regeneration (users get one set of ideas per problem - this is intentional to ensure commitment)
- Idea sharing between users
- Idea export functionality (PDF, etc.)
- Collaborative idea refinement
- Integration with Stage C (Solution Design)
- Analytics dashboard for generation quality
- Agent fine-tuning or custom model training (uses pre-trained LLM)

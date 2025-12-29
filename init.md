# AI Agent Business Builder - Project Init

## What This Project Does

A multi-agent AI system that helps developers build startups by:
1. **Finding real market problems** (from actual data, not guesses)
2. **Generating viable business ideas** (validated against market trends)
3. **Creating technical implementation plans** (architecture + dev specs)

**Target domains**: Investment, Education, Real Estate (high-value markets)

---

## Core Problem We're Solving

**Developer pain point**: "I can code, but I don't know what to build that people will actually pay for."

**Our solution**: AI agents do the market research, ideation, and technical planning for you.

---

## System Architecture

### Three AI Agents (One Per Stage)

```
Agent 1: Data Analyst     → Cleans & structures market data
Agent 2: Strategic Planner → Generates business ideas from problems
Agent 3: Tech Architect    → Converts ideas into dev-ready specs
```

### Four-Stage User Flow

```
PRE-STAGE (Background)
└─ Agent 1 continuously collects & refines market data
   ├─ Filters noise (ads, spam)
   ├─ Extracts: titles, keywords, trends, sentiment
   └─ Stores in dual database (Vector DB + RDB)

STAGE A: Discovery (User starts here)
└─ User browses market problems as cards
   └─ Each card = Title + Keywords from analyzed data

STAGE B: Ideation (User picks a problem)
└─ Agent 2 generates 3-5 business ideas
   ├─ Uses RAG (retrieves context from Vector DB)
   ├─ Each idea includes: revenue model, risks, value prop
   └─ User picks one → Pays $0.99

STAGE C: Execution (Technical design)
└─ Agent 3 creates implementation plan
   ├─ Input: chosen idea + budget + tech preferences
   ├─ Output: PRD, architecture diagram, MVP roadmap
   └─ User pays $1.99 for document package
```

---

## Tech Stack

### Data Layer
- **Vector DB**: Stores full context for RAG (embeddings)
- **RDB**: Stores UI-ready summaries (titles, keywords)

### Processing Layer
- **LLM**: Multi-agent orchestration
- **RAG**: Context retrieval for informed responses
- **Web Scraping**: Automated data collection

### Service Layer
- **API Gateway**: Request routing
- **Auth**: User management
- **Payment**: Stripe/similar

### Client Layer
- **Web/App**: Dashboard with card-based UI

---

## Agent Details

### Agent 1: Data Analyst (Pre-Stage)
**Role**: Turn raw web data into clean, structured insights

**Tasks**:
- Scrape target domains (forums, news, communities)
- Filter noise (ads, spam, irrelevant content)
- Extract structured data: `{title, keywords, trend, sentiment, source_url}`
- Store dual format:
  - RDB: User-facing summaries
  - Vector DB: Full context for RAG

**Output**: Database of validated market problems

---

### Agent 2: Strategic Planner (Stage B)
**Role**: Generate business ideas from market problems

**Input**: 
- User-selected problem card
- RAG context from Vector DB

**Process**:
1. Retrieve relevant market data via RAG
2. Validate market opportunity (demand signals, competition)
3. Generate 3-5 solution concepts

**Output**: Business idea cards with:
- Core value proposition
- Revenue model
- Key risks
- Market fit score

**Monetization**: $0.99 per ideation session

---

### Agent 3: Tech Architect (Stage C)
**Role**: Convert business idea into technical implementation plan

**Input**:
- Selected business idea
- User constraints: budget, team size, tech stack preferences

**Process**:
1. Design cost-appropriate architecture
   - Low budget → Serverless, Flutter, Firebase
   - Medium budget → Microservices, React, PostgreSQL
2. Generate implementation roadmap
3. Create developer-ready documentation

**Output**:
- PRD (Product Requirements Document)
- System architecture diagram
- MVP development roadmap
- Tech stack recommendations with rationale

**Monetization**: $1.99 per technical design package

---

## PoC Scope (Minimum Viable Test)

### Constraints
- **Single domain**: Real estate/housing only
- **Single data source**: One community forum
- **User test group**: 10 target users

### Success Metrics
1. **Data quality**: Agent 1 filters 80%+ noise accurately
2. **Idea quality**: Agent 2 ideas are logically complete (user rating 4+/5)
3. **Tech viability**: Agent 3 specs allow cost estimation without extra questions
4. **Conversion rate**: 5%+ users go from Stage B → Stage C (paid)
5. **RAG accuracy**: <5% hallucination rate

### Test Flow
```
User → Browse problem cards (Stage A)
     → Pick one problem
     → Review 3-5 ideas (Stage B)
     → Pick one idea → Pay $0.99
     → Get technical docs (Stage C) → Pay $1.99
     → Survey satisfaction
```

---

## Key Risks & Mitigations

### Risk 1: Hallucination
**Problem**: AI invents fake market data

**Mitigation**:
- Store source URLs with all data
- Show citations in responses
- RAG retrieval over pure generation

### Risk 2: Bad Technical Designs
**Problem**: Suggested architecture doesn't work in practice

**Mitigation**:
- Conservative tech stack recommendations
- Compatibility validation in Agent 3 prompt
- Budget-aware design constraints

### Risk 3: Low Data Quality
**Problem**: Agent 1 fails to filter noise

**Mitigation**:
- Multiple filtering passes
- Human-in-loop validation for PoC
- Feedback loop to improve filters

---

## Project Structure (Recommended)

```
/project-root
├── /agents
│   ├── analyst.py          # Agent 1: Data collection & cleaning
│   ├── strategist.py       # Agent 2: Business idea generation
│   └── architect.py        # Agent 3: Technical design
├── /data
│   ├── /raw                # Scraped data
│   ├── /processed          # Cleaned data
│   └── /embeddings         # Vector DB storage
├── /services
│   ├── rag_service.py      # RAG retrieval logic
│   ├── llm_service.py      # LLM API wrapper
│   └── payment_service.py  # Stripe integration
├── /api
│   ├── /routes
│   │   ├── discovery.py    # Stage A endpoints
│   │   ├── ideation.py     # Stage B endpoints
│   │   └── execution.py    # Stage C endpoints
│   └── gateway.py          # API Gateway
├── /client
│   ├── /components
│   │   ├── ProblemCard.tsx
│   │   ├── IdeaCard.tsx
│   │   └── TechDocViewer.tsx
│   └── /pages
│       ├── discovery.tsx   # Stage A UI
│       ├── ideation.tsx    # Stage B UI
│       └── execution.tsx   # Stage C UI
├── /tests
│   ├── test_agents.py
│   ├── test_rag.py
│   └── test_api.py
└── README.md
```

---

## Next Steps (Post-PoC)

1. **Coding Agent**: Auto-generate boilerplate code from Stage C specs
2. **Domain expansion**: Add healthcare, travel, finance domains
3. **SaaS model**: Shift from one-time payment to subscription with continuous trend reports
4. **Community features**: Let users share/rate ideas

---

## Reference Inspirations

- **AutoGPT/BabyAGI**: Autonomous agent goal-pursuit patterns
- **TFT (Teamfight Tactics)**: Card selection UX for augments → Apply to idea selection

---

## Quick Start Commands (Example)

```bash
# Setup
pip install -r requirements.txt
python scripts/setup_databases.py

# Run Agent 1 (data collection - background job)
python agents/analyst.py --domain real_estate

# Start API server
python api/gateway.py

# Start client
cd client && npm run dev

# Run tests
pytest tests/
```

---

## Business Model Summary

| Stage | User Action | Cost | Revenue Driver |
|-------|-------------|------|----------------|
| Pre-Stage | None (background) | Free | N/A |
| Stage A | Browse problems | Free | Acquisition |
| Stage B | Generate ideas | $0.99 | Core monetization |
| Stage C | Get tech specs | $1.99 | Premium monetization |

**Target**: 1000 users → 50 Stage B conversions → 25 Stage C conversions = $75/month baseline

---

## Key Differentiators

❌ **Not a chatbot**: Predefined workflow, not open-ended conversation
❌ **Not a code generator**: Focuses on planning, not implementation
✅ **Data-first**: Real market signals, not hypotheticals
✅ **End-to-end**: Problem discovery → Technical specs
✅ **Cost-aware**: Designs respect user budget constraints
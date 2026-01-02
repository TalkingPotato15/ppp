# Test Plan: Stage B - Idea Generation

**Feature**: 004-stage-b-idea-generation
**Date**: 2025-12-31
**Status**: Draft

## Overview

This test plan covers testing for Stage B idea generation, including the AI agent (Agent 2), RAG integration, and end-to-end user flows. Testing requires a sufficient amount of scraped market data in ChromaDB.

## Test Data Requirements

### Minimum Data for Testing

| Data Type | Minimum Count | Purpose |
|-----------|---------------|---------|
| Problem Documents | 100+ | RAG retrieval diversity |
| Unique Domains | 5+ | Cross-domain testing |
| RISING trend docs | 30+ | Trend-based filtering |
| STABLE trend docs | 40+ | Baseline testing |
| DECLINING trend docs | 30+ | Edge case testing |

### Data Scraping Plan

**Source**: Ppomppu Real Estate Forum (per PoC constraints)

**Scraping Commands**:
```bash
# Activate virtual environment
source .venv/bin/activate

# Run the data collection pipeline
python -m src.main collect --domain real-estate --limit 200

# Verify document count
python -m src.main stats
```

**Expected Output**:
```
Documents in ChromaDB: 150+
Documents in SQLite: 150+
Domains: real-estate, housing, rental, ...
Trends: RISING (30%), STABLE (45%), DECLINING (25%)
```

### Data Verification Checklist

- [ ] ChromaDB contains 100+ documents with embeddings
- [ ] SQLite `document_summaries` table has matching records
- [ ] Each document has: title, keywords, domain_tag, trend, sentiment
- [ ] Embeddings are valid (dimensionality matches model)
- [ ] Related documents are linked (document_relationships table)

---

## Test Categories

### 1. Data Scraping Tests

**Purpose**: Ensure sufficient data exists for RAG testing

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DS-001 | Run scraper for 100 posts | 80+ documents after dedup/cleaning | P0 |
| DS-002 | Verify embeddings generated | All docs have valid embeddings | P0 |
| DS-003 | Check domain distribution | At least 3 domain tags | P1 |
| DS-004 | Check trend distribution | Mix of RISING/STABLE/DECLINING | P1 |
| DS-005 | Verify deduplication | No duplicate source_urls | P0 |

**Test Commands**:
```bash
# DS-001: Scrape data
python -m src.main collect --limit 100

# DS-002: Verify embeddings
python -c "
from src.storage.vector_store import get_document_count
print(f'Documents with embeddings: {get_document_count()}')
"

# DS-003 & DS-004: Check distribution
python -c "
from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///data/discovery.db')
with engine.connect() as conn:
    result = conn.execute(text('SELECT domain_tag, trend, COUNT(*) FROM document_summaries GROUP BY domain_tag, trend'))
    for row in result:
        print(row)
"
```

---

### 2. RAG Retrieval Tests

**Purpose**: Verify vector search returns relevant documents

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| RAG-001 | Search with problem title | Returns 5+ similar docs | P0 |
| RAG-002 | Similarity score threshold | All results > 0.7 cosine | P0 |
| RAG-003 | Domain filtering | Same-domain docs ranked higher | P1 |
| RAG-004 | Empty query handling | Returns error, not crash | P1 |
| RAG-005 | Non-existent domain | Returns cross-domain results | P2 |

**Test Script** (`tests/test_rag_retrieval.py`):
```python
import pytest
from src.storage.vector_store import search_similar
from src.agents.analyst.embedder import get_embedding

@pytest.mark.asyncio
async def test_rag_retrieval_returns_results():
    """RAG-001: Search returns relevant documents"""
    query = "pet-friendly apartment rental policies"
    embedding = await get_embedding(query)
    results = await search_similar(embedding, n_results=10)

    assert len(results) >= 5, "Should return at least 5 documents"

@pytest.mark.asyncio
async def test_rag_similarity_threshold():
    """RAG-002: Results meet similarity threshold"""
    query = "housing market trends"
    embedding = await get_embedding(query)
    results = await search_similar(embedding, n_results=10)

    for result in results:
        # ChromaDB returns distance, convert to similarity
        similarity = 1 - result['distance']
        assert similarity > 0.5, f"Similarity {similarity} below threshold"

@pytest.mark.asyncio
async def test_rag_domain_filtering():
    """RAG-003: Same-domain docs ranked higher"""
    query = "real estate investment"
    embedding = await get_embedding(query)
    results = await search_similar(
        embedding,
        n_results=10,
        where={"domain_tag": "real-estate"}
    )

    assert len(results) >= 3, "Should find domain-specific results"
```

---

### 3. AI Agent Unit Tests

**Purpose**: Test Agent 2 (Strategic Planner) in isolation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| AG-001 | Generate ideas with valid input | Returns 3-5 ideas | P0 |
| AG-002 | Each idea has required fields | All fields non-empty | P0 |
| AG-003 | Ideas include market_signals | At least 1 signal per idea | P0 |
| AG-004 | Confidence score range | 0.0 <= score <= 1.0 | P0 |
| AG-005 | Ideas are diverse | No duplicate titles | P1 |
| AG-006 | Handle missing keywords | Graceful fallback | P1 |
| AG-007 | Handle empty RAG context | Still generates ideas | P1 |
| AG-008 | Response time < 20s | Completes within timeout | P0 |

**Test Script** (`tests/test_ai_agent.py`):
```python
import pytest
import asyncio
from src.services.ai_agent import AIAgentService

@pytest.fixture
def agent():
    return AIAgentService()

@pytest.mark.asyncio
async def test_generate_ideas_returns_valid_count(agent):
    """AG-001: Returns 3-5 ideas"""
    ideas = await agent.generate_ideas(
        problem_title="High rental costs in urban areas",
        keywords=["rental", "housing", "urban", "cost"],
        domain="real-estate",
        trend="RISING",
        sentiment="NEGATIVE",
        rag_context=[{"title": "Related problem", "content": "..."}]
    )

    assert 3 <= len(ideas) <= 5, f"Expected 3-5 ideas, got {len(ideas)}"

@pytest.mark.asyncio
async def test_ideas_have_required_fields(agent):
    """AG-002: All required fields present"""
    ideas = await agent.generate_ideas(
        problem_title="Need for affordable housing",
        keywords=["affordable", "housing"],
        domain="real-estate",
        trend="RISING",
        sentiment="NEGATIVE"
    )

    required_fields = [
        'title', 'description', 'target_audience',
        'differentiators', 'market_opportunity',
        'implementation_hints', 'market_signals', 'confidence_score'
    ]

    for idea in ideas:
        for field in required_fields:
            assert hasattr(idea, field), f"Missing field: {field}"
            assert getattr(idea, field), f"Empty field: {field}"

@pytest.mark.asyncio
async def test_ideas_include_market_signals(agent):
    """AG-003: Ideas reference market data"""
    rag_context = [
        {"title": "Rising pet ownership", "content": "Pet ownership up 20%..."},
        {"title": "Rental restrictions", "content": "Many landlords ban pets..."}
    ]

    ideas = await agent.generate_ideas(
        problem_title="Pet-friendly housing shortage",
        keywords=["pet", "housing", "rental"],
        domain="real-estate",
        trend="RISING",
        sentiment="NEGATIVE",
        rag_context=rag_context
    )

    for idea in ideas:
        assert len(idea.market_signals) >= 1, "Each idea should cite market signals"

@pytest.mark.asyncio
async def test_response_time(agent):
    """AG-008: Generation completes within 20 seconds"""
    start = asyncio.get_event_loop().time()

    await agent.generate_ideas(
        problem_title="Test problem",
        keywords=["test"],
        domain="real-estate",
        trend="STABLE",
        sentiment="NEUTRAL"
    )

    elapsed = asyncio.get_event_loop().time() - start
    assert elapsed < 20, f"Generation took {elapsed}s, exceeds 20s limit"
```

---

### 4. Integration Tests

**Purpose**: Test full pipeline from problem selection to idea display

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| INT-001 | Generate ideas for real problem | Ideas saved to DB | P0 |
| INT-002 | RAG context included in generation | Ideas reference retrieved docs | P0 |
| INT-003 | One-time generation enforced | Second request returns 409 | P0 |
| INT-004 | Payment verification | Unpaid user gets 403 | P0 |
| INT-005 | Bookmark idea | is_bookmarked updated | P1 |
| INT-006 | Session history | Past sessions retrievable | P1 |

**Test Script** (`tests/test_integration.py`):
```python
import pytest
from httpx import AsyncClient
from src.api.app import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client):
    """Get auth token for testing"""
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_generate_ideas_saves_to_db(client, auth_headers):
    """INT-001: Ideas saved to database"""
    # Get a real problem ID
    problems = await client.get("/api/discovery/problems?limit=1")
    problem_id = problems.json()["items"][0]["id"]

    # Generate ideas
    response = await client.post(
        "/api/ideas/generate",
        json={"problem_id": problem_id},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert len(data["ideas"]) >= 3

@pytest.mark.asyncio
async def test_one_time_generation_enforced(client, auth_headers):
    """INT-003: Second generation returns 409"""
    problems = await client.get("/api/discovery/problems?limit=1")
    problem_id = problems.json()["items"][0]["id"]

    # First generation
    response1 = await client.post(
        "/api/ideas/generate",
        json={"problem_id": problem_id},
        headers=auth_headers
    )
    assert response1.status_code == 200

    # Second generation should fail
    response2 = await client.post(
        "/api/ideas/generate",
        json={"problem_id": problem_id},
        headers=auth_headers
    )
    assert response2.status_code == 409

@pytest.mark.asyncio
async def test_bookmark_idea(client, auth_headers):
    """INT-005: Bookmark updates idea"""
    # Get an existing idea
    sessions = await client.get("/api/ideas/sessions?limit=1", headers=auth_headers)
    idea_id = sessions.json()["items"][0]["ideas"][0]["id"]

    # Bookmark it
    response = await client.patch(
        f"/api/ideas/{idea_id}/bookmark",
        json={"is_bookmarked": True},
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["is_bookmarked"] == True
```

---

### 5. End-to-End Tests

**Purpose**: Full user flow testing

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| E2E-001 | Complete flow | Login → Browse → Pay → Generate → View | Ideas displayed |
| E2E-002 | Bookmark flow | Generate → Bookmark → My Ideas | Bookmarked idea visible |
| E2E-003 | Return user | Login → My Ideas → View past ideas | History accessible |
| E2E-004 | Error recovery | Generate → API timeout → Retry message | User-friendly error |

**Manual Test Script**:

```markdown
## E2E-001: Complete Flow

### Prerequisites
- Test account: test@example.com / testpassword
- Scraped data in ChromaDB (100+ docs)
- Backend running on localhost:8000
- Frontend running on localhost:3000

### Steps
1. Open http://localhost:3000
2. Browse problem cards on main page
3. Click on a problem to open preview
4. Click "Pay to Unlock Stage B Ideas"
5. Complete payment with test card (4330000000000000)
6. Verify redirect to Stage B page
7. Click "Generate Ideas" button
8. Wait for loading (2-20 seconds)
9. Verify 3-5 idea cards displayed

### Expected Results
- [ ] Problems display with titles, keywords, trends
- [ ] Payment flow completes without errors
- [ ] Ideas generated within 30 seconds
- [ ] Each idea shows: title, description, market_signals
- [ ] Ideas are relevant to selected problem
```

---

## Test Execution Plan

### Phase 1: Data Preparation (Day 1)

```bash
# 1. Clear existing test data
python -m src.main reset --confirm

# 2. Run scraper for fresh data
python -m src.main collect --domain real-estate --limit 200

# 3. Verify data counts
python -m src.main stats

# Expected output:
# Documents: 150+
# Summaries: 150+
# Embeddings: 150+
```

### Phase 2: Unit Tests (Day 1-2)

```bash
# Run RAG tests
pytest tests/test_rag_retrieval.py -v

# Run Agent tests
pytest tests/test_ai_agent.py -v

# Expected: All tests pass
```

### Phase 3: Integration Tests (Day 2)

```bash
# Start test database
export DATABASE_URL=sqlite:///data/test.db

# Run migrations
alembic upgrade head

# Run integration tests
pytest tests/test_integration.py -v

# Expected: All tests pass
```

### Phase 4: E2E Tests (Day 3)

```bash
# Start servers
python -m src.main serve &
cd frontend && npm run dev &

# Run manual E2E tests per script above
# Document results in test-results.md
```

---

## Test Metrics

### Pass Criteria

| Category | Metric | Target |
|----------|--------|--------|
| Unit Tests | Pass Rate | 100% |
| Integration Tests | Pass Rate | 95%+ |
| E2E Tests | Pass Rate | 90%+ |
| RAG Retrieval | Avg Similarity | > 0.75 |
| Agent Response | Time p95 | < 20s |
| Idea Quality | User Rating | 4+/5 |

### Quality Gates

Before moving to production:
- [ ] All P0 tests pass
- [ ] 95%+ of P1 tests pass
- [ ] Data scraping produces 100+ clean documents
- [ ] RAG retrieval returns relevant results
- [ ] Agent generates grounded ideas with market_signals

---

## Test Data Cleanup

```bash
# After testing, clean up test data
python -m src.main reset --test-only

# Verify production data intact
python -m src.main stats
```

## Appendix: Test Card Numbers

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success | 4330000000000000 | Payment approved |
| Failure | 4000000000000002 | Payment declined |
| 3DS Required | 4000000000000010 | 3DS challenge |

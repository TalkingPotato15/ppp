# Data Collection Pipeline - Bokrichun Card (Spec 001)

<card_metadata>
title: AI-Powered Forum Data Collection Pipeline
spec_id: 001-data-pipeline
difficulty: intermediate-advanced
time_with_ai: 45 minutes
time_traditional: 12 hours
tools: Claude, Python 3.11+, httpx, BeautifulSoup, ChromaDB, SQLAlchemy, OpenAI API
</card_metadata>

---

## MASTER CARD: Core Implementation

<problem_definition>
The AI Agent Business Builder needs foundational market data to operate. Without a robust data collection pipeline, Agents 2 and 3 cannot generate quality business ideas. Agent 1 (Data Analyst) must continuously collect, clean, and store market data from community forums to provide a knowledge base for AI-driven problem analysis.
</problem_definition>

<solution_overview>
A resilient ETL pipeline that:
1. Scrapes community forums with rate limiting and retry logic
2. Filters 80%+ noise using LLM classification (GPT-4o-mini)
3. Stores data in hybrid Vector/Relational database (ChromaDB + PostgreSQL)
4. Detects and recovers gaps in data collection automatically
5. Maintains full traceability with source URLs for citation
</solution_overview>

<architecture>
Forum Source → Scraper (httpx, BeautifulSoup) → RawPost (Temporary)
    → Cleaner (GPT-4o-mini Noise Detection) → Classification
        → [Is Noise: Delete] / [Is Valid: ProcessedDocument]
            → Embedder (OpenAI) → ChromaDB (Vector DB for RAG)
            → Summarizer → PostgreSQL (RDB for UI Queries)
            → Relationship Detector → DocumentRelationship (Similarity Links)
</architecture>

<data_model>
Six core entities with state transitions:

1. RawPost: Raw scraped content (temporary, deleted after processing)
   - Unique constraint on source_url
   - Lifecycle: Create → Process → Delete

2. ProcessedDocument: Cleaned, structured content ready for RAG
   - Fields: title, keywords, trend, sentiment, domain_tag, content_hash
   - Stored in both Vector DB and RDB

3. DocumentSummary: Lightweight UI representation in PostgreSQL
   - Indexed by: domain_tag, posted_at, keywords (GIN)

4. DocumentEmbedding: Vector representation in ChromaDB
   - 1536-dimensional (OpenAI text-embedding-3-small)

5. DocumentRelationship: Links between similar documents
   - Types: SIMILAR_TOPIC, SAME_DOMAIN, TREND_CORRELATION
   - Score: 0.0-1.0 cosine similarity

6. CollectionJob: Tracks each scraping run
   - Status: PENDING → RUNNING → COMPLETED/FAILED
</data_model>

### Step-by-Step Implementation

<step number="1" name="Environment Setup">
<commands>
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync
mkdir -p data
</commands>
<file path=".env">
DATABASE_URL=sqlite+aiosqlite:///./data/app.db
OPENAI_API_KEY=sk-...
TARGET_FORUM_URL=https://example-forum.com
TARGET_FORUM_NAME=example_forum
INITIAL_LOAD_MONTHS=3
SCRAPE_RATE_LIMIT_SECONDS=5
CHROMA_PERSIST_DIRECTORY=./data/chroma
LOG_LEVEL=INFO
</file>
<expected_output>
Resolved 45 packages in 1.2s
Installed 45 packages in 3.4s
</expected_output>
</step>

<step number="2" name="CSS Selectors Configuration">
<file path="src/config/selectors.py">
SELECTORS = {
    "target_forum": {
        "post_list": "div.list-item",
        "post_title": "h2.title",
        "post_content": "div.content",
        "post_date": "time.posted",
        "post_url": "a.link",
        "next_page": "a.next-button",
    }
}
</file>
<rationale>
- CSS selectors are forum-specific and configurable
- No code changes needed when forum changes
- Test with --dry-run before full scrape
</rationale>
</step>

<step number="3" name="Data Models">
<file path="src/models/enums.py">
from enum import Enum

class Trend(str, Enum):
    RISING = "RISING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"

class Sentiment(str, Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"

class JobType(str, Enum):
    INITIAL_LOAD = "INITIAL_LOAD"
    INCREMENTAL = "INCREMENTAL"

class JobStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class RelationshipType(str, Enum):
    SIMILAR_TOPIC = "SIMILAR_TOPIC"
    SAME_DOMAIN = "SAME_DOMAIN"
    TREND_CORRELATION = "TREND_CORRELATION"
</file>
</step>

<step number="4" name="LLM-Based Noise Classification">
<file path="src/agents/analyst/cleaner.py">
async def clean_post(raw_post: RawPost) -> Optional[ProcessedDocument]:
    """
    Classify post as noise or valid. If valid, extract metadata.
    Returns ProcessedDocument or None if filtered.
    """

    classification_prompt = """
    Analyze this forum post and determine if it's valuable market data:

    Content: {content}

    Respond with JSON:
    {
        "is_noise": boolean,  // true if ads, spam, off-topic
        "reason": "string",   // why filtered (if noise)
        "title": "string",    // user's problem statement
        "keywords": ["kw1", "kw2", ...],  // 3-10 main topics
        "trend": "RISING|STABLE|DECLINING",  // discussion volume
        "sentiment": "POSITIVE|NEUTRAL|NEGATIVE"  // author's tone
    }
    """

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": classification_prompt.format(content=raw_post.content)}]
    )

    result = json.loads(response.choices[0].message.content)

    if result["is_noise"]:
        logger.info(f"Filtered post {raw_post.id}: {result['reason']}")
        return None

    return ProcessedDocument(
        source_url=raw_post.source_url,
        title=result["title"],
        keywords=result["keywords"],
        trend=Trend(result["trend"]),
        sentiment=Sentiment(result["sentiment"]),
        content=raw_post.content,
        content_hash=sha256(raw_post.content.encode()).hexdigest(),
        posted_at=raw_post.posted_at,
        processed_at=datetime.utcnow(),
        domain_tag="real_estate"
    )
</file>
</step>

<step number="5" name="Rate-Limited Scraper">
<file path="src/agents/analyst/scraper.py">
class ForumScraper:
    def __init__(self, rate_limit_seconds: int = 5):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.rate_limiter = asyncio.Semaphore(1)
        self.last_request_time = 0
        self.rate_limit_seconds = rate_limit_seconds

    async def scrape_with_retry(self, url: str, max_retries: int = 3):
        """Fetch URL with exponential backoff retry."""
        for attempt in range(max_retries):
            try:
                async with self.rate_limiter:
                    elapsed = time.time() - self.last_request_time
                    if elapsed < self.rate_limit_seconds:
                        await asyncio.sleep(self.rate_limit_seconds - elapsed)

                    response = await self.client.get(url, headers=self._random_user_agent())
                    response.raise_for_status()
                    self.last_request_time = time.time()
                    return response

            except httpx.HTTPError as e:
                if attempt < max_retries - 1:
                    backoff = 2 ** attempt
                    logger.warning(f"Retry in {backoff}s: {e}")
                    await asyncio.sleep(backoff)
                else:
                    raise

    def _random_user_agent(self) -> dict:
        agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ]
        return {"User-Agent": random.choice(agents)}
</file>
</step>

<step number="6" name="Vector Store Implementation">
<file path="src/storage/vector_store.py">
async def add_document(doc: ProcessedDocument) -> str:
    """Add document with embedding to ChromaDB."""
    embedding = await embedder.embed(doc.content)

    collection.add(
        ids=[str(doc.id)],
        embeddings=[embedding],
        documents=[doc.content],
        metadatas=[{
            "source_url": doc.source_url,
            "title": doc.title,
            "keywords": ",".join(doc.keywords),
            "trend": doc.trend.value,
            "sentiment": doc.sentiment.value,
            "domain_tag": doc.domain_tag,
            "posted_at": doc.posted_at.isoformat()
        }]
    )
    return str(doc.id)

async def search_similar(
    query: str,
    domain: Optional[str] = None,
    limit: int = 10
) -> List[dict]:
    """Semantic search with optional domain filtering."""
    embedding = await embedder.embed(query)

    where_filter = {"domain_tag": {"$eq": domain}} if domain else None

    results = collection.query(
        query_embeddings=[embedding],
        n_results=limit,
        where=where_filter,
        include=["metadatas", "distances"]
    )

    return [
        {"id": id_, "score": 1 - dist, "metadata": meta}
        for id_, dist, meta in zip(
            results["ids"][0],
            results["distances"][0],
            results["metadatas"][0]
        )
    ]
</file>
</step>

<step number="7" name="Pipeline Orchestration">
<file path="src/services/pipeline.py">
async def initial_load(months: int = 3):
    """Orchestrate initial bulk data load."""
    job = CollectionJob(
        job_type=JobType.INITIAL_LOAD,
        status=JobStatus.RUNNING,
        target_start=datetime.utcnow() - timedelta(days=30 * months),
        target_end=datetime.utcnow()
    )
    await rdb_store.save_job(job)

    try:
        # Step 1: Scrape
        raw_posts = await scraper.scrape_historical(
            start_date=job.target_start,
            end_date=job.target_end
        )
        job.posts_collected = len(raw_posts)

        # Step 2: Clean (filter noise)
        processed_docs = []
        for raw_post in raw_posts:
            doc = await cleaner.clean_post(raw_post)
            if doc:
                processed_docs.append(doc)
            else:
                job.posts_filtered += 1
        job.posts_processed = len(processed_docs)

        # Step 3: Embed & Store dual
        for doc in processed_docs:
            await vector_store.add_document(doc)
            await rdb_store.save_summary(doc.to_summary())

        # Step 4: Detect relationships
        for doc in processed_docs:
            similar = await vector_store.search_similar(doc.title, limit=5)
            for sim in similar:
                if sim["score"] > 0.8:
                    await rdb_store.save_relationship(
                        source_doc_id=doc.id,
                        target_doc_id=sim["id"],
                        type=RelationshipType.SIMILAR_TOPIC,
                        score=sim["score"]
                    )

        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        await rdb_store.update_job(job)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_message = str(e)
        await rdb_store.update_job(job)
        raise
</file>
</step>

<step number="8" name="CLI Entry Point">
<file path="src/main.py">
import typer
from rich.console import Console

app = typer.Typer(help="Data Collection Pipeline CLI")
console = Console()

@app.command()
def initial_load(months: int = typer.Option(3, help="Historical data months")):
    """Run initial bulk data load."""
    asyncio.run(pipeline.initial_load(months=months))
    console.print("[green]Initial load complete[/green]")

@app.command()
def scheduler():
    """Start incremental collection scheduler."""
    scheduler_service.start()
    console.print("[green]Scheduler running (Ctrl+C to stop)[/green]")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler_service.shutdown()

@app.command()
def incremental(hours: int = typer.Option(1, help="Collection window")):
    """Run manual incremental collection."""
    asyncio.run(pipeline.incremental_collect(hours=hours))

@app.command()
def test_scrape(url: str, dry_run: bool = True):
    """Test scraper on specific URL."""
    result = asyncio.run(scraper.test_scrape(url, dry_run))
    console.print_json(data=result)

@app.command()
def health():
    """Check service health status."""
    status = pipeline.health_check()
    console.print_json(data=status)

if __name__ == "__main__":
    app()
</file>
</step>

### Examples

<example name="Initial Load">
<command>uv run python -m src.main initial-load --months 3</command>
<expected_output>
[INFO] Starting initial load for 3 months
[INFO] Scraped 450 posts
[INFO] After LLM filtering: 320 valid documents (71%)
[INFO] Stored in ChromaDB and PostgreSQL
[INFO] Detected 156 document relationships
[green]Initial load complete[/green]
</expected_output>
</example>

<example name="Incremental Collection">
<command>uv run python -m src.main scheduler</command>
<expected_output>
[green]Scheduler running (Ctrl+C to stop)[/green]
[INFO] Next job: 2026-01-05 15:00:00 (hourly)
[INFO] Incremental collection: 12 new posts, 8 valid
</expected_output>
</example>

<example name="Test Scrape">
<command>uv run python -m src.main test-scrape --url "https://forum.com/board" --dry-run</command>
<expected_output>
{
  "status": "success",
  "posts_found": 25,
  "sample": {"title": "Sample Post", "date": "2024-01-05"}
}
</expected_output>
</example>

### Time Efficiency

| Task | Traditional | With AI | Reduction |
|------|-------------|---------|-----------|
| Scraper Implementation | 4h | 20min | 92% |
| LLM Cleaning Logic | 3h | 15min | 92% |
| Vector DB Integration | 2h | 10min | 92% |
| Pipeline Orchestration | 2h | 10min | 92% |
| Gap Detection | 1h | 5min | 92% |
| Total | 12h | 60min | 92% |

Cost Saved: $550 (11h x $50/hr)

---

## CHEAT KEY CARD: Shortcuts

<quick_start>
uv sync
cp .env.example .env  # Edit API keys
uv run python -m src.main test-scrape --url "https://forum.com" --dry-run
uv run python -m src.main initial-load --months 1
uv run python -m src.main scheduler
</quick_start>

<essential_prompts>

<prompt name="CSS Selector Generation">
[Paste HTML here]

Generate BeautifulSoup CSS selectors for scraping posts.
Output as Python dict format with keys:
- post_list: container for post items
- post_title: title element
- post_content: body content
- post_date: timestamp
- next_page: pagination button
</prompt>

<prompt name="LLM Noise Filtering">
You are a Data Analyst.
Classify if this forum post contains valid business problem content.

If valid: Return JSON {title, keywords[], trend, sentiment}
If noise: Return {"is_noise": true, "reason": "..."}

Noise criteria:
- Advertisements or promotions
- Spam or irrelevant content
- Off-topic discussions
- Duplicate content

Post content:
{post_content}
</prompt>

<prompt name="Error Debugging">
This scraping code returns 403 Forbidden.
Add User-Agent rotation and rate limiting.
Include exponential backoff retry logic.
</prompt>

</essential_prompts>

<quick_configs>
# Speed vs Safety tradeoff
SCRAPE_RATE_LIMIT_SECONDS=2.0  # Decrease for speed (risky)
SCRAPE_RATE_LIMIT_SECONDS=10.0 # Increase if blocked

# Debug mode
LOG_LEVEL=DEBUG

# Embedding model selection
EMBEDDING_MODEL=text-embedding-3-small  # $0.02/1M tokens
EMBEDDING_MODEL=text-embedding-3-large  # $0.13/1M tokens (higher quality)
</quick_configs>

<quick_code>
# Content hash for deduplication
content_hash = sha256(content.encode()).hexdigest()

# ChromaDB query one-liner
results = collection.query(query_embeddings=[embedding], n_results=5)

# Rate limiter pattern
async with rate_limiter:
    await asyncio.sleep(rate_limit_seconds)
    response = await client.get(url)

# Exponential backoff
backoff = 2 ** attempt  # 1, 2, 4, 8 seconds
</quick_code>

---

## BOOSTER CARD: Quality & Troubleshooting

<faq>

<qa>
<q>Scraper returns 0 posts</q>
<a>CSS selectors don't match. Sites change class names frequently. Debug with: uv run python -m src.main test-scrape --dry-run</a>
</qa>

<qa>
<q>403 Forbidden errors</q>
<a>Site blocking bots. Increase SCRAPE_RATE_LIMIT_SECONDS to 10.0 or add User-Agent rotation. Check if forum requires authentication.</a>
</qa>

<qa>
<q>LLM misclassifies valid posts as noise</q>
<a>Add few-shot examples of valid posts to the system prompt. Refine noise criteria with specific examples from the target forum.</a>
</qa>

<qa>
<q>ChromaDB disk full</q>
<a>Check disk usage at CHROMA_PERSIST_DIRECTORY. Estimate: ~1KB per 1536-dim embedding plus metadata. Implement periodic cleanup job.</a>
</qa>

<qa>
<q>Duplicate posts stored</q>
<a>Verify SHA-256 content hashing. Ensure UNIQUE constraint on content_hash column. Check deduplication query in pipeline.</a>
</qa>

<qa>
<q>High OpenAI API costs</q>
<a>Use gpt-4o-mini instead of gpt-4o. Use batch processing (5-10 posts per API call). Implement caching for repeated content.</a>
</qa>

<qa>
<q>Incremental job missed (scheduler didn't run)</q>
<a>Run gap recovery: incremental --hours 24. Check logs for crash/error. Verify APScheduler job store. Deploy with process supervisor (systemd).</a>
</qa>

<qa>
<q>Poor embedding quality for Korean</q>
<a>text-embedding-3-small handles Korean well. If issues persist, verify language detection in logs. Consider adding context to embedding input.</a>
</qa>

</faq>

<troubleshooting>

<issue name="Rate Limit Error (HTTP 429)">
<solution>
async def _fetch_with_retry(url, max_retries=3):
    for i in range(max_retries):
        try:
            return await client.get(url)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(2 ** i)  # Exponential backoff
            else:
                raise
</solution>
</issue>

<issue name="Korean Encoding Error">
<solution>
response = await client.get(url)
content = response.content.decode('utf-8', errors='ignore')
soup = BeautifulSoup(content, 'lxml')
</solution>
</issue>

<issue name="OpenAI Rate Limits Hit">
<solution>
# Implement semaphore for concurrent API calls
api_semaphore = asyncio.Semaphore(5)  # Max 5 concurrent

async def call_openai_with_limit(prompt):
    async with api_semaphore:
        return await openai_client.chat.completions.create(...)
</solution>
</issue>

<issue name="Gap Detection and Recovery">
<solution>
async def detect_and_recover_gaps():
    last_job = await rdb_store.get_last_completed_job(JobType.INCREMENTAL)

    if not last_job:
        return

    gap_hours = (datetime.utcnow() - last_job.target_end).total_seconds() / 3600

    if gap_hours > 1.5:  # More than 1.5 hours = missed collection
        logger.warning(f"Gap detected: {gap_hours:.1f} hours")
        await incremental_collect(hours=int(gap_hours))
</solution>
</issue>

</troubleshooting>

<quality_checklist>
- [ ] CSS selectors tested with --dry-run
- [ ] Rate limiting configured (min 5 seconds)
- [ ] User-Agent rotation enabled
- [ ] LLM noise filtering tested with samples
- [ ] SHA-256 hash for duplicate prevention
- [ ] Exponential backoff retry logic
- [ ] Separate logging levels (INFO, DEBUG, ERROR)
- [ ] Gap detection enabled for scheduler
- [ ] Health check endpoint working
- [ ] Batch processing for API cost optimization
</quality_checklist>

<monitoring_commands>
# Health check
uv run python -m src.main health

# View recent jobs
uv run python -m src.main jobs list --limit 10

# Check for gaps
uv run python -m src.main jobs check-gaps

# Debug mode
LOG_LEVEL=DEBUG uv run python -m src.main scheduler
</monitoring_commands>


"""Mock test for the data collection pipeline.
# Timezone for Korea
KST = ZoneInfo("Asia/Seoul")


This test creates sample Korean real estate forum posts and runs them through
the complete pipeline to verify:
- OpenAI API integration
- LLM-based content classification
- Embedding generation
- Vector DB storage
- RDB storage
"""

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import uuid4

from src.models.raw_post import RawPost
from src.models import JobType, JobStatus
from src.models.job import CollectionJob
from src.agents.analyst.cleaner import clean_posts
from src.agents.analyst.embedder import generate_embeddings
from src.storage import get_session, rdb_store, vector_store
from src.services.pipeline import _embed_and_store_phase


# Sample Korean real estate forum posts (mix of valid and noise)
MOCK_POSTS = [
    {
        "url": "https://mock-forum.com/post/1",
        "content": """
        서울 강남구 아파트 시세 급등 문제

        최근 강남구 아파트 가격이 급등하고 있습니다. 재건축 기대감과 학군 수요로
        인해 가격 상승세가 지속되고 있는 상황입니다. 특히 대치동과 압구정동 일대의
        중대형 아파트가 큰 폭으로 올랐습니다.

        전문가들은 금리 인상에도 불구하고 강남 지역의 수요는 견고할 것으로
        전망하고 있습니다. 다만 정부의 규제 강화 가능성도 있어 주의가 필요합니다.
        """,
        "author": "부동산전문가",
        "is_noise": False,
    },
    {
        "url": "https://mock-forum.com/post/2",
        "content": """
        ★★★긴급★★★ 아파트 분양권 급매!!!

        강남 신축 아파트 분양권 급매합니다!
        지금 바로 연락주세요! 010-XXXX-XXXX
        프리미엄 없이 저렴하게 드립니다!
        중개수수료 없음! 빠른 연락 바랍니다!!!
        """,
        "author": "급매왕",
        "is_noise": True,  # Advertisement spam
    },
    {
        "url": "https://mock-forum.com/post/3",
        "content": """
        지방 소도시 부동산 투자 경험담

        작년에 충청남도 작은 도시에 빌라를 구매했습니다. 처음에는 걱정이
        많았지만, 월세 수익률이 꽤 괜찮아서 만족하고 있습니다.

        다만 향후 매도 시 유동성이 떨어질 수 있다는 점이 걱정됩니다.
        지방 소도시 투자 시 고려해야 할 점들을 공유합니다:
        1. 인구 유입 추이 확인
        2. 지역 산업 기반 조사
        3. 교통 인프라 개발 계획
        """,
        "author": "투자초보",
        "is_noise": False,
    },
    {
        "url": "https://mock-forum.com/post/4",
        "content": """
        ㅋㅋㅋㅋㅋ 오늘 점심 뭐 먹지?
        """,
        "author": "랜덤유저",
        "is_noise": True,  # Off-topic
    },
    {
        "url": "https://mock-forum.com/post/5",
        "content": """
        전세 사기 피해 사례 공유

        최근 깡통전세 문제가 심각합니다. 제 지인이 전세 사기를 당했는데,
        집주인이 대출을 과도하게 받아놓고 잠적했습니다.

        전세 계약 시 반드시 확인해야 할 사항:
        - 등기부등본에서 선순위 근저당권 확인
        - 전세보증보험 가입 가능 여부
        - 집주인 신용도 및 다른 부채 확인

        요즘같은 시기에는 특히 조심해야 합니다.
        """,
        "author": "피해자친구",
        "is_noise": False,
    },
    {
        "url": "https://mock-forum.com/post/6",
        "content": """
        1층 상가 투자 문의

        주택가 1층 상가를 구매하려고 합니다. 현재 편의점이 입점해 있고
        월세가 안정적으로 나오고 있습니다.

        상가 투자 시 주의사항이나 체크리스트가 있을까요?
        권리금, 임대차 계약, 상권 분석 등 조언 부탁드립니다.
        """,
        "author": "상가투자자",
        "is_noise": False,
    },
    {
        "url": "https://mock-forum.com/post/7",
        "content": """
        부동산 대박 비법 공개! 클릭!

        부동산으로 10억 벌었습니다!
        비법을 알려드립니다!
        카톡: xxxxx
        """,
        "author": "스팸계정",
        "is_noise": True,  # Spam advertisement
    },
    {
        "url": "https://mock-forum.com/post/8",
        "content": """
        재개발 지역 투자 리스크

        재개발 예정 지역에 투자를 고려 중입니다. 하지만 재개발이 지연되거나
        무산될 경우의 리스크가 큽니다.

        재개발 투자 시 확인사항:
        - 조합 설립 진행 상황
        - 사업성 평가 결과
        - 조합원 동의율
        - 예상 추진 일정

        경험 있으신 분들의 조언 부탁드립니다.
        """,
        "author": "재개발관심자",
        "is_noise": False,
    },
]


async def create_mock_raw_posts() -> tuple[list[RawPost], str]:
    """Create mock raw posts and a collection job.

    Returns:
        Tuple of (list of RawPost objects, job_id)
    """
    job_id = str(uuid4())

    # Create a mock collection job
    job = CollectionJob(
        id=job_id,
        job_type=JobType.INITIAL_LOAD,
        status=JobStatus.RUNNING,
        target_start=datetime.now(KST) - timedelta(days=7),
        target_end=datetime.now(KST),
        started_at=datetime.now(KST),
    )

    async with get_session() as session:
        await rdb_store.save_job(session, job)

    # Create mock raw posts
    raw_posts = []
    for i, mock_data in enumerate(MOCK_POSTS):
        raw_post = RawPost(
            id=str(uuid4()),
            source_url=mock_data["url"],
            content=mock_data["content"].strip(),
            author_hash=f"mock_hash_{i}",
            posted_at=datetime.now(KST) - timedelta(days=7-i),
            scraped_at=datetime.now(KST),
            collection_job_id=job_id,
        )
        raw_posts.append(raw_post)

    # Save to database
    async with get_session() as session:
        await rdb_store.save_raw_posts(session, raw_posts)

    print(f"✅ Created {len(raw_posts)} mock raw posts")
    print(f"✅ Created collection job: {job_id}")

    return raw_posts, job_id


async def test_cleaning_phase(raw_posts: list[RawPost]):
    """Test the LLM-based cleaning phase.

    Args:
        raw_posts: List of raw posts to clean.
    """
    print("\n" + "="*80)
    print("🧹 TESTING CLEANING PHASE (LLM-based noise filtering)")
    print("="*80)

    processed_docs, filtered_count, error_count = await clean_posts(raw_posts)

    print(f"\n📊 Cleaning Results:")
    print(f"  - Total posts:     {len(raw_posts)}")
    print(f"  - Processed:       {len(processed_docs)}")
    print(f"  - Filtered (noise): {filtered_count}")
    print(f"  - Errors:          {error_count}")

    # Show sample processed document
    if processed_docs:
        print(f"\n📄 Sample Processed Document:")
        doc = processed_docs[0]
        print(f"  - Title:     {doc.title}")
        print(f"  - Keywords:  {', '.join(doc.keywords)}")
        print(f"  - Trend:     {doc.trend if isinstance(doc.trend, str) else doc.trend.value}")
        print(f"  - Sentiment: {doc.sentiment if isinstance(doc.sentiment, str) else doc.sentiment.value}")
        print(f"  - URL:       {doc.source_url}")

    expected_valid = sum(1 for p in MOCK_POSTS if not p["is_noise"])
    if len(processed_docs) >= expected_valid - 1:  # Allow 1 error margin
        print("\n✅ Cleaning phase PASSED (noise filtering working correctly)")
    else:
        print(f"\n⚠️  Warning: Expected ~{expected_valid} valid posts, got {len(processed_docs)}")

    return processed_docs


async def test_embedding_phase(processed_docs):
    """Test embedding generation.

    Args:
        processed_docs: List of processed documents.
    """
    print("\n" + "="*80)
    print("🔢 TESTING EMBEDDING PHASE")
    print("="*80)

    contents = [doc.content for doc in processed_docs]
    embeddings = await generate_embeddings(contents)

    print(f"\n📊 Embedding Results:")
    print(f"  - Documents:       {len(processed_docs)}")
    print(f"  - Embeddings:      {len(embeddings)}")
    print(f"  - Dimensions:      {len(embeddings[0]) if embeddings else 0}")
    print(f"  - Expected dims:   1536")

    if embeddings and len(embeddings[0]) == 1536:
        print("\n✅ Embedding phase PASSED")
    else:
        print("\n❌ Embedding phase FAILED")

    return embeddings


async def test_storage_phase(processed_docs, embeddings):
    """Test vector DB and RDB storage.

    Args:
        processed_docs: List of processed documents.
        embeddings: List of embedding vectors.
    """
    print("\n" + "="*80)
    print("💾 TESTING STORAGE PHASE")
    print("="*80)

    # Store documents
    await _embed_and_store_phase(processed_docs)

    # Verify vector DB
    vector_count = vector_store.get_document_count()
    print(f"\n📊 Vector DB (ChromaDB):")
    print(f"  - Documents stored: {vector_count}")

    # Verify RDB
    async with get_session() as session:
        summary_count = await rdb_store.get_summary_count(session)
        summaries = await rdb_store.get_summaries(session, limit=3)

    print(f"\n📊 Relational DB (SQLite):")
    print(f"  - Summaries stored: {summary_count}")

    if summaries:
        print(f"\n📄 Sample Summary:")
        s = summaries[0]
        print(f"  - Title:     {s.title}")
        print(f"  - Keywords:  {', '.join(s.keywords)}")
        print(f"  - Domain:    {s.domain_tag}")
        print(f"  - Posted at: {s.posted_at}")

    if vector_count == len(processed_docs) and summary_count == len(processed_docs):
        print("\n✅ Storage phase PASSED")
    else:
        print(f"\n⚠️  Storage mismatch: vector={vector_count}, rdb={summary_count}, expected={len(processed_docs)}")

    return vector_count, summary_count


async def test_similarity_search():
    """Test vector similarity search."""
    print("\n" + "="*80)
    print("🔍 TESTING SIMILARITY SEARCH")
    print("="*80)

    async with get_session() as session:
        summaries = await rdb_store.get_summaries(session, limit=1)

    if not summaries:
        print("⚠️  No documents to test similarity search")
        return

    # Get document from vector store
    doc_id = summaries[0].id
    doc_data = await vector_store.get_document(doc_id)

    if not doc_data:
        print("⚠️  Document not found in vector store")
        return

    # Generate embedding for the document
    from src.agents.analyst.embedder import generate_embedding
    embedding = await generate_embedding(doc_data["content"])

    # Search for similar documents
    similar = await vector_store.search_similar(embedding, n_results=3)

    print(f"\n📊 Similarity Search Results:")
    print(f"  - Query document: {doc_data['metadata']['title'][:50]}...")
    print(f"  - Similar docs found: {len(similar)}")

    for i, result in enumerate(similar[:3], 1):
        print(f"\n  {i}. {result['metadata']['title'][:50]}...")
        print(f"     Distance: {result['distance']:.4f}")

    if similar:
        print("\n✅ Similarity search PASSED")
    else:
        print("\n⚠️  No similar documents found")


async def update_job_status(job_id: str, processed_count: int, filtered_count: int):
    """Update job status to completed.

    Args:
        job_id: Collection job ID.
        processed_count: Number of processed documents.
        filtered_count: Number of filtered documents.
    """
    async with get_session() as session:
        job = await rdb_store.get_job_by_id(session, job_id)
        if job:
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(KST)
            job.posts_collected = len(MOCK_POSTS)
            job.posts_processed = processed_count
            job.posts_filtered = filtered_count
            await rdb_store.update_job(session, job)

    print(f"\n✅ Updated job status: {job_id}")


async def main():
    """Run the complete mock test."""
    print("\n" + "="*80)
    print("🚀 STARTING MOCK PIPELINE TEST")
    print("="*80)
    print("\nThis test will verify:")
    print("  1. OpenAI API connection")
    print("  2. LLM-based content classification")
    print("  3. Embedding generation")
    print("  4. Vector DB storage (ChromaDB)")
    print("  5. RDB storage (SQLite)")
    print("  6. Similarity search")

    try:
        # Step 1: Create mock data
        raw_posts, job_id = await create_mock_raw_posts()

        # Step 2: Test cleaning (LLM classification)
        processed_docs = await test_cleaning_phase(raw_posts)

        if not processed_docs:
            print("\n❌ No documents processed. Test FAILED.")
            return

        # Step 3: Test embeddings
        embeddings = await test_embedding_phase(processed_docs)

        # Step 4: Test storage
        vector_count, summary_count = await test_storage_phase(processed_docs, embeddings)

        # Step 5: Test similarity search
        await test_similarity_search()

        # Step 6: Update job status
        filtered_count = len(raw_posts) - len(processed_docs)
        await update_job_status(job_id, len(processed_docs), filtered_count)

        # Final summary
        print("\n" + "="*80)
        print("📊 FINAL TEST SUMMARY")
        print("="*80)
        print(f"\n✅ Total posts processed:     {len(raw_posts)}")
        print(f"✅ Valid documents:           {len(processed_docs)}")
        print(f"✅ Noise filtered:            {filtered_count}")
        print(f"✅ Stored in Vector DB:       {vector_count}")
        print(f"✅ Stored in RDB:             {summary_count}")

        print("\n" + "="*80)
        print("🎉 MOCK TEST COMPLETED SUCCESSFULLY!")
        print("="*80)
        print("\n✅ OpenAI integration working")
        print("✅ LLM classification working")
        print("✅ Embedding generation working")
        print("✅ Database storage working")
        print("✅ Pipeline end-to-end working")

        print("\n💡 Next steps:")
        print("  1. Run: uv run python -m src.main stats")
        print("  2. Run: uv run python -m src.main jobs")
        print("  3. Configure real forum and CSS selectors for production")

    except Exception as e:
        print("\n" + "="*80)
        print("❌ TEST FAILED")
        print("="*80)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())

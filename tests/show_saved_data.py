"""Show saved contents in RDB and Vector DB."""

import asyncio
from sqlalchemy import select
from src.models.raw_post import RawPost
from src.models.summary import DocumentSummary
from src.storage import get_session
from src.storage.vector_store import get_collection


async def show_data():
    """Display contents from both databases."""

    print("="*80)
    print("RDB (SQLite) CONTENTS")
    print("="*80)

    # Show raw posts
    async with get_session() as session:
        print("\n1. RAW POSTS TABLE:")
        stmt = select(RawPost).order_by(RawPost.scraped_at.desc()).limit(5)
        result = await session.execute(stmt)
        posts = result.scalars().all()

        print(f"   Total in DB: {len(posts)} (showing latest 5)")
        for i, post in enumerate(posts, 1):
            print(f"\n   {i}. URL: {post.source_url}")
            print(f"      Author Hash: {post.author_hash[:16] if post.author_hash else 'N/A'}...")
            print(f"      Posted: {post.posted_at}")
            print(f"      Scraped: {post.scraped_at}")
            print(f"      Content: {post.content[:150]}...")

    # Show document summaries
    async with get_session() as session:
        print("\n\n2. DOCUMENT SUMMARIES TABLE:")
        stmt = select(DocumentSummary).order_by(DocumentSummary.created_at.desc()).limit(5)
        result = await session.execute(stmt)
        summaries = result.scalars().all()

        print(f"   Total in DB: {len(summaries)} (showing latest 5)")
        for i, summary in enumerate(summaries, 1):
            print(f"\n   {i}. URL: {summary.source_url}")
            print(f"      Title: {summary.title}")
            print(f"      Keywords: {summary.keywords}")
            print(f"      Domain Tag: {summary.domain_tag}")
            print(f"      Trend: {summary.trend}")
            print(f"      Sentiment: {summary.sentiment}")
            print(f"      Posted: {summary.posted_at}")

    print("\n" + "="*80)
    print("VECTOR DB (ChromaDB) CONTENTS")
    print("="*80)

    # Show vector store documents
    collection = get_collection()

    # Get all documents
    results = collection.get(
        limit=5,
        include=["metadatas", "documents"]
    )

    print(f"\n   Total documents: {collection.count()}")
    print(f"   Showing latest 5:")

    for i, (doc_id, metadata, document) in enumerate(zip(
        results['ids'],
        results['metadatas'],
        results['documents']
    ), 1):
        print(f"\n   {i}. Document ID: {doc_id}")
        print(f"      Source URL: {metadata.get('source_url', 'N/A')}")
        print(f"      Title: {metadata.get('title', 'N/A')}")
        print(f"      Keywords: {metadata.get('keywords', 'N/A')}")
        print(f"      Domain: {metadata.get('domain_tag', 'N/A')}")
        print(f"      Trend: {metadata.get('trend', 'N/A')}")
        print(f"      Sentiment: {metadata.get('sentiment', 'N/A')}")
        print(f"      Content: {document[:150]}...")

    print("\n" + "="*80)
    print("\nSUMMARY:")
    async with get_session() as session:
        raw_count = (await session.execute(select(RawPost))).scalars().all()
        summary_count = (await session.execute(select(DocumentSummary))).scalars().all()
        vector_count = collection.count()

        print(f"  Raw Posts in SQLite: {len(raw_count)}")
        print(f"  Document Summaries in SQLite: {len(summary_count)}")
        print(f"  Documents in ChromaDB: {vector_count}")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(show_data())

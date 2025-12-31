"""RAG (Retrieval-Augmented Generation) service for idea generation.

This module provides retrieval of similar market problems from ChromaDB
to enhance AI-generated ideas with real market context.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from src.agents.analyst.embedder import generate_embedding
from src.storage.vector_store import search_similar

logger = logging.getLogger(__name__)

# Similarity threshold for RAG retrieval (cosine distance)
# ChromaDB returns distance, so lower is more similar
# 0.3 distance ≈ 0.85 cosine similarity
DEFAULT_DISTANCE_THRESHOLD = 0.5


@dataclass
class RAGDocument:
    """A document retrieved for RAG context."""

    id: str
    title: str
    content: str
    keywords: list[str]
    domain_tag: str
    trend: str
    sentiment: str
    similarity_score: float  # 0-1, higher is more similar


@dataclass
class RAGContext:
    """Context retrieved from RAG for idea generation."""

    documents: list[RAGDocument]
    query_text: str
    total_retrieved: int


async def retrieve_similar_problems(
    problem_title: str,
    keywords: Optional[list[str]] = None,
    domain_tag: Optional[str] = None,
    top_k: int = 5,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
) -> RAGContext:
    """Retrieve similar problems from ChromaDB for RAG context.

    Args:
        problem_title: Title of the target problem.
        keywords: Optional list of keywords to include in query.
        domain_tag: Optional domain for filtering results.
        top_k: Maximum number of results to return.
        distance_threshold: Maximum distance for results (lower = more similar).

    Returns:
        RAGContext with retrieved documents and metadata.
    """
    # Build query text from title and keywords
    query_parts = [problem_title]
    if keywords:
        query_parts.extend(keywords[:5])  # Limit keywords to avoid too long query
    query_text = " ".join(query_parts)

    logger.info(f"RAG query: '{query_text[:100]}...' (domain={domain_tag})")

    try:
        # Generate embedding for query
        query_embedding = await generate_embedding(query_text)

        # Build filter conditions
        where_filter = None
        if domain_tag:
            where_filter = {"domain_tag": domain_tag}

        # Search for similar documents
        results = await search_similar(
            query_embedding=query_embedding,
            n_results=top_k * 2,  # Get more than needed for filtering
            where=where_filter,
        )

        # Filter by distance threshold and convert to RAGDocument
        documents = []
        for result in results:
            distance = result.get("distance", 1.0)

            # Apply threshold filter
            if distance > distance_threshold:
                continue

            # Convert distance to similarity score (0-1)
            similarity_score = 1.0 - min(distance, 1.0)

            metadata = result.get("metadata", {})
            doc = RAGDocument(
                id=result["id"],
                title=metadata.get("title", "Untitled"),
                content=result.get("content", "")[:1000],  # Limit content size
                keywords=metadata.get("keywords", []),
                domain_tag=metadata.get("domain_tag", "unknown"),
                trend=metadata.get("trend", "STABLE"),
                sentiment=metadata.get("sentiment", "NEUTRAL"),
                similarity_score=similarity_score,
            )
            documents.append(doc)

            if len(documents) >= top_k:
                break

        logger.info(
            f"RAG retrieved {len(documents)} documents "
            f"(threshold={distance_threshold}, top_k={top_k})"
        )

        return RAGContext(
            documents=documents,
            query_text=query_text,
            total_retrieved=len(documents),
        )

    except Exception as e:
        logger.error(f"RAG retrieval failed: {e}")
        # Return empty context on error - allow generation to proceed
        return RAGContext(
            documents=[],
            query_text=query_text,
            total_retrieved=0,
        )


def format_rag_context_for_prompt(rag_context: RAGContext) -> str:
    """Format RAG context for inclusion in LLM prompt.

    Args:
        rag_context: The retrieved RAG context.

    Returns:
        Formatted string for prompt injection.
    """
    if not rag_context.documents:
        return "No related market data available."

    lines = ["## Related Market Problems and Trends\n"]

    for i, doc in enumerate(rag_context.documents, 1):
        lines.append(f"### {i}. {doc.title}")
        lines.append(f"- **Domain**: {doc.domain_tag}")
        lines.append(f"- **Trend**: {doc.trend}")
        lines.append(f"- **Sentiment**: {doc.sentiment}")
        lines.append(f"- **Keywords**: {', '.join(doc.keywords[:5])}")
        lines.append(f"- **Relevance**: {doc.similarity_score:.0%}")
        lines.append(f"\n{doc.content[:500]}...")
        lines.append("")

    return "\n".join(lines)


def rag_context_to_dict(rag_context: RAGContext) -> dict:
    """Convert RAGContext to dictionary for database storage.

    Args:
        rag_context: The RAG context to convert.

    Returns:
        Dictionary representation for JSON storage.
    """
    return {
        "query_text": rag_context.query_text,
        "total_retrieved": rag_context.total_retrieved,
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "domain_tag": doc.domain_tag,
                "trend": doc.trend,
                "similarity_score": doc.similarity_score,
            }
            for doc in rag_context.documents
        ],
    }

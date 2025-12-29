"""ChromaDB vector store operations."""

import logging
from typing import Any, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.config.settings import settings
from src.models.document import ProcessedDocument

logger = logging.getLogger(__name__)

# ChromaDB client (singleton)
_client: Optional[chromadb.ClientAPI] = None
_collection: Optional[chromadb.Collection] = None

COLLECTION_NAME = "market_documents"


def get_client() -> chromadb.ClientAPI:
    """Get or create ChromaDB client.

    Returns:
        ChromaDB client instance.
    """
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info(f"ChromaDB client initialized at {settings.chroma_persist_directory}")
    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the market documents collection.

    Returns:
        ChromaDB collection for market documents.
    """
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={
                "description": "Processed market problem documents for RAG",
                "embedding_model": settings.embedding_model,
                "dimensions": settings.embedding_dimensions,
            },
        )
        logger.info(f"ChromaDB collection '{COLLECTION_NAME}' ready")
    return _collection


def reset_collection() -> None:
    """Reset the collection (for testing purposes)."""
    global _collection
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except ValueError:
        pass  # Collection doesn't exist
    _collection = None
    get_collection()


async def add_document(document: ProcessedDocument, embedding: list[float]) -> str:
    """Add a document with its embedding to the vector store.

    Args:
        document: The processed document to store.
        embedding: The embedding vector for the document.

    Returns:
        The document ID.
    """
    collection = get_collection()

    # Prepare metadata (ChromaDB only supports primitive types)
    metadata = {
        "source_url": document.source_url,
        "title": document.title,
        "keywords": ",".join(document.keywords),  # Store as comma-separated string
        "domain_tag": document.domain_tag,
        "trend": document.trend.value if hasattr(document.trend, "value") else document.trend,
        "sentiment": document.sentiment.value if hasattr(document.sentiment, "value") else document.sentiment,
        "content_hash": document.content_hash,
        "posted_at": document.posted_at.isoformat(),
        "processed_at": document.processed_at.isoformat(),
    }

    if document.collection_job_id:
        metadata["collection_job_id"] = document.collection_job_id

    collection.add(
        ids=[document.id],
        embeddings=[embedding],
        documents=[document.content],
        metadatas=[metadata],
    )

    logger.info(f"Added document {document.id} to vector store")
    return document.id


async def add_documents(
    documents: list[ProcessedDocument], embeddings: list[list[float]]
) -> list[str]:
    """Add multiple documents with their embeddings to the vector store.

    Args:
        documents: List of processed documents to store.
        embeddings: List of embedding vectors.

    Returns:
        List of document IDs.
    """
    if len(documents) != len(embeddings):
        raise ValueError("Number of documents must match number of embeddings")

    if not documents:
        return []

    collection = get_collection()

    ids = [doc.id for doc in documents]
    contents = [doc.content for doc in documents]

    metadatas = []
    for doc in documents:
        metadata = {
            "source_url": doc.source_url,
            "title": doc.title,
            "keywords": ",".join(doc.keywords),
            "domain_tag": doc.domain_tag,
            "trend": doc.trend.value if hasattr(doc.trend, "value") else doc.trend,
            "sentiment": doc.sentiment.value if hasattr(doc.sentiment, "value") else doc.sentiment,
            "content_hash": doc.content_hash,
            "posted_at": doc.posted_at.isoformat(),
            "processed_at": doc.processed_at.isoformat(),
        }
        if doc.collection_job_id:
            metadata["collection_job_id"] = doc.collection_job_id
        metadatas.append(metadata)

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=contents,
        metadatas=metadatas,
    )

    logger.info(f"Added {len(documents)} documents to vector store")
    return ids


async def search_similar(
    query_embedding: list[float],
    n_results: int = 10,
    where: Optional[dict[str, Any]] = None,
) -> list[dict[str, Any]]:
    """Search for similar documents by embedding.

    Args:
        query_embedding: The query embedding vector.
        n_results: Maximum number of results to return.
        where: Optional filter conditions for metadata.

    Returns:
        List of results with id, content, metadata, and distance.
    """
    collection = get_collection()

    query_params: dict[str, Any] = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }

    if where:
        query_params["where"] = where

    results = collection.query(**query_params)

    # Format results
    formatted_results = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            result = {
                "id": doc_id,
                "content": results["documents"][0][i] if results["documents"] else None,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else None,
            }
            # Parse keywords back to list
            if result["metadata"] and "keywords" in result["metadata"]:
                result["metadata"]["keywords"] = result["metadata"]["keywords"].split(",")
            formatted_results.append(result)

    logger.debug(f"Found {len(formatted_results)} similar documents")
    return formatted_results


async def get_document(doc_id: str) -> Optional[dict[str, Any]]:
    """Retrieve a document by ID.

    Args:
        doc_id: The document ID.

    Returns:
        Document data with content and metadata, or None if not found.
    """
    collection = get_collection()

    results = collection.get(
        ids=[doc_id],
        include=["documents", "metadatas"],
    )

    if not results["ids"]:
        logger.debug(f"Document {doc_id} not found in vector store")
        return None

    result = {
        "id": results["ids"][0],
        "content": results["documents"][0] if results["documents"] else None,
        "metadata": results["metadatas"][0] if results["metadatas"] else {},
    }

    # Parse keywords back to list
    if result["metadata"] and "keywords" in result["metadata"]:
        result["metadata"]["keywords"] = result["metadata"]["keywords"].split(",")

    logger.debug(f"Retrieved document {doc_id}")
    return result


async def delete_document(doc_id: str) -> bool:
    """Delete a document from the vector store.

    Args:
        doc_id: The document ID to delete.

    Returns:
        True if deleted, False if not found.
    """
    collection = get_collection()

    # Check if exists
    existing = collection.get(ids=[doc_id])
    if not existing["ids"]:
        return False

    collection.delete(ids=[doc_id])
    logger.info(f"Deleted document {doc_id} from vector store")
    return True


def get_document_count() -> int:
    """Get the total number of documents in the collection.

    Returns:
        Number of documents.
    """
    collection = get_collection()
    return collection.count()

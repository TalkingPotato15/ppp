"""Storage module for Data Pipeline (ChromaDB vector store)."""

from src.storage.vector_store import (
    get_collection,
    add_documents,
    search_similar,
    delete_documents,
)

__all__ = [
    "get_collection",
    "add_documents",
    "search_similar",
    "delete_documents",
]

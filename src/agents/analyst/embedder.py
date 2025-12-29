"""Embedding generator using OpenAI text-embedding-3-small."""

import logging
from typing import Optional

from openai import AsyncOpenAI

from src.config.settings import settings

logger = logging.getLogger(__name__)

# OpenAI client (singleton)
_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    """Get or create OpenAI client for embeddings.

    Returns:
        AsyncOpenAI client instance.
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info("OpenAI embedding client initialized")
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding for a single text.

    Args:
        text: The text to embed.

    Returns:
        List of floats representing the embedding vector.
    """
    client = get_client()

    # Truncate text if too long (max ~8000 tokens for text-embedding-3-small)
    max_chars = 30000  # Approximate character limit
    if len(text) > max_chars:
        logger.warning(f"Text truncated from {len(text)} to {max_chars} chars for embedding")
        text = text[:max_chars]

    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text,
    )

    embedding = response.data[0].embedding
    logger.debug(f"Generated embedding with {len(embedding)} dimensions")

    return embedding


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in batch.

    Args:
        texts: List of texts to embed.

    Returns:
        List of embedding vectors.
    """
    if not texts:
        return []

    client = get_client()

    # Truncate each text if necessary
    max_chars = 30000
    processed_texts = []
    for text in texts:
        if len(text) > max_chars:
            logger.warning(f"Text truncated from {len(text)} to {max_chars} chars for embedding")
            processed_texts.append(text[:max_chars])
        else:
            processed_texts.append(text)

    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=processed_texts,
    )

    embeddings = [data.embedding for data in response.data]
    logger.info(f"Generated {len(embeddings)} embeddings with {len(embeddings[0])} dimensions each")

    return embeddings

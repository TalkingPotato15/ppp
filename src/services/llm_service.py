"""LLM service wrapper for OpenAI GPT-4o-mini."""

import json
import logging
from typing import Any, Optional

from openai import AsyncOpenAI

from src.config.settings import settings

logger = logging.getLogger(__name__)

# OpenAI client (singleton)
_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    """Get or create OpenAI client.

    Returns:
        AsyncOpenAI client instance.
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info("OpenAI client initialized")
    return _client


async def chat_completion(
    messages: list[dict[str, str]],
    model: str = None,
    temperature: float = 0.0,
    response_format: Optional[dict] = None,
) -> str:
    """Send a chat completion request to OpenAI.

    Args:
        messages: List of message dicts with 'role' and 'content'.
        model: Model to use. Defaults to settings.llm_model.
        temperature: Sampling temperature. Lower = more deterministic.
        response_format: Optional response format (e.g., {"type": "json_object"}).

    Returns:
        The assistant's response content.
    """
    client = get_client()
    model = model or settings.llm_model

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format

    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content or ""
    logger.debug(f"LLM response: {content[:200]}...")
    return content


async def classify_content(content: str) -> dict[str, Any]:
    """Classify content as noise or valid, and extract metadata if valid.

    Args:
        content: The raw post content to classify.

    Returns:
        Dict with 'is_noise' bool and metadata if valid.
    """
    system_prompt = """You are a content classifier for a Korean real estate forum.
Your job is to:
1. Determine if the post is noise (advertisement, spam, off-topic, irrelevant)
2. If valid, extract: title, keywords (3-10), trend (RISING/STABLE/DECLINING), sentiment (POSITIVE/NEUTRAL/NEGATIVE)

Respond in JSON format:
{
    "is_noise": true/false,
    "noise_reason": "reason if noise, null otherwise",
    "title": "extracted or generated title (10-500 chars)",
    "keywords": ["keyword1", "keyword2", ...],
    "trend": "RISING/STABLE/DECLINING",
    "sentiment": "POSITIVE/NEUTRAL/NEGATIVE",
    "summary": "brief summary of the content"
}

Rules:
- Ads, promotions, sales pitches = noise
- Spam, repetitive content = noise
- Off-topic (not about real estate) = noise
- Too short or meaningless = noise
- Valid posts discuss real estate problems, questions, experiences
- Keywords should be relevant to real estate topics
- Trend based on discussion volume indicators in content
- Sentiment based on overall tone"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Classify this post:\n\n{content[:4000]}"},
    ]

    response = await chat_completion(
        messages=messages,
        temperature=0.0,
        response_format={"type": "json_object"},
    )

    try:
        result = json.loads(response)
        return result
    except json.JSONDecodeError:
        logger.error(f"Failed to parse LLM response as JSON: {response}")
        return {"is_noise": True, "noise_reason": "Failed to classify"}

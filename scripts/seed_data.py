"""Seed script to populate database with test data."""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from uuid import uuid4
from datetime import datetime, timedelta
import random

from src.storage import async_session_factory, init_db
from src.models import Trend, Sentiment
from src.models.summary import DocumentSummary


SAMPLE_PROBLEMS = [
    {
        "title": "Small businesses struggle to manage customer relationships effectively without expensive CRM solutions",
        "keywords": ["CRM", "small business", "customer management", "affordable", "automation"],
        "domain_tag": "Business Software",
        "trend": Trend.RISING,
        "sentiment": Sentiment.NEGATIVE,
    },
    {
        "title": "Remote teams lack effective tools for asynchronous collaboration and project tracking",
        "keywords": ["remote work", "collaboration", "async", "project management", "distributed teams"],
        "domain_tag": "Productivity",
        "trend": Trend.RISING,
        "sentiment": Sentiment.NEUTRAL,
    },
    {
        "title": "E-commerce sellers find it difficult to optimize pricing strategies in real-time",
        "keywords": ["e-commerce", "pricing", "dynamic pricing", "competition", "analytics"],
        "domain_tag": "E-commerce",
        "trend": Trend.RISING,
        "sentiment": Sentiment.NEGATIVE,
    },
    {
        "title": "Healthcare providers need better patient engagement and appointment scheduling systems",
        "keywords": ["healthcare", "patient engagement", "scheduling", "medical", "telemedicine"],
        "domain_tag": "Healthcare",
        "trend": Trend.STABLE,
        "sentiment": Sentiment.NEUTRAL,
    },
    {
        "title": "Content creators struggle to repurpose content across multiple platforms efficiently",
        "keywords": ["content creation", "social media", "repurposing", "automation", "marketing"],
        "domain_tag": "Marketing",
        "trend": Trend.RISING,
        "sentiment": Sentiment.POSITIVE,
    },
    {
        "title": "Restaurants face challenges in managing inventory and reducing food waste",
        "keywords": ["restaurant", "inventory", "food waste", "sustainability", "management"],
        "domain_tag": "Food & Beverage",
        "trend": Trend.STABLE,
        "sentiment": Sentiment.NEGATIVE,
    },
    {
        "title": "Freelancers need better tools for invoicing, time tracking, and client management",
        "keywords": ["freelance", "invoicing", "time tracking", "client management", "gig economy"],
        "domain_tag": "Business Software",
        "trend": Trend.RISING,
        "sentiment": Sentiment.NEUTRAL,
    },
    {
        "title": "Educational institutions struggle to provide personalized learning experiences at scale",
        "keywords": ["education", "personalized learning", "EdTech", "AI", "students"],
        "domain_tag": "Education",
        "trend": Trend.RISING,
        "sentiment": Sentiment.POSITIVE,
    },
    {
        "title": "Real estate agents lack tools for virtual property tours and lead qualification",
        "keywords": ["real estate", "virtual tours", "lead generation", "property", "automation"],
        "domain_tag": "Real Estate",
        "trend": Trend.STABLE,
        "sentiment": Sentiment.NEUTRAL,
    },
    {
        "title": "Fitness enthusiasts want AI-powered personal training and nutrition guidance",
        "keywords": ["fitness", "AI", "personal training", "nutrition", "health"],
        "domain_tag": "Health & Fitness",
        "trend": Trend.RISING,
        "sentiment": Sentiment.POSITIVE,
    },
    {
        "title": "Supply chain managers need better visibility and predictive analytics for logistics",
        "keywords": ["supply chain", "logistics", "analytics", "prediction", "inventory"],
        "domain_tag": "Logistics",
        "trend": Trend.RISING,
        "sentiment": Sentiment.NEUTRAL,
    },
    {
        "title": "Legal professionals need tools to automate document review and contract analysis",
        "keywords": ["legal", "document review", "contract", "automation", "AI"],
        "domain_tag": "Legal",
        "trend": Trend.RISING,
        "sentiment": Sentiment.POSITIVE,
    },
]


async def seed_problems():
    """Seed the database with sample problems."""
    await init_db()

    async with async_session_factory() as session:
        # Check if data already exists
        from sqlalchemy import select, func
        result = await session.execute(
            select(func.count()).select_from(DocumentSummary)
        )
        count = result.scalar()

        if count > 0:
            print(f"Database already has {count} problems. Skipping seed.")
            return

        # Create sample problems
        for i, problem_data in enumerate(SAMPLE_PROBLEMS):
            problem = DocumentSummary(
                id=str(uuid4()),
                title=problem_data["title"],
                keywords=problem_data["keywords"],
                domain_tag=problem_data["domain_tag"],
                trend=problem_data["trend"],
                sentiment=problem_data["sentiment"],
                source_url=f"https://example.com/problem/{i+1}",
                posted_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                created_at=datetime.utcnow(),
            )
            session.add(problem)

        await session.commit()
        print(f"Successfully seeded {len(SAMPLE_PROBLEMS)} problems!")


async def main():
    """Main entry point."""
    print("Seeding database with test data...")
    await seed_problems()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())

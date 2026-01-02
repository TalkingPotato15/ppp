"""AI Agent service for idea generation.

This module provides Agent 2 (Strategic Planner) implementation
that generates business ideas using RAG-enhanced prompts.
"""

import asyncio
import json
import logging
import random
from dataclasses import dataclass, field
from typing import Optional

from openai import AsyncOpenAI

from src.config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class GeneratedIdeaData:
    """Data structure for a generated idea."""

    title: str
    description: str
    target_audience: str
    differentiators: list[str]
    market_opportunity: str
    implementation_hints: str
    market_signals: list[str] = field(default_factory=list)
    confidence_score: float = 0.5


# Mock idea templates for realistic responses
MOCK_IDEA_TEMPLATES = [
    {
        "title": "AI-Powered {domain} Analytics Platform",
        "description": "An intelligent analytics platform that uses machine learning to analyze {domain} data and provide actionable insights. The system processes large volumes of data in real-time, identifying patterns and trends that human analysts might miss. It offers customizable dashboards, automated reporting, and predictive analytics to help businesses make data-driven decisions.",
        "target_audience": "Business analysts, data scientists, and decision-makers in the {domain} industry who need to extract insights from complex data sets",
        "differentiators": [
            "Real-time data processing with sub-second latency",
            "AI-driven anomaly detection and alerting",
            "Natural language query interface",
            "Integration with 50+ data sources",
        ],
        "market_opportunity": "The {domain} analytics market is growing rapidly as businesses seek to leverage data for competitive advantage. With increasing data volumes and complexity, there's strong demand for AI-powered solutions that can automate analysis and surface insights.",
        "implementation_hints": "Start with a focused MVP targeting a specific use case. Build REST APIs for data ingestion and use a scalable processing framework. Consider cloud deployment for flexibility and integrate with popular BI tools.",
    },
    {
        "title": "Smart {domain} Automation Assistant",
        "description": "A conversational AI assistant designed specifically for {domain} workflows. It automates repetitive tasks, answers questions using a knowledge base, and guides users through complex processes. The assistant learns from interactions to improve its responses over time.",
        "target_audience": "Professionals in the {domain} sector who spend significant time on routine tasks and need quick access to information",
        "differentiators": [
            "Domain-specific training for accurate responses",
            "Workflow automation with approval chains",
            "Multi-channel support (web, mobile, voice)",
            "Continuous learning from user feedback",
        ],
        "market_opportunity": "Automation and AI assistants are transforming how work gets done. The {domain} sector has many opportunities for efficiency gains through intelligent automation, particularly for knowledge-intensive tasks.",
        "implementation_hints": "Begin with a chatbot interface and integrate with existing systems via APIs. Use a combination of rule-based and ML approaches. Start with high-volume, well-defined tasks for automation.",
    },
    {
        "title": "{domain} Marketplace Platform",
        "description": "A digital marketplace connecting buyers and sellers in the {domain} space. The platform provides tools for listing, discovery, transactions, and relationship management. It includes features like verified profiles, reviews, secure payments, and dispute resolution.",
        "target_audience": "Buyers and sellers in the {domain} market who need a trusted platform for transactions and networking",
        "differentiators": [
            "Verified participant profiles with trust scores",
            "AI-powered matching and recommendations",
            "Integrated payment and escrow services",
            "Analytics and market insights for participants",
        ],
        "market_opportunity": "Digital marketplaces are disrupting traditional {domain} channels. There's opportunity to create a more efficient, transparent marketplace that reduces friction and builds trust between participants.",
        "implementation_hints": "Focus on building trust and liquidity. Start with one side of the marketplace and expand. Implement strong verification and review systems. Consider freemium model with premium features.",
    },
    {
        "title": "Predictive {domain} Intelligence System",
        "description": "An AI system that forecasts trends, risks, and opportunities in the {domain} sector. It combines multiple data sources including news, market data, and proprietary signals to generate predictions. Users receive alerts and recommendations based on their interests and risk tolerance.",
        "target_audience": "Investors, strategists, and executives in {domain} who need forward-looking insights for planning and decision-making",
        "differentiators": [
            "Multi-source data fusion for comprehensive analysis",
            "Explainable AI with clear reasoning",
            "Customizable alert thresholds and preferences",
            "Historical accuracy tracking and improvement",
        ],
        "market_opportunity": "The demand for predictive intelligence is growing as markets become more dynamic and competitive. Organizations in {domain} are willing to pay premium for early warning signals and actionable predictions.",
        "implementation_hints": "Start with a specific prediction type and expand. Build a data pipeline for ingesting multiple sources. Track and publish accuracy metrics to build credibility. Offer tiered access levels.",
    },
    {
        "title": "{domain} Process Optimization Tool",
        "description": "A software tool that analyzes and optimizes business processes in the {domain} industry. It uses process mining to discover actual workflows, identifies bottlenecks and inefficiencies, and recommends improvements. The tool provides simulation capabilities to test changes before implementation.",
        "target_audience": "Operations managers, process improvement specialists, and consultants working in {domain} organizations",
        "differentiators": [
            "Automated process discovery from system logs",
            "What-if simulation for change impact analysis",
            "Benchmarking against industry standards",
            "Integration with workflow automation tools",
        ],
        "market_opportunity": "Process optimization delivers measurable ROI through cost reduction and efficiency gains. The {domain} sector has complex processes that benefit from systematic analysis and improvement.",
        "implementation_hints": "Build connectors for common enterprise systems. Provide clear visualization of processes. Start with industries that have high process compliance requirements. Offer consulting services alongside the tool.",
    },
]


SYSTEM_PROMPT = """You are Agent 2: Strategic Planner, an expert business strategist who generates innovative business ideas based on market problems.

Your role:
- Analyze market problems and related data to identify business opportunities
- Generate practical, actionable business ideas grounded in real market signals
- Provide specific, differentiated solutions that address the core problem
- Consider the target audience, market opportunity, and implementation feasibility

Guidelines:
1. Each idea must directly address the given problem
2. Ideas should be grounded in the provided market context when available
3. Include specific market signals that support each idea
4. Assign a confidence score (0.0-1.0) based on how well the idea is supported by market data
5. Be creative but realistic - ideas should be implementable

Output format: JSON array of 3-5 ideas with the following structure:
{
  "ideas": [
    {
      "title": "Concise, compelling title",
      "description": "2-3 sentence description of the business concept",
      "target_audience": "Specific target customer segment",
      "differentiators": ["Key differentiator 1", "Key differentiator 2", "Key differentiator 3"],
      "market_opportunity": "Why this opportunity exists and its potential",
      "implementation_hints": "Practical steps to get started",
      "market_signals": ["Signal 1 from market data", "Signal 2 from market data"],
      "confidence_score": 0.75
    }
  ]
}"""


class AIAgentService:
    """Service for generating business ideas using AI (Agent 2: Strategic Planner).

    Uses OpenAI GPT models with RAG-enhanced prompts to generate
    business ideas grounded in real market data.
    """

    def __init__(self, use_mock: bool = False):
        """Initialize the AI Agent service.

        Args:
            use_mock: Force mock mode for testing (default: False, uses real LLM).
        """
        self._use_mock = use_mock
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI client initialized for AI Agent")
        return self._client

    async def generate_ideas(
        self,
        problem_title: str,
        keywords: list[str],
        domain: str,
        trend: str,
        sentiment: str,
        rag_context: Optional[str] = None,
    ) -> list[GeneratedIdeaData]:
        """Generate business ideas based on the problem context.

        Args:
            problem_title: Title of the market problem.
            keywords: List of relevant keywords.
            domain: Domain/industry category.
            trend: Trend indicator (RISING, STABLE, DECLINING).
            sentiment: Sentiment indicator (POSITIVE, NEUTRAL, NEGATIVE).
            rag_context: Optional formatted RAG context for grounding.

        Returns:
            List of generated idea data objects.
        """
        if self._use_mock or not settings.openai_api_key:
            logger.warning("Using mock ideas (no API key or mock mode)")
            return await self._generate_mock_ideas(
                problem_title, keywords, domain, trend, sentiment
            )
        else:
            return await self._generate_real_ideas(
                problem_title, keywords, domain, trend, sentiment, rag_context
            )

    async def _generate_mock_ideas(
        self,
        problem_title: str,
        keywords: list[str],
        domain: str,
        trend: str,
        sentiment: str,
    ) -> list[GeneratedIdeaData]:
        """Generate mock ideas for development.

        Simulates AI processing with realistic delay and returns
        templated ideas customized with the problem context.
        """
        # Simulate processing time (2-5 seconds)
        await asyncio.sleep(random.uniform(2.0, 5.0))

        # Select 3-5 random templates
        num_ideas = random.randint(3, 5)
        selected_templates = random.sample(
            MOCK_IDEA_TEMPLATES, min(num_ideas, len(MOCK_IDEA_TEMPLATES))
        )

        # Generate ideas from templates
        # Convert underscores to spaces for readable formatting
        domain_display = domain.replace('_', ' ')

        ideas = []
        for i, template in enumerate(selected_templates):
            idea = GeneratedIdeaData(
                title=template["title"].format(domain=domain_display.title()),
                description=template["description"].format(domain=domain_display.lower()),
                target_audience=template["target_audience"].format(domain=domain_display.lower()),
                differentiators=template["differentiators"].copy(),
                market_opportunity=template["market_opportunity"].format(
                    domain=domain_display.lower()
                ),
                implementation_hints=template["implementation_hints"],
                market_signals=[
                    f"Market trend: {trend}",
                    f"User sentiment: {sentiment}",
                    f"Keywords: {', '.join(keywords[:3])}",
                ],
                confidence_score=round(random.uniform(0.6, 0.9), 2),
            )
            ideas.append(idea)

        return ideas

    def _build_user_prompt(
        self,
        problem_title: str,
        keywords: list[str],
        domain: str,
        trend: str,
        sentiment: str,
        rag_context: Optional[str] = None,
    ) -> str:
        """Build the user prompt for idea generation."""
        prompt_parts = [
            "## Target Problem\n",
            f"**Title**: {problem_title}\n",
            f"**Domain**: {domain}\n",
            f"**Trend**: {trend}\n",
            f"**Sentiment**: {sentiment}\n",
            f"**Keywords**: {', '.join(keywords)}\n",
        ]

        if rag_context:
            prompt_parts.append("\n---\n")
            prompt_parts.append(rag_context)

        prompt_parts.append("\n---\n")
        prompt_parts.append(
            "Generate 3-5 innovative business ideas that address this market problem. "
            "Ground your ideas in the market signals and related problems provided. "
            "Return ONLY valid JSON in the specified format."
        )

        return "".join(prompt_parts)

    async def _generate_real_ideas(
        self,
        problem_title: str,
        keywords: list[str],
        domain: str,
        trend: str,
        sentiment: str,
        rag_context: Optional[str] = None,
    ) -> list[GeneratedIdeaData]:
        """Generate ideas using OpenAI GPT models.

        Uses RAG-enhanced prompts to generate grounded business ideas.
        """
        client = self._get_client()

        user_prompt = self._build_user_prompt(
            problem_title, keywords, domain, trend, sentiment, rag_context
        )

        logger.info(f"Generating ideas for: {problem_title[:50]}...")

        try:
            response = await client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.8,
                max_tokens=4000,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            # Parse JSON response
            data = json.loads(content)
            ideas_data = data.get("ideas", [])

            if not ideas_data:
                raise ValueError("No ideas in response")

            # Convert to GeneratedIdeaData objects
            ideas = []
            for idea_dict in ideas_data:
                idea = GeneratedIdeaData(
                    title=idea_dict.get("title", "Untitled Idea"),
                    description=idea_dict.get("description", ""),
                    target_audience=idea_dict.get("target_audience", ""),
                    differentiators=idea_dict.get("differentiators", []),
                    market_opportunity=idea_dict.get("market_opportunity", ""),
                    implementation_hints=idea_dict.get("implementation_hints", ""),
                    market_signals=idea_dict.get("market_signals", []),
                    confidence_score=min(
                        1.0, max(0.0, float(idea_dict.get("confidence_score", 0.5)))
                    ),
                )
                ideas.append(idea)

            logger.info(f"Generated {len(ideas)} ideas successfully")
            return ideas

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise ValueError(f"Invalid JSON response from LLM: {e}")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise


# Singleton instance for the application
ai_agent = AIAgentService()

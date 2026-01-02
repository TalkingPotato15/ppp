import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

export interface GeneratedIdeaData {
  title: string;
  description: string;
  target_audience: string;
  differentiators: string[];
  market_opportunity: string;
  implementation_hints: string;
  market_signals: string[];
  confidence_score: number;
}

const SYSTEM_PROMPT = `You are Agent 2: Strategic Planner, an expert business strategist who generates innovative business ideas based on market problems.

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
}`;

/**
 * Build the user prompt for idea generation
 */
function buildUserPrompt(params: {
  problemTitle: string;
  keywords: string[];
  domain: string;
  trend: string;
  sentiment: string;
  ragContext?: string;
}): string {
  const parts = [
    '## Target Problem\n',
    `**Title**: ${params.problemTitle}\n`,
    `**Domain**: ${params.domain}\n`,
    `**Trend**: ${params.trend}\n`,
    `**Sentiment**: ${params.sentiment}\n`,
    `**Keywords**: ${params.keywords.join(', ')}\n`,
  ];

  if (params.ragContext) {
    parts.push('\n---\n');
    parts.push(params.ragContext);
  }

  parts.push('\n---\n');
  parts.push(
    'Generate 3-5 innovative business ideas that address this market problem. ' +
      'Ground your ideas in the market signals and related problems provided. ' +
      'Return ONLY valid JSON in the specified format.'
  );

  return parts.join('');
}

/**
 * Generate business ideas using OpenAI
 */
export async function generateIdeas(params: {
  problemTitle: string;
  keywords: string[];
  domain: string;
  trend: string;
  sentiment: string;
  ragContext?: string;
}): Promise<GeneratedIdeaData[]> {
  const userPrompt = buildUserPrompt(params);

  console.log(`Generating ideas for: ${params.problemTitle.slice(0, 50)}...`);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // Parse JSON response
    const data = JSON.parse(content);
    const ideasData = data.ideas || [];

    if (!ideasData.length) {
      throw new Error('No ideas in response');
    }

    // Convert to typed objects
    const ideas: GeneratedIdeaData[] = ideasData.map(
      (idea: Record<string, unknown>) => ({
        title: (idea.title as string) || 'Untitled Idea',
        description: (idea.description as string) || '',
        target_audience: (idea.target_audience as string) || '',
        differentiators: (idea.differentiators as string[]) || [],
        market_opportunity: (idea.market_opportunity as string) || '',
        implementation_hints: (idea.implementation_hints as string) || '',
        market_signals: (idea.market_signals as string[]) || [],
        confidence_score: Math.min(
          1.0,
          Math.max(0.0, Number(idea.confidence_score) || 0.5)
        ),
      })
    );

    console.log(`Generated ${ideas.length} ideas successfully`);
    return ideas;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Failed to parse LLM response:', error);
      throw new Error(`Invalid JSON response from LLM: ${error.message}`);
    }
    console.error('LLM generation failed:', error);
    throw error;
  }
}

/**
 * Generate mock ideas for testing (when no API key)
 */
export async function generateMockIdeas(params: {
  problemTitle: string;
  keywords: string[];
  domain: string;
  trend: string;
  sentiment: string;
}): Promise<GeneratedIdeaData[]> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

  const domainDisplay = params.domain.replace(/_/g, ' ');

  const mockTemplates = [
    {
      title: `AI-Powered ${domainDisplay} Analytics Platform`,
      description: `An intelligent analytics platform that uses machine learning to analyze ${domainDisplay.toLowerCase()} data and provide actionable insights.`,
      target_audience: `Business analysts and decision-makers in the ${domainDisplay.toLowerCase()} industry`,
      differentiators: [
        'Real-time data processing',
        'AI-driven anomaly detection',
        'Natural language query interface',
      ],
      market_opportunity: `The ${domainDisplay.toLowerCase()} analytics market is growing rapidly.`,
      implementation_hints: 'Start with a focused MVP targeting a specific use case.',
    },
    {
      title: `Smart ${domainDisplay} Automation Assistant`,
      description: `A conversational AI assistant designed specifically for ${domainDisplay.toLowerCase()} workflows.`,
      target_audience: `Professionals in the ${domainDisplay.toLowerCase()} sector`,
      differentiators: [
        'Domain-specific training',
        'Workflow automation',
        'Multi-channel support',
      ],
      market_opportunity: `Automation is transforming the ${domainDisplay.toLowerCase()} sector.`,
      implementation_hints: 'Begin with a chatbot interface and integrate with existing systems.',
    },
    {
      title: `${domainDisplay} Marketplace Platform`,
      description: `A digital marketplace connecting buyers and sellers in the ${domainDisplay.toLowerCase()} space.`,
      target_audience: `Buyers and sellers in the ${domainDisplay.toLowerCase()} market`,
      differentiators: [
        'Verified profiles',
        'AI-powered matching',
        'Integrated payments',
      ],
      market_opportunity: `Digital marketplaces are disrupting traditional ${domainDisplay.toLowerCase()} channels.`,
      implementation_hints: 'Focus on building trust and liquidity.',
    },
  ];

  return mockTemplates.map((template, index) => ({
    ...template,
    market_signals: [
      `Market trend: ${params.trend}`,
      `User sentiment: ${params.sentiment}`,
      `Keywords: ${params.keywords.slice(0, 3).join(', ')}`,
    ],
    confidence_score: 0.6 + Math.random() * 0.3,
  }));
}

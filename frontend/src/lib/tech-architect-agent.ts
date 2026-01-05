import OpenAI from 'openai';
import type {
  UserConstraints,
  PRDDocument,
  ArchitectureDiagram,
  MVPRoadmap,
  TechStackRecommendation,
  BUDGET_DISPLAY,
  TIMELINE_DISPLAY,
} from '@/types/stage-c';

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

// Use GPT-4o for better structured output (upgrade from gpt-4o-mini)
const LLM_MODEL = process.env.TECH_ARCHITECT_MODEL || 'gpt-4o';

export interface TechArchitectInput {
  ideaTitle: string;
  ideaDescription: string;
  targetAudience: string;
  differentiators: string[];
  marketOpportunity: string;
  problemTitle: string;
  problemDomain: string;
  constraints: UserConstraints;
  ragContext?: string;
}

export interface TechArchitectOutput {
  prd: PRDDocument;
  architecture: ArchitectureDiagram;
  roadmap: MVPRoadmap;
  techStack: TechStackRecommendation[];
}

const SYSTEM_PROMPT = `You are Agent 3: Tech Architect, a senior software architect specializing in startup technical planning.

Your role:
- Analyze business ideas and user constraints to create developer-ready technical specifications
- Generate architecture recommendations dynamically based on constraints (NOT from templates)
- Provide actionable PRD, system architecture, MVP roadmap, and tech stack recommendations
- All user-facing content MUST be in English.

CONSTRAINTS HANDLING:
- Budget ranges in Korean Won (KRW):
  - Under 10M KRW (< ₩10M): Serverless, free/open-source, minimal infrastructure
  - 10M-50M KRW (₩10M-50M): Managed services, basic paid tools
  - 50M-200M KRW (₩50M-200M): Enterprise tools, dedicated infrastructure
  - Over 200M KRW (> ₩200M): Full enterprise stack

- Team size affects architecture complexity:
  - 1-2 people: Monolithic, simpler architecture
  - 3-5 people: Modular monolith, microservices-lite
  - 6+ people: Full microservices possible

- Timeline affects scope:
  - 1-3 months: Core MVP only
  - 3-6 months: MVP + essential integrations
  - 6-12 months: Full feature set
  - 12+ months: Enterprise-grade with scalability

Each tech recommendation MUST explicitly address:
1. Why it fits the budget
2. Why it's suitable for the team size/skills
3. Why it's achievable in the timeline

Output format: JSON object with the following structure:
{
  "prd": {
    "title": "Product name",
    "overview": "1-2 paragraph overview",
    "requirements": [
      {
        "id": "REQ-001",
        "priority": "P0|P1|P2|P3",
        "description": "Requirement description",
        "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
      }
    ],
    "userStories": ["As a user, I want..."],
    "scope": {
      "included": ["Feature 1", "Feature 2"],
      "excluded": ["Out of scope 1"]
    }
  },
  "architecture": {
    "diagramCode": "Mermaid.js flowchart code",
    "components": [
      {
        "name": "Component name",
        "description": "What it does",
        "technology": "Specific tech choice",
        "responsibilities": ["Responsibility 1", "Responsibility 2"]
      }
    ],
    "integrations": ["External service 1", "API 2"]
  },
  "roadmap": {
    "phases": [
      {
        "name": "Phase name",
        "duration": "e.g., 4 weeks",
        "milestones": ["Milestone 1", "Milestone 2"],
        "deliverables": ["Deliverable 1", "Deliverable 2"],
        "dependencies": ["Dependency 1"]
      }
    ],
    "totalDuration": "e.g., 3 months"
  },
  "techStack": [
    {
      "category": "frontend|backend|database|infrastructure|monitoring|ci_cd",
      "recommended": "Primary technology",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "rationale": "Why this choice",
      "estimatedCost": "Monthly cost in KRW (e.g., 300,000 KRW/month)",
      "constraintAlignment": {
        "budget": "How it fits budget",
        "team": "How it fits team",
        "timeline": "How it fits timeline"
      }
    }
  ]
}`;

function formatBudgetRange(budget: UserConstraints['budget']): string {
  const displayMap: Record<string, string> = {
    UNDER_10M: 'Under 10M KRW',
    '10M_TO_50M': '10M ~ 50M KRW',
    '50M_TO_200M': '50M ~ 200M KRW',
    OVER_200M: 'Over 200M KRW',
  };
  return displayMap[budget.range] || budget.displayText;
}

function formatTimeline(timeline: string): string {
  const displayMap: Record<string, string> = {
    '1_TO_3_MONTHS': '1-3 Months',
    '3_TO_6_MONTHS': '3-6 Months',
    '6_TO_12_MONTHS': '6-12 Months',
    OVER_12_MONTHS: 'Over 12 Months',
  };
  return displayMap[timeline] || timeline;
}

function buildUserPrompt(input: TechArchitectInput): string {
  const { constraints } = input;
  const teamLevels = [];
  if (constraints.team.composition.junior > 0)
    teamLevels.push(`Junior ${constraints.team.composition.junior}`);
  if (constraints.team.composition.middle > 0)
    teamLevels.push(`Middle ${constraints.team.composition.middle}`);
  if (constraints.team.composition.senior > 0)
    teamLevels.push(`Senior ${constraints.team.composition.senior}`);

  const parts = [
    '## Business Idea\n',
    `**Title**: ${input.ideaTitle}\n`,
    `**Description**: ${input.ideaDescription}\n`,
    `**Target Audience**: ${input.targetAudience}\n`,
    `**Differentiators**: ${input.differentiators.join(', ')}\n`,
    `**Market Opportunity**: ${input.marketOpportunity}\n\n`,
    '## Original Problem\n',
    `**Problem**: ${input.problemTitle}\n`,
    `**Domain**: ${input.problemDomain}\n\n`,
    '## User Constraints\n',
    `**Budget**: ${formatBudgetRange(constraints.budget)}`,
    constraints.budget.specificAmount
      ? ` (Specific: ${constraints.budget.specificAmount.toLocaleString()} KRW)`
      : '',
    '\n',
    `**Team Size**: Total ${constraints.team.size} (${teamLevels.join(', ')})\n`,
    `**Target Timeline**: ${formatTimeline(constraints.timeline)}\n`,
  ];

  if (constraints.techPreferences) {
    if (constraints.techPreferences.languages?.length) {
      parts.push(
        `**Preferred Languages**: ${constraints.techPreferences.languages.join(', ')}\n`
      );
    }
    if (constraints.techPreferences.frameworks?.length) {
      parts.push(
        `**Preferred Frameworks**: ${constraints.techPreferences.frameworks.join(', ')}\n`
      );
    }
    if (constraints.techPreferences.platforms?.length) {
      parts.push(
        `**Preferred Platforms**: ${constraints.techPreferences.platforms.join(', ')}\n`
      );
    }
  }

  if (constraints.existingInfrastructure?.length) {
    parts.push(
      `**Existing Infrastructure**: ${constraints.existingInfrastructure.join(', ')}\n`
    );
  }

  if (input.ragContext) {
    parts.push('\n---\n## Related Market Context\n');
    parts.push(input.ragContext);
  }

  parts.push('\n---\n');
  parts.push(
    'Analyze the business idea and constraints above to generate technical specifications that developers can use immediately. ' +
      'All technology choices MUST include clear rationale fitting the constraints (budget, team, timeline). ' +
      'Mermaid.js diagram code should be in flowchart TD format. ' +
      'Return ONLY valid JSON in the specified format.'
  );

  return parts.join('');
}

/**
 * Generate technical specification using Tech Architect Agent (Agent 3)
 */
export async function generateTechnicalSpecification(
  input: TechArchitectInput
): Promise<TechArchitectOutput> {
  const userPrompt = buildUserPrompt(input);

  console.log(
    `[Tech Architect] Generating spec for: ${input.ideaTitle.slice(0, 50)}...`
  );

  try {
    const response = await getOpenAI().chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from Tech Architect Agent');
    }

    const data = JSON.parse(content);

    // Validate required fields
    if (!data.prd || !data.architecture || !data.roadmap || !data.techStack) {
      throw new Error('Incomplete response from Tech Architect Agent');
    }

    // Type-safe conversion
    const output: TechArchitectOutput = {
      prd: {
        title: data.prd.title || input.ideaTitle,
        overview: data.prd.overview || '',
        requirements: (data.prd.requirements || []).map(
          (req: Record<string, unknown>) => ({
            id: (req.id as string) || 'REQ-000',
            priority: (req.priority as string) || 'P2',
            description: (req.description as string) || '',
            acceptanceCriteria: (req.acceptanceCriteria as string[]) || [],
          })
        ),
        userStories: data.prd.userStories || [],
        scope: {
          included: data.prd.scope?.included || [],
          excluded: data.prd.scope?.excluded || [],
        },
      },
      architecture: {
        diagramCode: data.architecture.diagramCode || '',
        components: (data.architecture.components || []).map(
          (comp: Record<string, unknown>) => ({
            name: (comp.name as string) || '',
            description: (comp.description as string) || '',
            technology: (comp.technology as string) || '',
            responsibilities: (comp.responsibilities as string[]) || [],
          })
        ),
        integrations: data.architecture.integrations || [],
      },
      roadmap: {
        phases: (data.roadmap.phases || []).map(
          (phase: Record<string, unknown>) => ({
            name: (phase.name as string) || '',
            duration: (phase.duration as string) || '',
            milestones: (phase.milestones as string[]) || [],
            deliverables: (phase.deliverables as string[]) || [],
            dependencies: (phase.dependencies as string[]) || [],
          })
        ),
        totalDuration: data.roadmap.totalDuration || '',
      },
      techStack: (data.techStack || []).map(
        (tech: Record<string, unknown>) => ({
          category: (tech.category as string) || 'backend',
          recommended: (tech.recommended as string) || '',
          alternatives: (tech.alternatives as string[]) || [],
          rationale: (tech.rationale as string) || '',
          estimatedCost: (tech.estimatedCost as string) || '',
          constraintAlignment: {
            budget:
              (tech.constraintAlignment as Record<string, string>)?.budget ||
              '',
            team:
              (tech.constraintAlignment as Record<string, string>)?.team || '',
            timeline:
              (tech.constraintAlignment as Record<string, string>)?.timeline ||
              '',
          },
        })
      ),
    };

    console.log(
      `[Tech Architect] Generated spec with ${output.prd.requirements.length} requirements, ${output.techStack.length} tech recommendations`
    );
    return output;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Tech Architect] Failed to parse response:', error);
      throw new Error(`Invalid JSON from Tech Architect: ${error.message}`);
    }
    console.error('[Tech Architect] Generation failed:', error);
    throw error;
  }
}

/**
 * Generate mock specification for testing
 */
export async function generateMockSpecification(
  input: TechArchitectInput
): Promise<TechArchitectOutput> {
  // Simulate processing delay (45 seconds typical)
  await new Promise((resolve) =>
    setTimeout(resolve, 3000 + Math.random() * 2000)
  );

  return {
    prd: {
      title: `${input.ideaTitle} PRD`,
      overview: `${input.ideaDescription}\n\nThis document defines the product requirements for ${input.targetAudience}.`,
      requirements: [
        {
          id: 'REQ-001',
          priority: 'P0',
          description: 'User Authentication System',
          acceptanceCriteria: [
            'Email/Password login support',
            'OAuth social login support',
          ],
        },
        {
          id: 'REQ-002',
          priority: 'P1',
          description: 'Core Feature Implementation',
          acceptanceCriteria: ['MVP features complete', 'Performance requirements met'],
        },
      ],
      userStories: [
        'As a user, I want to easily sign up for the service',
        'As a user, I want to use the core features',
      ],
      scope: {
        included: ['User Authentication', 'Core Features', 'Basic UI'],
        excluded: ['Admin Dashboard', 'Multi-language Support'],
      },
    },
    architecture: {
      diagramCode: `flowchart TD
    subgraph Frontend["Frontend"]
        A[Next.js App]
        B[React Components]
    end

    subgraph Backend["Backend"]
        C[API Routes]
        D[Auth Service]
    end

    subgraph Database["Database"]
        E[(PostgreSQL)]
    end

    A --> C
    C --> E
    B --> A
    D --> E`,
      components: [
        {
          name: 'Frontend',
          description: 'Handles User Interface',
          technology: 'Next.js + React',
          responsibilities: ['UI Rendering', 'User Input Processing'],
        },
        {
          name: 'API Server',
          description: 'Provides REST API',
          technology: 'Next.js API Routes',
          responsibilities: ['Business Logic', 'Data Processing'],
        },
      ],
      integrations: ['Supabase Auth', 'Vercel'],
    },
    roadmap: {
      phases: [
        {
          name: 'Phase 1: MVP Development',
          duration: '4 weeks',
          milestones: ['Project Setup', 'Core Feature Implementation'],
          deliverables: ['Functional MVP'],
          dependencies: [],
        },
        {
          name: 'Phase 2: Beta Testing',
          duration: '2 weeks',
          milestones: ['User Testing', 'Feedback Collection'],
          deliverables: ['Stabilized Version'],
          dependencies: ['Phase 1 Complete'],
        },
      ],
      totalDuration: '6 weeks',
    },
    techStack: [
      {
        category: 'frontend',
        recommended: 'Next.js 14',
        alternatives: ['React + Vite', 'Remix'],
        rationale:
          'Handles server-side rendering and API routes in a single framework',
        estimatedCost: 'Free (Open Source)',
        constraintAlignment: {
          budget: 'No budget impact with free framework',
          team: 'Low learning curve, easy for team adoption',
          timeline: 'Supports rapid development',
        },
      },
      {
        category: 'database',
        recommended: 'Supabase (PostgreSQL)',
        alternatives: ['PlanetScale', 'Neon'],
        rationale: 'Provides free tier, built-in auth/realtime features',
        estimatedCost: 'Free ~ 25,000 KRW/month',
        constraintAlignment: {
          budget: 'No initial cost with free tier',
          team: 'Managed service reduces operational burden',
          timeline: 'Quick setup possible',
        },
      },
    ],
  };
}

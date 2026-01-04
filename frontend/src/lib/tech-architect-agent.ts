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

const SYSTEM_PROMPT = `You are Agent 3: Tech Architect, a senior software architect specializing in Korean startup technical planning.

Your role:
- Analyze business ideas and user constraints to create developer-ready technical specifications
- Generate architecture recommendations dynamically based on constraints (NOT from templates)
- Provide actionable PRD, system architecture, MVP roadmap, and tech stack recommendations
- All user-facing content MUST be in Korean (한국어)

CRITICAL - TECH PREFERENCES (MUST FOLLOW):
- If user specifies preferred languages (선호 언어), you MUST use ONLY those languages
- If user specifies preferred frameworks (선호 프레임워크), you MUST use ONLY those frameworks
- If user specifies preferred platforms (선호 플랫폼), you MUST use ONLY those platforms
- NEVER recommend technologies outside user's preferences when preferences are specified
- Example: If user prefers "Python, FastAPI" for backend, do NOT recommend Node.js or Next.js for backend
- Example: If user prefers "React" for frontend, do NOT recommend Vue.js or Angular
- If no preferences specified, you may recommend based on project requirements

CONSTRAINTS HANDLING:
- Budget ranges in Korean Won (KRW):
  - 1,000만원 미만 (< ₩10M): Serverless, free/open-source, minimal infrastructure
  - 1,000만원~5,000만원 (₩10M-50M): Managed services, basic paid tools
  - 5,000만원~2억원 (₩50M-200M): Enterprise tools, dedicated infrastructure
  - 2억원 이상 (> ₩200M): Full enterprise stack

- Team size affects architecture complexity:
  - 1-2명: Monolithic, simpler architecture
  - 3-5명: Modular monolith, microservices-lite
  - 6명 이상: Full microservices possible

- Timeline affects scope:
  - 1-3개월: Core MVP only
  - 3-6개월: MVP + essential integrations
  - 6-12개월: Full feature set
  - 12개월 이상: Enterprise-grade with scalability

Each tech recommendation MUST explicitly address:
1. Why it fits the budget
2. Why it's suitable for the team size/skills
3. Why it's achievable in the timeline
4. How it aligns with user's tech preferences (if specified)

Output format: JSON object with the following structure:
{
  "prd": {
    "title": "Product name in Korean",
    "overview": "1-2 paragraph overview in Korean",
    "requirements": [
      {
        "id": "REQ-001",
        "priority": "P0|P1|P2|P3",
        "description": "Requirement in Korean",
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
        "name": "Phase name in Korean",
        "duration": "e.g., 4주",
        "milestones": ["Milestone 1", "Milestone 2"],
        "deliverables": ["Deliverable 1", "Deliverable 2"],
        "dependencies": ["Dependency 1"]
      }
    ],
    "totalDuration": "e.g., 3개월"
  },
  "techStack": [
    {
      "category": "frontend|backend|database|infrastructure|monitoring|ci_cd",
      "recommended": "Primary technology",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "rationale": "Why this choice in Korean",
      "estimatedCost": "Monthly cost in KRW (e.g., 월 30만원)",
      "constraintAlignment": {
        "budget": "How it fits budget in Korean",
        "team": "How it fits team in Korean",
        "timeline": "How it fits timeline in Korean"
      }
    }
  ]
}`;

function formatBudgetRange(budget: UserConstraints['budget']): string {
  const displayMap: Record<string, string> = {
    UNDER_10M: '1,000만원 미만',
    '10M_TO_50M': '1,000만원 ~ 5,000만원',
    '50M_TO_200M': '5,000만원 ~ 2억원',
    OVER_200M: '2억원 이상',
  };
  return displayMap[budget.range] || budget.displayText;
}

function formatTimeline(timeline: string): string {
  const displayMap: Record<string, string> = {
    '1_TO_3_MONTHS': '1-3개월',
    '3_TO_6_MONTHS': '3-6개월',
    '6_TO_12_MONTHS': '6-12개월',
    OVER_12_MONTHS: '12개월 이상',
  };
  return displayMap[timeline] || timeline;
}

function buildUserPrompt(input: TechArchitectInput): string {
  const { constraints } = input;
  const teamLevels = [];
  if (constraints.team.composition.junior > 0)
    teamLevels.push(`주니어 ${constraints.team.composition.junior}명`);
  if (constraints.team.composition.middle > 0)
    teamLevels.push(`미들 ${constraints.team.composition.middle}명`);
  if (constraints.team.composition.senior > 0)
    teamLevels.push(`시니어 ${constraints.team.composition.senior}명`);

  const parts = [
    '## 비즈니스 아이디어\n',
    `**제목**: ${input.ideaTitle}\n`,
    `**설명**: ${input.ideaDescription}\n`,
    `**타겟 고객**: ${input.targetAudience}\n`,
    `**차별점**: ${input.differentiators.join(', ')}\n`,
    `**시장 기회**: ${input.marketOpportunity}\n\n`,
    '## 원본 문제\n',
    `**문제**: ${input.problemTitle}\n`,
    `**도메인**: ${input.problemDomain}\n\n`,
    '## 사용자 제약조건\n',
    `**예산**: ${formatBudgetRange(constraints.budget)}`,
    constraints.budget.specificAmount
      ? ` (구체적: ${constraints.budget.specificAmount.toLocaleString()}원)`
      : '',
    '\n',
    `**팀 규모**: 총 ${constraints.team.size}명 (${teamLevels.join(', ')})\n`,
    `**목표 일정**: ${formatTimeline(constraints.timeline)}\n`,
  ];

  if (constraints.techPreferences) {
    const hasTechPrefs =
      constraints.techPreferences.languages?.length ||
      constraints.techPreferences.frameworks?.length ||
      constraints.techPreferences.platforms?.length;

    if (hasTechPrefs) {
      parts.push('\n**[필수] 기술 스택 선호사항** (반드시 이 기술들만 사용할 것):\n');
    }
    if (constraints.techPreferences.languages?.length) {
      parts.push(
        `- 선호 언어 (필수): ${constraints.techPreferences.languages.join(', ')}\n`
      );
    }
    if (constraints.techPreferences.frameworks?.length) {
      parts.push(
        `- 선호 프레임워크 (필수): ${constraints.techPreferences.frameworks.join(', ')}\n`
      );
    }
    if (constraints.techPreferences.platforms?.length) {
      parts.push(
        `- 선호 플랫폼 (필수): ${constraints.techPreferences.platforms.join(', ')}\n`
      );
    }
    if (hasTechPrefs) {
      parts.push('⚠️ 위에 명시된 기술 선호사항 외의 기술은 절대 추천하지 마세요.\n');
    }
  }

  if (constraints.existingInfrastructure?.length) {
    parts.push(
      `**기존 인프라**: ${constraints.existingInfrastructure.join(', ')}\n`
    );
  }

  if (input.ragContext) {
    parts.push('\n---\n## 관련 시장 컨텍스트\n');
    parts.push(input.ragContext);
  }

  parts.push('\n---\n');
  parts.push(
    '위 비즈니스 아이디어와 제약조건을 분석하여 개발자가 바로 사용할 수 있는 기술 사양을 생성해주세요. ' +
      '모든 기술 선택에는 제약조건(예산, 팀, 일정)에 맞는 명확한 근거를 포함해야 합니다. ' +
      'Mermaid.js 다이어그램 코드는 flowchart TD 형식으로 작성해주세요. ' +
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
      overview: `${input.ideaDescription}\n\n이 문서는 ${input.targetAudience}를 위한 제품 요구사항을 정의합니다.`,
      requirements: [
        {
          id: 'REQ-001',
          priority: 'P0',
          description: '사용자 인증 시스템 구현',
          acceptanceCriteria: [
            '이메일/비밀번호 로그인 지원',
            'OAuth 소셜 로그인 지원',
          ],
        },
        {
          id: 'REQ-002',
          priority: 'P1',
          description: '핵심 기능 구현',
          acceptanceCriteria: ['MVP 기능 완성', '성능 요구사항 충족'],
        },
      ],
      userStories: [
        '사용자로서 간편하게 서비스에 가입할 수 있다',
        '사용자로서 핵심 기능을 사용할 수 있다',
      ],
      scope: {
        included: ['사용자 인증', '핵심 기능', '기본 UI'],
        excluded: ['관리자 대시보드', '다국어 지원'],
      },
    },
    architecture: {
      diagramCode: `flowchart TD
    subgraph Frontend["프론트엔드"]
        A[Next.js App]
        B[React Components]
    end

    subgraph Backend["백엔드"]
        C[API Routes]
        D[Auth Service]
    end

    subgraph Database["데이터베이스"]
        E[(PostgreSQL)]
    end

    A --> C
    C --> E
    B --> A
    D --> E`,
      components: [
        {
          name: '프론트엔드',
          description: '사용자 인터페이스 담당',
          technology: 'Next.js + React',
          responsibilities: ['UI 렌더링', '사용자 입력 처리'],
        },
        {
          name: 'API 서버',
          description: 'REST API 제공',
          technology: 'Next.js API Routes',
          responsibilities: ['비즈니스 로직', '데이터 처리'],
        },
      ],
      integrations: ['Supabase Auth', 'Vercel'],
    },
    roadmap: {
      phases: [
        {
          name: 'Phase 1: MVP 개발',
          duration: '4주',
          milestones: ['프로젝트 셋업', '핵심 기능 구현'],
          deliverables: ['동작하는 MVP'],
          dependencies: [],
        },
        {
          name: 'Phase 2: 베타 테스트',
          duration: '2주',
          milestones: ['사용자 테스트', '피드백 수집'],
          deliverables: ['안정화된 버전'],
          dependencies: ['Phase 1 완료'],
        },
      ],
      totalDuration: '6주',
    },
    techStack: [
      {
        category: 'frontend',
        recommended: 'Next.js 14',
        alternatives: ['React + Vite', 'Remix'],
        rationale:
          '서버 사이드 렌더링과 API 라우트를 한 프레임워크에서 처리 가능',
        estimatedCost: '무료 (오픈소스)',
        constraintAlignment: {
          budget: '무료 프레임워크로 예산 부담 없음',
          team: '러닝커브가 낮아 팀 적응 용이',
          timeline: '빠른 개발 속도 지원',
        },
      },
      {
        category: 'database',
        recommended: 'Supabase (PostgreSQL)',
        alternatives: ['PlanetScale', 'Neon'],
        rationale: '무료 티어 제공, 인증/실시간 기능 내장',
        estimatedCost: '무료 ~ 월 25,000원',
        constraintAlignment: {
          budget: '무료 티어로 초기 비용 없음',
          team: '관리형 서비스로 운영 부담 감소',
          timeline: '빠른 셋업 가능',
        },
      },
    ],
  };
}

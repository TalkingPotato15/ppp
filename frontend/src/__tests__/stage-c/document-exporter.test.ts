import {
  generatePRDMarkdown,
  generateArchitectureMarkdown,
  generateRoadmapMarkdown,
  generateTechStackMarkdown,
  generateReadmeMarkdown,
  generateAllMarkdownFiles,
} from '@/lib/document-exporter';
import type {
  PRDDocument,
  ArchitectureDiagram,
  MVPRoadmap,
  TechStackRecommendation,
  TechnicalSpecification,
} from '@/types/stage-c';

describe('document-exporter', () => {
  const mockPRD: PRDDocument = {
    title: '테스트 제품',
    overview: '이것은 테스트 제품입니다.',
    requirements: [
      {
        id: 'REQ-001',
        priority: 'P0',
        description: '사용자 인증',
        acceptanceCriteria: ['이메일 로그인', 'OAuth 지원'],
      },
      {
        id: 'REQ-002',
        priority: 'P1',
        description: '대시보드',
        acceptanceCriteria: ['데이터 시각화'],
      },
    ],
    userStories: ['사용자로서 로그인할 수 있다', '사용자로서 대시보드를 볼 수 있다'],
    scope: {
      included: ['사용자 인증', '대시보드'],
      excluded: ['관리자 기능', '다국어'],
    },
  };

  const mockArchitecture: ArchitectureDiagram = {
    diagramCode: 'flowchart TD\n    A --> B',
    components: [
      {
        name: '프론트엔드',
        description: 'UI 레이어',
        technology: 'Next.js',
        responsibilities: ['렌더링', '라우팅'],
      },
    ],
    integrations: ['Supabase', 'Vercel'],
  };

  const mockRoadmap: MVPRoadmap = {
    phases: [
      {
        name: 'MVP 개발',
        duration: '4주',
        milestones: ['프로젝트 셋업', '핵심 기능'],
        deliverables: ['동작하는 앱'],
        dependencies: [],
      },
    ],
    totalDuration: '4주',
  };

  const mockTechStack: TechStackRecommendation[] = [
    {
      category: 'frontend',
      recommended: 'Next.js',
      alternatives: ['React', 'Vue'],
      rationale: '빠른 개발',
      estimatedCost: '무료',
      constraintAlignment: {
        budget: '무료',
        team: '러닝커브 낮음',
        timeline: '빠른 개발',
      },
    },
  ];

  const mockSpecification: TechnicalSpecification = {
    id: 'spec-1',
    userId: 'user-1',
    ideaId: 'idea-1',
    versionNumber: 1,
    constraintsSnapshot: {
      budget: { range: '10M_TO_50M', displayText: '1,000만원 ~ 5,000만원' },
      team: { size: 3, composition: { junior: 1, middle: 1, senior: 1 } },
      timeline: '3_TO_6_MONTHS',
    },
    prd: mockPRD,
    architecture: mockArchitecture,
    roadmap: mockRoadmap,
    techStack: mockTechStack,
    status: 'completed',
    createdAt: '2024-01-15T10:00:00Z',
  };

  describe('generatePRDMarkdown', () => {
    it('should generate valid markdown with title', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('# 테스트 제품');
      expect(markdown).toContain('## 개요');
      expect(markdown).toContain('이것은 테스트 제품입니다.');
    });

    it('should include requirements table', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('## 요구사항');
      expect(markdown).toContain('| ID | 우선순위 | 설명 | 수락 기준 |');
      expect(markdown).toContain('REQ-001');
      expect(markdown).toContain('P0');
      expect(markdown).toContain('사용자 인증');
    });

    it('should include user stories', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('## 사용자 스토리');
      expect(markdown).toContain('1. 사용자로서 로그인할 수 있다');
    });

    it('should include scope sections', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('### 포함');
      expect(markdown).toContain('- 사용자 인증');
      expect(markdown).toContain('### 제외');
      expect(markdown).toContain('- 관리자 기능');
    });
  });

  describe('generateArchitectureMarkdown', () => {
    it('should include mermaid diagram', () => {
      const markdown = generateArchitectureMarkdown(mockArchitecture);

      expect(markdown).toContain('```mermaid');
      expect(markdown).toContain('flowchart TD');
      expect(markdown).toContain('```');
    });

    it('should include components', () => {
      const markdown = generateArchitectureMarkdown(mockArchitecture);

      expect(markdown).toContain('## 컴포넌트 설명');
      expect(markdown).toContain('### 프론트엔드');
      expect(markdown).toContain('**기술**: Next.js');
    });

    it('should include integrations', () => {
      const markdown = generateArchitectureMarkdown(mockArchitecture);

      expect(markdown).toContain('## 외부 통합');
      expect(markdown).toContain('- Supabase');
      expect(markdown).toContain('- Vercel');
    });
  });

  describe('generateRoadmapMarkdown', () => {
    it('should include total duration', () => {
      const markdown = generateRoadmapMarkdown(mockRoadmap);

      expect(markdown).toContain('**총 소요 기간**: 4주');
    });

    it('should include phases', () => {
      const markdown = generateRoadmapMarkdown(mockRoadmap);

      expect(markdown).toContain('### MVP 개발');
      expect(markdown).toContain('**기간**: 4주');
      expect(markdown).toContain('- 프로젝트 셋업');
    });
  });

  describe('generateTechStackMarkdown', () => {
    it('should include category headers', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('### 프론트엔드');
    });

    it('should include recommendations and rationale', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('**추천**: Next.js');
      expect(markdown).toContain('**대안**: React, Vue');
      expect(markdown).toContain('**선택 근거**: 빠른 개발');
    });

    it('should include constraint alignment', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('**제약조건 적합성**');
      expect(markdown).toContain('- 예산: 무료');
      expect(markdown).toContain('- 팀: 러닝커브 낮음');
    });
  });

  describe('generateReadmeMarkdown', () => {
    it('should include title and version', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('# 테스트 제품');
      expect(markdown).toContain('**버전**: v1');
    });

    it('should include document links', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('[PRD (제품 요구사항)](./prd.md)');
      expect(markdown).toContain('[시스템 아키텍처](./architecture.md)');
    });

    it('should include constraints summary', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('## 제약조건 요약');
      expect(markdown).toContain('1,000만원 ~ 5,000만원');
      expect(markdown).toContain('3명');
    });
  });

  describe('generateAllMarkdownFiles', () => {
    it('should generate 5 files', () => {
      const files = generateAllMarkdownFiles(mockSpecification);

      expect(files.size).toBe(5);
      expect(files.has('README.md')).toBe(true);
      expect(files.has('prd.md')).toBe(true);
      expect(files.has('architecture.md')).toBe(true);
      expect(files.has('roadmap.md')).toBe(true);
      expect(files.has('techstack.md')).toBe(true);
    });

    it('should have content in all files', () => {
      const files = generateAllMarkdownFiles(mockSpecification);

      files.forEach((content, filename) => {
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('#'); // All files should have headings
      });
    });
  });
});

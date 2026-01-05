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
    title: 'Test Product',
    overview: 'This is a test product.',
    requirements: [
      {
        id: 'REQ-001',
        priority: 'P0',
        description: 'User Authentication',
        acceptanceCriteria: ['Email login', 'OAuth support'],
      },
      {
        id: 'REQ-002',
        priority: 'P1',
        description: 'Dashboard',
        acceptanceCriteria: ['Data Visualization'],
      },
    ],
    userStories: ['As a user I can login', 'As a user I can view dashboard'],
    scope: {
      included: ['User Authentication', 'Dashboard'],
      excluded: ['Admin features', 'Multi-language'],
    },
  };

  const mockArchitecture: ArchitectureDiagram = {
    diagramCode: 'flowchart TD\n    A --> B',
    components: [
      {
        name: 'Frontend',
        description: 'UI Layer',
        technology: 'Next.js',
        responsibilities: ['Rendering', 'Routing'],
      },
    ],
    integrations: ['Supabase', 'Vercel'],
  };

  const mockRoadmap: MVPRoadmap = {
    phases: [
      {
        name: 'MVP Development',
        duration: '4 weeks',
        milestones: ['Project Setup', 'Core Features'],
        deliverables: ['Working App'],
        dependencies: [],
      },
    ],
    totalDuration: '4 weeks',
  };

  const mockTechStack: TechStackRecommendation[] = [
    {
      category: 'frontend',
      recommended: 'Next.js',
      alternatives: ['React', 'Vue'],
      rationale: 'Fast development',
      estimatedCost: 'Free',
      constraintAlignment: {
        budget: 'Free',
        team: 'Low learning curve',
        timeline: 'Fast development',
      },
    },
  ];

  const mockSpecification: TechnicalSpecification = {
    id: 'spec-1',
    userId: 'user-1',
    ideaId: 'idea-1',
    versionNumber: 1,
    constraintsSnapshot: {
      budget: { range: '10M_TO_50M', displayText: '₩10M ~ ₩50M' },
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

      expect(markdown).toContain('# Test Product');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('This is a test product.');
    });

    it('should include requirements table', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('## Requirements');
      expect(markdown).toContain('| ID | Priority | Description | Acceptance Criteria |');
      expect(markdown).toContain('REQ-001');
      expect(markdown).toContain('P0');
      expect(markdown).toContain('User Authentication');
    });

    it('should include user stories', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('## User Stories');
      expect(markdown).toContain('1. As a user I can login');
    });

    it('should include scope sections', () => {
      const markdown = generatePRDMarkdown(mockPRD);

      expect(markdown).toContain('### Included');
      expect(markdown).toContain('- User Authentication');
      expect(markdown).toContain('### Excluded');
      expect(markdown).toContain('- Admin features');
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

      expect(markdown).toContain('## Component Details');
      expect(markdown).toContain('### Frontend');
      expect(markdown).toContain('**Technology**: Next.js');
    });

    it('should include integrations', () => {
      const markdown = generateArchitectureMarkdown(mockArchitecture);

      expect(markdown).toContain('## External Integrations');
      expect(markdown).toContain('- Supabase');
      expect(markdown).toContain('- Vercel');
    });
  });

  describe('generateRoadmapMarkdown', () => {
    it('should include total duration', () => {
      const markdown = generateRoadmapMarkdown(mockRoadmap);

      expect(markdown).toContain('**Total Duration**: 4 weeks');
    });

    it('should include phases', () => {
      const markdown = generateRoadmapMarkdown(mockRoadmap);

      expect(markdown).toContain('### MVP Development');
      expect(markdown).toContain('**Duration**: 4 weeks');
      expect(markdown).toContain('- Project Setup');
    });
  });

  describe('generateTechStackMarkdown', () => {
    it('should include category headers', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('### Frontend');
    });

    it('should include recommendations and rationale', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('**Recommended**: Next.js');
      expect(markdown).toContain('**Alternatives**: React, Vue');
      expect(markdown).toContain('**Rationale**: Fast development');
    });

    it('should include constraint alignment', () => {
      const markdown = generateTechStackMarkdown(mockTechStack);

      expect(markdown).toContain('**Constraint Alignment**');
      expect(markdown).toContain('- Budget: Free');
      expect(markdown).toContain('- Team: Low learning curve');
    });
  });

  describe('generateReadmeMarkdown', () => {
    it('should include title and version', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('# Test Product');
      expect(markdown).toContain('**Version**: v1');
    });

    it('should include document links', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('[PRD (Product Requirements)](./prd.md)');
      expect(markdown).toContain('[System Architecture](./architecture.md)');
    });

    it('should include constraints summary', () => {
      const markdown = generateReadmeMarkdown(mockSpecification);

      expect(markdown).toContain('## Constraints Summary');
      expect(markdown).toContain('₩10M ~ ₩50M');
      expect(markdown).toContain('3 people');
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

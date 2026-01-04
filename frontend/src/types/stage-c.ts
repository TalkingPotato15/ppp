// Stage C - Technical Execution Types
// Based on data-model.md and contracts/stage-c-api.yaml

export type BudgetRange = 'UNDER_10M' | '10M_TO_50M' | '50M_TO_200M' | 'OVER_200M';
export type Timeline = '1_TO_3_MONTHS' | '3_TO_6_MONTHS' | '6_TO_12_MONTHS' | 'OVER_12_MONTHS';
export type SpecStatus = 'generating' | 'completed' | 'failed';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TechCategory = 'frontend' | 'backend' | 'database' | 'infrastructure' | 'monitoring' | 'ci_cd';

export interface TeamComposition {
  junior: number;
  middle: number;
  senior: number;
}

export interface Budget {
  range: BudgetRange;
  specificAmount?: number;
  displayText: string;
}

export interface Team {
  size: number;
  composition: TeamComposition;
}

export interface TechPreferences {
  languages?: string[];
  frameworks?: string[];
  platforms?: string[];
}

export interface UserConstraints {
  budget: Budget;
  team: Team;
  timeline: Timeline;
  techPreferences?: TechPreferences;
  existingInfrastructure?: string[];
}

export interface Requirement {
  id: string;
  priority: Priority;
  description: string;
  acceptanceCriteria: string[];
}

export interface Scope {
  included: string[];
  excluded: string[];
}

export interface PRDDocument {
  title: string;
  overview: string;
  requirements: Requirement[];
  userStories: string[];
  scope: Scope;
}

export interface ArchitectureComponent {
  name: string;
  description: string;
  technology: string;
  responsibilities: string[];
}

export interface ArchitectureDiagram {
  diagramCode: string;
  diagramSvg?: string;
  components: ArchitectureComponent[];
  integrations: string[];
}

export interface RoadmapPhase {
  name: string;
  duration: string;
  milestones: string[];
  deliverables: string[];
  dependencies?: string[];
}

export interface MVPRoadmap {
  phases: RoadmapPhase[];
  totalDuration: string;
}

export interface ConstraintAlignment {
  budget: string;
  team: string;
  timeline: string;
}

export interface TechStackRecommendation {
  category: TechCategory;
  recommended: string;
  alternatives: string[];
  rationale: string;
  estimatedCost: string;
  constraintAlignment: ConstraintAlignment;
}

export interface TechnicalSpecification {
  id: string;
  userId: string;
  ideaId: string;
  versionNumber: number;
  constraintsSnapshot: UserConstraints;
  prd: PRDDocument;
  architecture: ArchitectureDiagram;
  roadmap: MVPRoadmap;
  techStack: TechStackRecommendation[];
  status: SpecStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RegenerationQuota {
  id: string;
  userId: string;
  ideaId: string;
  usedCount: number;
  maxCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response types
export interface CreateSpecificationRequest {
  ideaId: string;
  constraints: UserConstraints;
}

export interface RegenerateSpecificationRequest {
  constraints: UserConstraints;
}

export interface SpecificationResponse {
  specification: TechnicalSpecification;
  remainingRegenerations: number;
}

export interface SpecificationListResponse {
  specifications: TechnicalSpecification[];
  remainingRegenerations: number;
}

export interface QuotaResponse {
  usedCount: number;
  maxCount: number;
  remainingCount: number;
}

export interface QuotaExceededResponse {
  error: string;
  remainingCount: number;
}

export interface ValidationResponse {
  valid: boolean;
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  valid: boolean;
  errors: ValidationError[];
}

export type ExportFormat = 'pdf' | 'markdown';

export interface ExportRequest {
  format: ExportFormat;
}

// UI State types
export interface StageCSt {
  isLoading: boolean;
  isGenerating: boolean;
  specification: TechnicalSpecification | null;
  specifications: TechnicalSpecification[];
  remainingRegenerations: number;
  error: string | null;
  activeTab: 'prd' | 'architecture' | 'roadmap' | 'techstack';
}

// Budget display helpers
export const BUDGET_DISPLAY: Record<BudgetRange, string> = {
  UNDER_10M: '1,000만원 미만',
  '10M_TO_50M': '1,000만원 ~ 5,000만원',
  '50M_TO_200M': '5,000만원 ~ 2억원',
  OVER_200M: '2억원 이상',
};

export const TIMELINE_DISPLAY: Record<Timeline, string> = {
  '1_TO_3_MONTHS': '1-3개월',
  '3_TO_6_MONTHS': '3-6개월',
  '6_TO_12_MONTHS': '6-12개월',
  OVER_12_MONTHS: '12개월 이상',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: 'bg-red-100 text-red-800',
  P1: 'bg-orange-100 text-orange-800',
  P2: 'bg-yellow-100 text-yellow-800',
  P3: 'bg-green-100 text-green-800',
};

export const TECH_CATEGORY_LABELS: Record<TechCategory, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  database: '데이터베이스',
  infrastructure: '인프라',
  monitoring: '모니터링',
  ci_cd: 'CI/CD',
};

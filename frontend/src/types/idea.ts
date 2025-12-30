/**
 * Stage B: Idea Generation types
 */

export type GenerationStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface Idea {
  id: string;
  title: string;
  description: string;
  target_audience: string;
  differentiators: string[];
  market_opportunity: string;
  implementation_hints: string;
  created_at: string;
}

export interface GenerationSession {
  id: string;
  problem_id: string;
  status: GenerationStatus;
  feedback: string | null;
  error_message: string | null;
  ideas: Idea[];
  created_at: string;
  completed_at: string | null;
}

export interface GenerationSessionList {
  items: GenerationSession[];
  total: number;
}

export interface SavedIdea {
  id: string;
  idea: Idea;
  problem_id: string;
  problem_title: string;
  notes: string | null;
  saved_at: string;
}

export interface SavedIdeaList {
  items: SavedIdea[];
  total: number;
}

export interface SavedStatus {
  is_saved: boolean;
  saved_id: string | null;
}

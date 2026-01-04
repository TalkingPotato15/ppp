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
  market_signals: string[] | null;
  confidence_score: number | null;
  is_bookmarked: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface GenerationSession {
  id: string;
  problem_id: string;
  status: GenerationStatus;
  feedback: string | null;
  error_message: string | null;
  rag_context: Record<string, unknown> | null;
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

export interface BookmarkRequest {
  is_bookmarked: boolean;
}

export interface BookmarkResponse {
  idea_id: string;
  is_bookmarked: boolean;
}

export interface IdeaWithContext extends Idea {
  problem_id: string;
  problem_title: string;
  is_deleted: boolean;
}

export interface MyIdeasList {
  items: IdeaWithContext[];
  total: number;
}

export interface SoftDeleteResponse {
  idea_id: string;
  is_deleted: boolean;
  message: string;
}

export interface BookmarkedIdeasList {
  items: IdeaWithContext[];
  total: number;
}

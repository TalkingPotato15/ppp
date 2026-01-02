import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// Use lazy initialization to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  }
  return _supabaseAdmin;
}

// Backward compatibility - use getter for lazy init
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as unknown as Record<string, unknown>)[prop as string];
  },
});

// ============================================
// Database Types
// ============================================

export type AuthProvider = 'LOCAL' | 'GOOGLE';
export type GenerationStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type Trend = 'RISING' | 'STABLE' | 'DECLINING';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type RelationshipType = 'SIMILAR_TOPIC' | 'SAME_DOMAIN' | 'RELATED_KEYWORDS';
export type JobType = 'INITIAL_LOAD' | 'INCREMENTAL';
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  password_hash: string | null;
  auth_provider: AuthProvider;
  google_id: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: string | null;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  source_url: string;
  title: string;
  keywords: string[];
  domain_tag: string;
  trend: Trend;
  sentiment: Sentiment;
  posted_at: string;
  created_at: string;
  embedding?: number[];
}

export interface DocumentRelationship {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relationship_type: RelationshipType;
  similarity_score: number;
  created_at: string;
}

export interface GenerationSession {
  id: string;
  user_id: string;
  problem_id: string;
  status: GenerationStatus;
  feedback: string | null;
  error_message: string | null;
  rag_context: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface GeneratedIdea {
  id: string;
  session_id: string;
  title: string;
  description: string;
  target_audience: string;
  differentiators: string[];
  market_opportunity: string;
  implementation_hints: string;
  market_signals: string[];
  confidence_score: number | null;
  is_bookmarked: boolean;
  created_at: string;
}

export interface SavedIdea {
  id: string;
  user_id: string;
  idea_id: string;
  notes: string | null;
  saved_at: string;
}

export interface CollectionJob {
  id: string;
  job_type: JobType;
  status: JobStatus;
  target_start: string | null;
  target_end: string | null;
  posts_collected: number;
  posts_processed: number;
  posts_filtered: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RawPost {
  id: string;
  source_url: string;
  content: string;
  author_hash: string | null;
  posted_at: string;
  scraped_at: string;
  collection_job_id: string | null;
}

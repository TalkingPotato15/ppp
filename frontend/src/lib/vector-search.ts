import OpenAI from 'openai';
import { supabaseAdmin, DocumentSummary, Trend, Sentiment } from './supabase';

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

export interface SimilarDocument {
  id: string;
  title: string;
  keywords: string[];
  domain_tag: string;
  trend: Trend;
  sentiment: Sentiment;
  similarity: number;
}

export interface RAGContext {
  documents: SimilarDocument[];
  formatted: string;
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate to avoid token limits
  const truncatedText = text.slice(0, 30000);

  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
  });

  return response.data[0].embedding;
}

/**
 * Search for similar documents using pgvector
 */
export async function searchSimilarProblems(
  queryText: string,
  topK: number = 5,
  domainFilter?: string,
  threshold: number = 0.5
): Promise<SimilarDocument[]> {
  try {
    const embedding = await generateEmbedding(queryText);

    // Call the match_documents function
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: topK,
      filter_domain: domainFilter || null,
    });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchSimilarProblems:', error);
    return [];
  }
}

/**
 * Format RAG context for LLM consumption
 */
export function formatRAGContext(documents: SimilarDocument[]): string {
  if (documents.length === 0) {
    return '';
  }

  const formattedDocs = documents.map((doc, index) => {
    return `[${index + 1}] ${doc.title}
   Domain: ${doc.domain_tag}
   Trend: ${doc.trend}
   Sentiment: ${doc.sentiment}
   Keywords: ${doc.keywords.join(', ')}
   Relevance: ${Math.round(doc.similarity * 100)}%`;
  });

  return `Related Market Signals:\n${formattedDocs.join('\n\n')}`;
}

/**
 * Get RAG context for a problem
 */
export async function getRAGContext(
  problem: DocumentSummary,
  topK: number = 5
): Promise<RAGContext> {
  const queryText = `${problem.title} ${problem.keywords.slice(0, 5).join(' ')}`;
  const documents = await searchSimilarProblems(
    queryText,
    topK,
    problem.domain_tag
  );

  return {
    documents,
    formatted: formatRAGContext(documents),
  };
}

/**
 * Store embedding for a document
 */
export async function storeDocumentEmbedding(
  documentId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text);

  const { error } = await supabaseAdmin
    .from('document_summaries')
    .update({ embedding })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`);
  }
}

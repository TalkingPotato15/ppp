'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { discoveryApi } from '@/lib/api';
import { ProblemDetail } from '@/types/problem';
import { Idea } from '@/types/idea';
import { useIdeas } from '@/hooks/useIdeas';
import {
  IdeaCard,
  IdeaDetail,
  GenerateButton,
  ErrorState,
} from '@/components/stage-b';

export default function StageBPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params.problemId as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [isProblemLoading, setIsProblemLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [errorCode, setErrorCode] = useState<number | undefined>(undefined);
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    session,
    status,
    isLoading: isIdeasLoading,
    isGenerating,
    error,
    savedStatuses,
    generateIdeas,
    saveIdea,
    unsaveIdea,
    toggleBookmark,
  } = useIdeas({ problemId });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/stage-b/${problemId}`);
    }
  }, [authLoading, isAuthenticated, router, problemId]);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await discoveryApi.getProblem(problemId);
        setProblem(response.data);
      } catch (error) {
        console.error('Failed to fetch problem:', error);
      } finally {
        setIsProblemLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchProblem();
    }
  }, [problemId, isAuthenticated]);

  const handleGenerate = async () => {
    setErrorCode(undefined);
    try {
      await generateIdeas();
    } catch (err) {
      console.error('Failed to generate ideas:', err);
      // Extract error code from axios error response
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response?.status) {
          setErrorCode(response.status);
        }
      }
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await handleGenerate();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSave = async (ideaId: string) => {
    await saveIdea(ideaId);
  };

  const handleUnsave = async (savedId: string) => {
    const ideaId = Object.entries(savedStatuses).find(
      ([, status]) => status.saved_id === savedId
    )?.[0];
    if (ideaId) {
      await unsaveIdea(savedId, ideaId);
    }
  };

  const handleBookmark = async (ideaId: string, isBookmarked: boolean) => {
    await toggleBookmark(ideaId, isBookmarked);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isProblemLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Problem Not Found
          </h1>
          <Link href="/" className="text-primary-600 hover:underline">
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  const ideas = session?.ideas || [];
  const hasExistingIdeas = ideas.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline text-sm">
          &larr; Back to Discovery
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Stage B: Idea Generation
        </h1>

        {/* Problem Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Selected Problem
          </h2>
          <p className="text-gray-700 mb-4">{problem.title}</p>
          <div className="flex flex-wrap gap-2">
            {problem.keywords.map((keyword, index) => (
              <span
                key={index}
                className="bg-gray-200 text-gray-600 text-sm px-3 py-1 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
          {problem.domain_tag && (
            <div className="mt-3 text-sm text-gray-500">
              Domain: <span className="font-medium">{problem.domain_tag}</span>
            </div>
          )}
        </div>

        {/* Generation Controls - One-time generation only */}
        <div className="space-y-4 mb-8">
          {hasExistingIdeas ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Ideas Generated</span>
              </div>
              <span className="text-sm text-gray-500">
                {ideas.length} ideas generated
              </span>
            </div>
          ) : (
            <GenerateButton
              status={status}
              hasExistingIdeas={false}
              onClick={handleGenerate}
              disabled={isGenerating || isIdeasLoading}
            />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorState
              message={error}
              errorCode={errorCode}
              onRetry={errorCode !== 409 ? handleRetry : undefined}
              isRetrying={isRetrying}
            />
          </div>
        )}

        {/* Loading State - Checking existing session */}
        {isIdeasLoading && !isGenerating && !hasExistingIdeas && (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center text-gray-500 text-sm">Loading your ideas...</p>
          </div>
        )}

        {/* Generation Progress State */}
        {isGenerating && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generating Your Ideas
              </h3>
              <p className="text-gray-600 mb-4">
                Our AI is analyzing market data and creating tailored business ideas...
              </p>
              <div className="max-w-sm mx-auto">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Analyzing problem context</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Retrieving related market data</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-blue-600 animate-pulse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating business ideas...</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                This may take 10-30 seconds
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isIdeasLoading && !isGenerating && !hasExistingIdeas && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Ready to Generate Ideas
            </h3>
            <p className="text-gray-500 mb-4">
              Click the button above to generate business ideas based on this problem.
            </p>
          </div>
        )}

        {/* Ideas Grid */}
        {hasExistingIdeas && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generated Ideas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  savedStatus={savedStatuses[idea.id]}
                  onSave={handleSave}
                  onUnsave={handleUnsave}
                  onBookmark={handleBookmark}
                  onExpand={setSelectedIdea}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Info */}
      {session && (
        <div className="text-sm text-gray-500 text-center">
          Session created:{' '}
          {new Date(session.created_at).toLocaleString()}
          {session.completed_at && (
            <>
              {' | '}
              Completed: {new Date(session.completed_at).toLocaleString()}
            </>
          )}
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          savedStatus={savedStatuses[selectedIdea.id]}
          onSave={handleSave}
          onUnsave={handleUnsave}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </div>
  );
}

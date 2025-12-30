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
  FeedbackInput,
} from '@/components/stage-b';

export default function StageBPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params.problemId as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [isProblemLoading, setIsProblemLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

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
    try {
      await generateIdeas(feedback || undefined);
      setFeedback('');
    } catch (err) {
      console.error('Failed to generate ideas:', err);
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

        {/* Generation Controls */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <GenerateButton
              status={status}
              hasExistingIdeas={hasExistingIdeas}
              onClick={handleGenerate}
              disabled={isGenerating || isIdeasLoading}
            />
            {hasExistingIdeas && (
              <span className="text-sm text-gray-500">
                {ideas.length} ideas generated
              </span>
            )}
          </div>

          {hasExistingIdeas && (
            <FeedbackInput
              value={feedback}
              onChange={setFeedback}
              disabled={isGenerating}
            />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(isGenerating || isIdeasLoading) && !hasExistingIdeas && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {isGenerating
                ? 'Generating ideas... This may take a few seconds.'
                : 'Loading...'}
            </p>
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

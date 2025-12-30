'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProblemDetail } from '@/types/problem';
import { discoveryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ProblemPreviewProps {
  problemId: string | null;
  onClose: () => void;
  onAuthRequired: () => void;
}

const trendColors = {
  RISING: 'bg-green-100 text-green-800',
  STABLE: 'bg-gray-100 text-gray-800',
  DECLINING: 'bg-red-100 text-red-800',
};

const sentimentColors = {
  POSITIVE: 'bg-blue-100 text-blue-800',
  NEUTRAL: 'bg-gray-100 text-gray-800',
  NEGATIVE: 'bg-orange-100 text-orange-800',
};

export function ProblemPreview({
  problemId,
  onClose,
  onAuthRequired,
}: ProblemPreviewProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!problemId) {
      setProblem(null);
      return;
    }

    const fetchProblem = async () => {
      setIsLoading(true);
      try {
        const response = await discoveryApi.getProblem(problemId);
        setProblem(response.data);
      } catch (error) {
        console.error('Failed to fetch problem:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  if (!problemId) return null;

  const handleSelectProblem = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    router.push(`/stage-b/${problemId}`);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : problem ? (
          <>
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold text-gray-900">
                  {problem.title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {problem.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="flex gap-3 mb-6">
                <span
                  className={`text-sm px-3 py-1 rounded ${trendColors[problem.trend]}`}
                >
                  Trend: {problem.trend}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded ${sentimentColors[problem.sentiment]}`}
                >
                  Sentiment: {problem.sentiment}
                </span>
              </div>

              <div className="text-sm text-gray-500 mb-6">
                <p>Domain: {problem.domain_tag}</p>
                <p>Posted: {new Date(problem.posted_at).toLocaleDateString()}</p>
              </div>

              <button
                onClick={handleSelectProblem}
                className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-medium"
              >
                Generate Ideas for This Problem
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Problem not found
          </div>
        )}
      </div>
    </div>
  );
}

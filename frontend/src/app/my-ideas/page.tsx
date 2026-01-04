'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ideasApi, IdeaWithContext } from '@/lib/api';
import { IdeaDetail } from '@/components/stage-b';
import { Idea } from '@/types/idea';

export default function MyIdeasPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [ideas, setIdeas] = useState<IdeaWithContext[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const fetchMyIdeas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ideasApi.getMyIdeas({ bookmarked_only: bookmarkedOnly });
      setIdeas(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch my ideas:', error);
      setIdeas([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [bookmarkedOnly]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/my-ideas');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyIdeas();
    }
  }, [isAuthenticated, fetchMyIdeas]);

  const handleDelete = async (ideaId: string) => {
    try {
      await ideasApi.deleteIdea(ideaId);
      setIdeas((prev) => prev.filter((item) => item.id !== ideaId));
      setTotal((prev) => prev - 1);
      setSelectedIdea(null);
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  const handleToggleBookmark = async (ideaId: string, isBookmarked: boolean) => {
    try {
      await ideasApi.toggleBookmark(ideaId, isBookmarked);
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, is_bookmarked: isBookmarked } : idea
        )
      );
      // If we're in bookmarked-only mode and unbookmarking, remove from list
      if (bookmarkedOnly && !isBookmarked) {
        setIdeas((prev) => prev.filter((item) => item.id !== ideaId));
        setTotal((prev) => prev - 1);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleSelectIdea = (idea: IdeaWithContext) => {
    setSelectedIdea(idea as Idea);
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Ideas</h1>
        <p className="text-gray-600">
          {total > 0
            ? `You have ${total} idea${total !== 1 ? 's' : ''}`
            : 'Generate ideas from problems to see them here'}
        </p>
      </div>

      {/* Filter Toggle */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => setBookmarkedOnly(false)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !bookmarkedOnly
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Ideas
        </button>
        <button
          onClick={() => setBookmarkedOnly(true)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            bookmarkedOnly
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Bookmarked
        </button>
      </div>

      {isLoading || !hasFetched ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
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
            {bookmarkedOnly ? 'No Bookmarked Ideas' : 'No Ideas Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {bookmarkedOnly
              ? 'Bookmark ideas you want to save for later!'
              : 'Generate ideas from problems to get started!'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Browse Problems
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => handleSelectIdea(idea)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 relative"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-16">
                  {idea.title}
                </h3>
                <div className="absolute top-4 right-4 flex gap-1">
                  {/* Bookmark button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(idea.id, !idea.is_bookmarked);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      idea.is_bookmarked
                        ? 'text-yellow-500 hover:bg-yellow-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={idea.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={idea.is_bookmarked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Remove this idea from your list?')) {
                        handleDelete(idea.id);
                      }
                    }}
                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove from list"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {idea.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {idea.differentiators.slice(0, 2).map((diff, index) => (
                  <span
                    key={index}
                    className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded"
                  >
                    {diff.length > 25 ? diff.substring(0, 25) + '...' : diff}
                  </span>
                ))}
              </div>

              {idea.confidence_score !== null && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Confidence:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${idea.confidence_score * 100}%` }}
                      />
                    </div>
                    <span>{Math.round(idea.confidence_score * 100)}%</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {idea.problem_title.substring(0, 30)}
                    {idea.problem_title.length > 30 ? '...' : ''}
                  </span>
                  <span>
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          savedStatus={{ is_saved: false, saved_id: null }}
          onSave={() => {}}
          onUnsave={() => {}}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </div>
  );
}

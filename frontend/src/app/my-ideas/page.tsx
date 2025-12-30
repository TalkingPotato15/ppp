'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ideasApi } from '@/lib/api';
import { SavedIdea, Idea } from '@/types/idea';
import { IdeaDetail } from '@/components/stage-b';

export default function MyIdeasPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const fetchSavedIdeas = useCallback(async () => {
    try {
      const response = await ideasApi.getSavedIdeas();
      setSavedIdeas(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch saved ideas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/my-ideas');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedIdeas();
    }
  }, [isAuthenticated, fetchSavedIdeas]);

  const handleUnsave = async (savedId: string) => {
    try {
      await ideasApi.unsaveIdea(savedId);
      setSavedIdeas((prev) => prev.filter((item) => item.id !== savedId));
      setTotal((prev) => prev - 1);
      setSelectedIdea(null);
      setSelectedSavedId(null);
    } catch (error) {
      console.error('Failed to unsave idea:', error);
    }
  };

  const handleSelectIdea = (savedIdea: SavedIdea) => {
    setSelectedIdea(savedIdea.idea);
    setSelectedSavedId(savedIdea.id);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Saved Ideas</h1>
        <p className="text-gray-600">
          {total > 0
            ? `You have ${total} saved idea${total !== 1 ? 's' : ''}`
            : 'Save ideas from Stage B to see them here'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : savedIdeas.length === 0 ? (
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Saved Ideas Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Generate ideas in Stage B and save the ones you like!
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
          {savedIdeas.map((savedIdea) => (
            <div
              key={savedIdea.id}
              onClick={() => handleSelectIdea(savedIdea)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 relative"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-8">
                  {savedIdea.idea.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnsave(savedIdea.id);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove from saved"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {savedIdea.idea.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {savedIdea.idea.differentiators.slice(0, 2).map((diff, index) => (
                  <span
                    key={index}
                    className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded"
                  >
                    {diff.length > 25 ? diff.substring(0, 25) + '...' : diff}
                  </span>
                ))}
              </div>

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
                    {savedIdea.problem_title.substring(0, 30)}
                    {savedIdea.problem_title.length > 30 ? '...' : ''}
                  </span>
                  <span>
                    {new Date(savedIdea.saved_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {savedIdea.notes && (
                <div className="mt-3 pt-3 border-t border-dashed">
                  <p className="text-xs text-gray-500 italic line-clamp-2">
                    Note: {savedIdea.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && selectedSavedId && (
        <IdeaDetail
          idea={selectedIdea}
          savedStatus={{ is_saved: true, saved_id: selectedSavedId }}
          onSave={() => {}}
          onUnsave={handleUnsave}
          onClose={() => {
            setSelectedIdea(null);
            setSelectedSavedId(null);
          }}
        />
      )}
    </div>
  );
}

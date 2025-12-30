'use client';

import { useState } from 'react';
import { ProblemCard } from '@/components/discovery/ProblemCard';
import { FilterBar } from '@/components/discovery/FilterBar';
import { Pagination } from '@/components/discovery/Pagination';
import { InfiniteScroll } from '@/components/discovery/InfiniteScroll';
import { ProblemPreview } from '@/components/discovery/ProblemPreview';
import { AuthModal } from '@/components/auth/AuthModal';
import { useProblems } from '@/hooks/useProblems';
import { useIsDesktop } from '@/hooks/useMediaQuery';

export default function DiscoveryPage() {
  const isDesktop = useIsDesktop();
  const {
    problems,
    total,
    hasMore,
    isLoading,
    filters,
    setFilters,
    loadMore,
    goToPage,
    currentPage,
    totalPages,
  } = useProblems({ initialLimit: isDesktop ? 12 : 20 });

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingProblemId, setPendingProblemId] = useState<string | null>(null);

  const handleCardClick = (problemId: string) => {
    setSelectedProblemId(problemId);
  };

  const handleAuthRequired = () => {
    setPendingProblemId(selectedProblemId);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Continue with the originally selected problem
    if (pendingProblemId) {
      window.location.href = `/stage-b/${pendingProblemId}`;
    }
  };

  const cardGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {problems.map((problem) => (
        <ProblemCard
          key={problem.id}
          problem={problem}
          onClick={() => handleCardClick(problem.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Market Problems
        </h1>
        <p className="text-gray-600">
          Browse {total} market problems and find opportunities for AI-powered solutions.
        </p>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {isLoading && problems.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No problems found matching your filters.
        </div>
      ) : isDesktop ? (
        <>
          {cardGrid}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </>
      ) : (
        <InfiniteScroll
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={loadMore}
        >
          {cardGrid}
        </InfiniteScroll>
      )}

      <ProblemPreview
        problemId={selectedProblemId}
        onClose={() => setSelectedProblemId(null)}
        onAuthRequired={handleAuthRequired}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

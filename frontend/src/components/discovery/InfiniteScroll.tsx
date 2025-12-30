'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  children,
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <div>
      {children}
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isLoading && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
        )}
        {!hasMore && !isLoading && (
          <span className="text-gray-500 text-sm">No more problems to load</span>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProblemCard, ProblemFilters, ProblemListResponse } from '@/types/problem';
import { discoveryApi } from '@/lib/api';

interface UseProblemsOptions {
  initialLimit?: number;
}

interface UseProblemsResult {
  problems: ProblemCard[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  filters: ProblemFilters;
  setFilters: (filters: ProblemFilters) => void;
  loadMore: () => void;
  goToPage: (page: number) => void;
  refetch: () => void;
  currentPage: number;
  totalPages: number;
}

export function useProblems(options: UseProblemsOptions = {}): UseProblemsResult {
  const { initialLimit = 20 } = options;

  const [problems, setProblems] = useState<ProblemCard[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ProblemFilters>({});
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);

  const fetchProblems = useCallback(
    async (append: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await discoveryApi.getProblems({
          ...filters,
          limit,
          offset: append ? offset : 0,
        });

        const data = response.data as ProblemListResponse;

        if (append) {
          setProblems((prev) => [...prev, ...data.items]);
        } else {
          setProblems(data.items);
        }

        setTotal(data.total);
        setHasMore(data.has_more);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch problems'));
      } finally {
        setIsLoading(false);
      }
    },
    [filters, limit, offset]
  );

  useEffect(() => {
    setOffset(0);
    fetchProblems(false);
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + limit);
      fetchProblems(true);
    }
  }, [isLoading, hasMore, limit, fetchProblems]);

  const goToPage = useCallback(
    (page: number) => {
      const newOffset = (page - 1) * limit;
      setOffset(newOffset);
      fetchProblems(false);
    },
    [limit, fetchProblems]
  );

  const refetch = useCallback(() => {
    setOffset(0);
    fetchProblems(false);
  }, [fetchProblems]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return {
    problems,
    total,
    hasMore,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore,
    goToPage,
    refetch,
    currentPage,
    totalPages,
  };
}

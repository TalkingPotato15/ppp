'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  GenerationSession,
  GenerationStatus,
  SavedStatus,
} from '@/types/idea';
import { ideasApi } from '@/lib/api';

interface UseIdeasOptions {
  problemId: string;
}

interface UseIdeasResult {
  session: GenerationSession | null;
  status: GenerationStatus | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  savedStatuses: Record<string, SavedStatus>;
  generateIdeas: (feedback?: string) => Promise<void>;
  saveIdea: (ideaId: string) => Promise<void>;
  unsaveIdea: (savedId: string, ideaId: string) => Promise<void>;
  refetchSavedStatuses: () => Promise<void>;
}

export function useIdeas({ problemId }: UseIdeasOptions): UseIdeasResult {
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStatuses, setSavedStatuses] = useState<Record<string, SavedStatus>>({});

  const fetchLatestSession = useCallback(async () => {
    try {
      const response = await ideasApi.getLatestSessionForProblem(problemId);
      setSession(response.data);
      return response.data as GenerationSession;
    } catch {
      // No session exists yet, which is fine
      return null;
    }
  }, [problemId]);

  const fetchSavedStatuses = useCallback(async (ideas: { id: string }[]) => {
    const statuses: Record<string, SavedStatus> = {};
    await Promise.all(
      ideas.map(async (idea) => {
        try {
          const response = await ideasApi.checkSavedStatus(idea.id);
          statuses[idea.id] = response.data;
        } catch {
          statuses[idea.id] = { is_saved: false, saved_id: null };
        }
      })
    );
    setSavedStatuses(statuses);
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const latestSession = await fetchLatestSession();
        if (latestSession?.ideas && latestSession.ideas.length > 0) {
          await fetchSavedStatuses(latestSession.ideas);
        }
      } catch {
        // Ignore errors during initial load
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [problemId, fetchLatestSession, fetchSavedStatuses]);

  const generateIdeas = useCallback(
    async (feedback?: string) => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await ideasApi.generate(problemId, feedback);
        const newSession = response.data as GenerationSession;
        setSession(newSession);

        if (newSession.ideas && newSession.ideas.length > 0) {
          await fetchSavedStatuses(newSession.ideas);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate ideas';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [problemId, fetchSavedStatuses]
  );

  const saveIdea = useCallback(async (ideaId: string) => {
    try {
      await ideasApi.saveIdea(ideaId);
      const response = await ideasApi.checkSavedStatus(ideaId);
      setSavedStatuses((prev) => ({
        ...prev,
        [ideaId]: response.data,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save idea';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const unsaveIdea = useCallback(async (savedId: string, ideaId: string) => {
    try {
      await ideasApi.unsaveIdea(savedId);
      setSavedStatuses((prev) => ({
        ...prev,
        [ideaId]: { is_saved: false, saved_id: null },
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to unsave idea';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refetchSavedStatuses = useCallback(async () => {
    if (session?.ideas && session.ideas.length > 0) {
      await fetchSavedStatuses(session.ideas);
    }
  }, [session, fetchSavedStatuses]);

  return {
    session,
    status: session?.status ?? null,
    isLoading,
    isGenerating,
    error,
    savedStatuses,
    generateIdeas,
    saveIdea,
    unsaveIdea,
    refetchSavedStatuses,
  };
}

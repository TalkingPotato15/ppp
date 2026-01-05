'use client';

import { useState } from 'react';
import type { UserConstraints } from '@/types/stage-c';

interface RegenerateButtonProps {
  ideaId: string;
  remainingCount: number;
  currentConstraints: UserConstraints;
  onRegenerate: (constraints: UserConstraints) => Promise<void>;
  disabled?: boolean;
}

export function RegenerateButton({
  ideaId,
  remainingCount,
  currentConstraints,
  onRegenerate,
  disabled = false,
}: RegenerateButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canRegenerate = remainingCount > 0 && !disabled;

  const handleRegenerate = async () => {
    if (!canRegenerate) return;

    setIsRegenerating(true);
    try {
      await onRegenerate(currentConstraints);
    } finally {
      setIsRegenerating(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">
            Regenerate Specification?
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Remaining regenerations: {remainingCount}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={isRegenerating}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Regenerating...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      disabled={!canRegenerate || isRegenerating}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${canRegenerate
          ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white hover:from-orange-500 hover:to-amber-600 shadow-sm hover:shadow'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Regenerate
      <span className={`px-1.5 py-0.5 text-xs rounded ${canRegenerate ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
        {remainingCount} left
      </span>
    </button>
  );
}

'use client';

import { useState } from 'react';

interface GenerateSpecButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  remainingRegenerations?: number;
  isRegeneration?: boolean;
}

export function GenerateSpecButton({
  onClick,
  isLoading,
  disabled = false,
  remainingRegenerations,
  isRegeneration = false,
}: GenerateSpecButtonProps) {
  const buttonText = isRegeneration ? 'Regenerate Spec' : 'Generate Technical Spec';
  const loadingText = isRegeneration ? 'Regenerating...' : 'Generating...';

  const isDisabled = disabled || isLoading || (remainingRegenerations !== undefined && remainingRegenerations <= 0 && isRegeneration);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={`
          px-8 py-4 rounded-xl text-lg font-semibold transition-all
          flex items-center gap-3 shadow-lg
          ${isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            {buttonText}
          </>
        )}
      </button>

      {remainingRegenerations !== undefined && (
        <p className="text-sm text-gray-500">
          {isRegeneration ? (
            remainingRegenerations > 0 ? (
              <>
                Regenerations left: <span className="font-medium text-blue-600">{remainingRegenerations}</span>
              </>
            ) : (
              <span className="text-red-500">No regenerations remaining</span>
            )
          ) : (
            <>
              Initial generation + <span className="font-medium">{remainingRegenerations}</span> regenerations included
            </>
          )}
        </p>
      )}
    </div>
  );
}

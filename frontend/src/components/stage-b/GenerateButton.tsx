'use client';

import { GenerationStatus } from '@/types/idea';

interface GenerateButtonProps {
  status: GenerationStatus | null;
  hasExistingIdeas: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function GenerateButton({
  status,
  hasExistingIdeas,
  onClick,
  disabled = false,
}: GenerateButtonProps) {
  const isGenerating = status === 'GENERATING' || status === 'PENDING';
  const buttonText = hasExistingIdeas ? 'Regenerate Ideas' : 'Generate Ideas';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isGenerating}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
        isGenerating
          ? 'bg-primary-300 text-white cursor-not-allowed'
          : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isGenerating ? (
        <>
          <svg
            className="w-5 h-5 animate-spin"
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
          <span>Generating Ideas...</span>
        </>
      ) : (
        <>
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}

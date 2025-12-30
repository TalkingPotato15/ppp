'use client';

import { useState } from 'react';

interface FeedbackInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
}

export function FeedbackInput({
  value,
  onChange,
  disabled = false,
  maxLength = 500,
}: FeedbackInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span>Add feedback for better results (optional)</span>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Describe what you'd like to see in the generated ideas. For example: 'Focus on B2B solutions' or 'Include mobile-first approaches'"
            maxLength={maxLength}
            rows={3}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
              disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
            }`}
          />
          <div className="flex justify-end">
            <span className={`text-xs ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
              {value.length}/{maxLength}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

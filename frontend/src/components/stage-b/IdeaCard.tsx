'use client';

import { useState } from 'react';
import { Idea, SavedStatus } from '@/types/idea';

interface IdeaCardProps {
  idea: Idea;
  savedStatus?: SavedStatus;
  onSave: (ideaId: string) => void;
  onUnsave: (savedId: string) => void;
  onExpand: (idea: Idea) => void;
}

export function IdeaCard({
  idea,
  savedStatus,
  onSave,
  onUnsave,
  onExpand,
}: IdeaCardProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      if (savedStatus?.is_saved && savedStatus.saved_id) {
        await onUnsave(savedStatus.saved_id);
      } else {
        await onSave(idea.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={() => onExpand(idea)}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 relative"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-8">
          {idea.title}
        </h3>
        <button
          onClick={handleSaveToggle}
          disabled={isSaving}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            savedStatus?.is_saved
              ? 'text-red-500 hover:bg-red-50'
              : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={savedStatus?.is_saved ? 'Remove from saved' : 'Save idea'}
        >
          {isSaving ? (
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
          ) : (
            <svg
              className="w-5 h-5"
              fill={savedStatus?.is_saved ? 'currentColor' : 'none'}
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
          )}
        </button>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {idea.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {idea.differentiators.slice(0, 3).map((diff, index) => (
          <span
            key={index}
            className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded"
          >
            {diff.length > 30 ? diff.substring(0, 30) + '...' : diff}
          </span>
        ))}
        {idea.differentiators.length > 3 && (
          <span className="text-gray-400 text-xs px-2 py-1">
            +{idea.differentiators.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Target: {idea.target_audience.substring(0, 40)}...
        </span>
        <span className="text-primary-600 hover:text-primary-700">
          View details &rarr;
        </span>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Idea, SavedStatus } from '@/types/idea';

interface IdeaCardProps {
  idea: Idea;
  savedStatus?: SavedStatus;
  onSave: (ideaId: string) => void;
  onUnsave: (savedId: string) => void;
  onBookmark: (ideaId: string, isBookmarked: boolean) => void;
  onExpand: (idea: Idea) => void;
}

export function IdeaCard({
  idea,
  savedStatus,
  onSave,
  onUnsave,
  onBookmark,
  onExpand,
}: IdeaCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

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

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarking(true);
    try {
      await onBookmark(idea.id, !idea.is_bookmarked);
    } finally {
      setIsBookmarking(false);
    }
  };

  return (
    <div
      onClick={() => onExpand(idea)}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 relative"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-16">
          {idea.title}
        </h3>
        <div className="absolute top-4 right-4 flex gap-1">
          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            disabled={isBookmarking}
            className={`p-2 rounded-full transition-colors ${
              idea.is_bookmarked
                ? 'text-yellow-500 hover:bg-yellow-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
            } ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={idea.is_bookmarked ? 'Remove bookmark' : 'Bookmark idea'}
          >
            {isBookmarking ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill={idea.is_bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
          {/* Save Button */}
          <button
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={`p-2 rounded-full transition-colors ${
              savedStatus?.is_saved
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={savedStatus?.is_saved ? 'Remove from saved' : 'Save idea'}
          >
            {isSaving ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill={savedStatus?.is_saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
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

      {/* Confidence Score */}
      {idea.confidence_score !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Confidence</span>
            <span>{Math.round(idea.confidence_score * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                idea.confidence_score >= 0.7
                  ? 'bg-green-500'
                  : idea.confidence_score >= 0.4
                  ? 'bg-yellow-500'
                  : 'bg-red-400'
              }`}
              style={{ width: `${idea.confidence_score * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Market Signal Preview */}
      {idea.market_signals && idea.market_signals.length > 0 && (
        <div className="mb-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {idea.market_signals[0].length > 50
              ? idea.market_signals[0].substring(0, 50) + '...'
              : idea.market_signals[0]}
          </span>
        </div>
      )}

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

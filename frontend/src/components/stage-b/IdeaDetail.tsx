'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Idea, SavedStatus } from '@/types/idea';

interface IdeaDetailProps {
  idea: Idea;
  savedStatus?: SavedStatus;
  onSave: (ideaId: string) => void;
  onUnsave: (savedId: string) => void;
  onClose: () => void;
  showStageCButton?: boolean;
}

export function IdeaDetail({
  idea,
  savedStatus,
  onSave,
  onUnsave,
  onClose,
  showStageCButton = true,
}: IdeaDetailProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleGoToStageC = () => {
    router.push(`/stage-c/${idea.id}`);
  };

  const handleSaveToggle = async () => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">{idea.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                savedStatus?.is_saved
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              {savedStatus?.is_saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Confidence Score */}
          {idea.confidence_score !== null && (
            <section className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Data Confidence Score
                </h3>
                <span
                  className={`text-lg font-bold ${
                    idea.confidence_score >= 0.7
                      ? 'text-green-600'
                      : idea.confidence_score >= 0.4
                      ? 'text-yellow-600'
                      : 'text-red-500'
                  }`}
                >
                  {Math.round(idea.confidence_score * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    idea.confidence_score >= 0.7
                      ? 'bg-green-500'
                      : idea.confidence_score >= 0.4
                      ? 'bg-yellow-500'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${idea.confidence_score * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Based on how well this idea is grounded in market data
              </p>
            </section>
          )}

          {/* Market Signals */}
          {idea.market_signals && idea.market_signals.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Market Signals
              </h3>
              <ul className="space-y-2">
                {idea.market_signals.map((signal, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3"
                  >
                    <svg
                      className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span className="text-gray-700 text-sm">{signal}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-gray-700 leading-relaxed">{idea.description}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Target Audience
            </h3>
            <p className="text-gray-700 leading-relaxed">{idea.target_audience}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Key Differentiators
            </h3>
            <ul className="space-y-2">
              {idea.differentiators.map((diff, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{diff}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Market Opportunity
            </h3>
            <p className="text-gray-700 leading-relaxed">{idea.market_opportunity}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Implementation Hints
            </h3>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{idea.implementation_hints}</p>
            </div>
          </section>

          <div className="text-xs text-gray-400 pt-4 border-t">
            Generated at: {new Date(idea.created_at).toLocaleString()}
          </div>

          {/* Stage C CTA */}
          {showStageCButton && (
            <div className="pt-6 border-t mt-6">
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Ready to build this idea?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Generate a complete technical specification including PRD, architecture, and roadmap.
                    </p>
                  </div>
                  <button
                    onClick={handleGoToStageC}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium whitespace-nowrap"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Go to Stage C
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { PRDDocument, Priority } from '@/types/stage-c';
import { PRIORITY_COLORS } from '@/types/stage-c';

interface PRDViewerProps {
  prd: PRDDocument;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  P0: 'Essential (P0)',
  P1: 'High (P1)',
  P2: 'Medium (P2)',
  P3: 'Low (P3)',
};

export function PRDViewer({ prd }: PRDViewerProps) {
  if (!prd) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">Loading PRD data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title & Overview */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{prd.title}</h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Overview</h3>
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">{prd.overview}</p>
        </div>
      </section>

      {/* Requirements */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Requirements
        </h3>
        <div className="space-y-4">
          {prd.requirements.map((req) => (
            <div
              key={req.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">{req.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>
                    {PRIORITY_LABELS[req.priority]}
                  </span>
                </div>
              </div>
              <p className="text-gray-800 font-medium mb-3">{req.description}</p>
              {req.acceptanceCriteria.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Acceptance Criteria</p>
                  <ul className="space-y-1">
                    {req.acceptanceCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* User Stories */}
      {prd.userStories.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            User Stories
          </h3>
          <ul className="space-y-3">
            {prd.userStories.map((story, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="text-gray-700">{story}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Scope */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Scope
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Included */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Included
            </h4>
            <ul className="space-y-2">
              {prd.scope.included.map((item, index) => (
                <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Excluded */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Excluded
            </h4>
            <ul className="space-y-2">
              {prd.scope.excluded.map((item, index) => (
                <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

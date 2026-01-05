'use client';

import type { TechnicalSpecification } from '@/types/stage-c';

interface VersionHistoryListProps {
  specifications: TechnicalSpecification[];
  currentVersionId: string;
  onVersionSelect: (specification: TechnicalSpecification) => void;
}

export function VersionHistoryList({
  specifications,
  currentVersionId,
  onVersionSelect,
}: VersionHistoryListProps) {
  if (specifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No specifications generated yet.
      </div>
    );
  }

  // Sort by version number descending (most recent first)
  const sortedSpecs = [...specifications].sort(
    (a, b) => b.versionNumber - a.versionNumber
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Version History
      </h3>

      <div className="space-y-1">
        {sortedSpecs.map((spec) => {
          const isCurrentVersion = spec.id === currentVersionId;
          const createdDate = new Date(spec.createdAt);

          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => onVersionSelect(spec)}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg text-left transition-all
                ${isCurrentVersion
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCurrentVersion
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  v{spec.versionNumber}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isCurrentVersion ? 'text-blue-700' : 'text-gray-900'}`}>
                    Version {spec.versionNumber}
                    {spec.versionNumber === sortedSpecs[0].versionNumber && (
                      <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Latest
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {createdDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status indicator */}
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    spec.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : spec.status === 'generating'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {spec.status === 'completed'
                    ? 'Completed'
                    : spec.status === 'generating'
                    ? 'Generating'
                    : 'Failed'}
                </span>

                {/* Arrow indicator for current */}
                {isCurrentVersion && (
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-gray-100 mt-3">
        <p className="text-xs text-gray-400">
          Total {specifications.length} versions
        </p>
      </div>
    </div>
  );
}

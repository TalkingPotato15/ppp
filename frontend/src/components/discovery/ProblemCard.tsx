'use client';

import { ProblemCard as ProblemCardType } from '@/types/problem';

interface ProblemCardProps {
  problem: ProblemCardType;
  onClick: () => void;
}

const trendColors = {
  RISING: 'bg-green-100 text-green-800',
  STABLE: 'bg-gray-100 text-gray-800',
  DECLINING: 'bg-red-100 text-red-800',
};

const sentimentColors = {
  POSITIVE: 'bg-blue-100 text-blue-800',
  NEUTRAL: 'bg-gray-100 text-gray-800',
  NEGATIVE: 'bg-orange-100 text-orange-800',
};

export function ProblemCard({ problem, onClick }: ProblemCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
        {problem.title}
      </h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {problem.keywords.slice(0, 6).map((keyword, index) => (
          <span
            key={index}
            className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span
            className={`text-xs px-2 py-1 rounded ${trendColors[problem.trend]}`}
          >
            {problem.trend}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded ${sentimentColors[problem.sentiment]}`}
          >
            {problem.sentiment}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(problem.posted_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

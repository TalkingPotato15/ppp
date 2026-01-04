'use client';

import type { TechStackRecommendation, TechCategory } from '@/types/stage-c';
import { TECH_CATEGORY_LABELS } from '@/types/stage-c';

interface TechStackViewerProps {
  techStack: TechStackRecommendation[];
}

const CATEGORY_ICONS: Record<TechCategory, React.ReactNode> = {
  frontend: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  backend: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  infrastructure: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  monitoring: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  ci_cd: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

const CATEGORY_COLORS: Record<TechCategory, string> = {
  frontend: 'bg-blue-50 border-blue-200',
  backend: 'bg-green-50 border-green-200',
  database: 'bg-purple-50 border-purple-200',
  infrastructure: 'bg-orange-50 border-orange-200',
  monitoring: 'bg-pink-50 border-pink-200',
  ci_cd: 'bg-cyan-50 border-cyan-200',
};

export function TechStackViewer({ techStack }: TechStackViewerProps) {
  // Group by category
  const groupedStack = techStack.reduce((acc, tech) => {
    const category = tech.category as TechCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tech);
    return acc;
  }, {} as Record<TechCategory, TechStackRecommendation[]>);

  const categories = Object.keys(groupedStack) as TechCategory[];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">기술 스택 추천</h3>
        <p className="text-indigo-100 text-sm">
          예산, 팀 구성, 일정을 고려하여 최적화된 기술 스택을 추천합니다.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          {techStack.map((tech, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium"
            >
              {tech.recommended}
            </span>
          ))}
        </div>
      </div>

      {/* Detailed recommendations by category */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">
                {CATEGORY_ICONS[category]}
              </span>
              <h4 className="font-semibold text-gray-900">
                {TECH_CATEGORY_LABELS[category]}
              </h4>
            </div>

            {groupedStack[category].map((tech, index) => (
              <div
                key={index}
                className={`border rounded-lg p-5 ${CATEGORY_COLORS[category]}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h5 className="text-lg font-bold text-gray-900">
                      {tech.recommended}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">{tech.rationale}</p>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                    {tech.estimatedCost}
                  </span>
                </div>

                {/* Alternatives */}
                {tech.alternatives.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">대안</p>
                    <div className="flex flex-wrap gap-2">
                      {tech.alternatives.map((alt, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-white/60 text-gray-600 rounded text-sm"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraint Alignment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/50">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">예산</p>
                      <p className="text-sm text-gray-700">{tech.constraintAlignment.budget}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">팀</p>
                      <p className="text-sm text-gray-700">{tech.constraintAlignment.team}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">일정</p>
                      <p className="text-sm text-gray-700">{tech.constraintAlignment.timeline}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import type { MVPRoadmap } from '@/types/stage-c';

interface RoadmapViewerProps {
  roadmap: MVPRoadmap;
}

export function RoadmapViewer({ roadmap }: RoadmapViewerProps) {
  return (
    <div className="space-y-8">
      {/* Total Duration Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-blue-100 text-sm">전체 예상 기간</p>
            <p className="text-2xl font-bold">{roadmap.totalDuration}</p>
          </div>
        </div>
      </div>

      {/* Phases Timeline */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">개발 단계</h3>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Phases */}
          <div className="space-y-8">
            {roadmap.phases.map((phase, index) => (
              <div key={index} className="relative pl-16">
                {/* Timeline dot */}
                <div className="absolute left-4 top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow" />

                {/* Phase card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                        Phase {index + 1}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900 mt-1">
                        {phase.name}
                      </h4>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {phase.duration}
                    </span>
                  </div>

                  {/* Milestones */}
                  {phase.milestones.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">마일스톤</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.milestones.map((milestone, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {milestone}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {phase.deliverables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">산출물</p>
                      <ul className="space-y-1">
                        {phase.deliverables.map((deliverable, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {deliverable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dependencies */}
                  {phase.dependencies && phase.dependencies.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">선행 조건</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.dependencies.map((dep, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{roadmap.phases.length}</p>
          <p className="text-sm text-gray-500">단계</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {roadmap.phases.reduce((sum, p) => sum + p.milestones.length, 0)}
          </p>
          <p className="text-sm text-gray-500">마일스톤</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {roadmap.phases.reduce((sum, p) => sum + p.deliverables.length, 0)}
          </p>
          <p className="text-sm text-gray-500">산출물</p>
        </div>
      </section>
    </div>
  );
}

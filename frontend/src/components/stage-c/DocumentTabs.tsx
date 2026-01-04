'use client';

import { useState } from 'react';
import type { TechnicalSpecification } from '@/types/stage-c';
import { PRDViewer } from './PRDViewer';
import { ArchitectureViewer } from './ArchitectureViewer';
import { RoadmapViewer } from './RoadmapViewer';
import { TechStackViewer } from './TechStackViewer';

type TabId = 'prd' | 'architecture' | 'roadmap' | 'techstack';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'prd',
    label: 'PRD',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'architecture',
    label: '아키텍처',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'roadmap',
    label: '로드맵',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'techstack',
    label: '기술 스택',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

interface DocumentTabsProps {
  specification: TechnicalSpecification;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export function DocumentTabs({
  specification,
  activeTab: controlledActiveTab,
  onTabChange,
}: DocumentTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>('prd');

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const handleTabChange = (tab: TabId) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'prd':
        return <PRDViewer prd={specification.prd} />;
      case 'architecture':
        return <ArchitectureViewer architecture={specification.architecture} />;
      case 'roadmap':
        return <RoadmapViewer roadmap={specification.roadmap} />;
      case 'techstack':
        return <TechStackViewer techStack={specification.techStack} />;
    }
  };

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="py-6">
        {renderTabContent()}
      </div>
    </div>
  );
}

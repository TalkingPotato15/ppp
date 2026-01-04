'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  TechnicalSpecification,
  UserConstraints,
  StageCSt,
} from '@/types/stage-c';
import { ConstraintsForm } from './ConstraintsForm';
import { GenerateSpecButton } from './GenerateSpecButton';
import { SpecGenerationProgress } from './SpecGenerationProgress';
import { DocumentTabs } from './DocumentTabs';
import { ExportButton } from './ExportButton';
import { RegenerateButton } from './RegenerateButton';
import { QuotaDisplay } from './QuotaDisplay';
import { VersionHistoryList } from './VersionHistoryList';
import { VersionBadge } from './VersionBadge';

interface StageCPageProps {
  ideaId: string;
  ideaTitle: string;
  ideaDescription: string;
}

type ViewState = 'constraints' | 'generating' | 'result';

export function StageCPage({
  ideaId,
  ideaTitle,
  ideaDescription,
}: StageCPageProps) {
  const [viewState, setViewState] = useState<ViewState>('constraints');
  const [state, setState] = useState<StageCSt>({
    isLoading: false,
    isGenerating: false,
    specification: null,
    specifications: [],
    remainingRegenerations: 3,
    error: null,
    activeTab: 'prd',
  });
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Load existing specifications on mount
  useEffect(() => {
    const loadSpecifications = async () => {
      try {
        const response = await fetch(`/api/specifications?ideaId=${ideaId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.specifications.length > 0) {
            // Show the latest specification
            const latestSpec = data.specifications[0];
            setState((prev) => ({
              ...prev,
              specifications: data.specifications,
              specification: latestSpec,
              remainingRegenerations: data.remainingRegenerations,
            }));
            if (latestSpec.status === 'completed') {
              setViewState('result');
            }
          }
        }
      } catch (error) {
        console.error('Failed to load specifications:', error);
      }
    };

    loadSpecifications();
  }, [ideaId]);

  const handleGenerate = useCallback(
    async (constraints: UserConstraints) => {
      setState((prev) => ({ ...prev, isGenerating: true, error: null }));
      setViewState('generating');

      try {
        const response = await fetch('/api/specifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId, constraints }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to generate specification');
        }

        const data = await response.json();
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          specification: data.specification,
          specifications: [data.specification, ...prev.specifications],
          remainingRegenerations: data.remainingRegenerations,
        }));
        setViewState('result');
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
        setViewState('constraints');
      }
    },
    [ideaId]
  );

  const handleRegenerate = useCallback(
    async (constraints: UserConstraints) => {
      await handleGenerate(constraints);
    },
    [handleGenerate]
  );

  const handleVersionSelect = useCallback((spec: TechnicalSpecification) => {
    setState((prev) => ({ ...prev, specification: spec }));
    setShowVersionHistory(false);
  }, []);

  const renderContent = () => {
    switch (viewState) {
      case 'constraints':
        return (
          <div className="max-w-3xl mx-auto">
            {/* Idea summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {ideaTitle}
              </h2>
              <p className="text-gray-600 text-sm">{ideaDescription}</p>
            </div>

            {/* Error display */}
            {state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{state.error}</p>
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-6">
              기술 사양 조건을 입력해주세요
            </h3>

            <ConstraintsForm
              onSubmit={handleGenerate}
              isLoading={state.isGenerating}
            />
          </div>
        );

      case 'generating':
        return (
          <SpecGenerationProgress
            isGenerating={state.isGenerating}
          />
        );

      case 'result':
        if (!state.specification) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">사양서를 찾을 수 없습니다.</p>
            </div>
          );
        }

        const isLatestVersion =
          state.specifications[0]?.id === state.specification.id;

        return (
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {state.specification.prd.title}
                  </h2>
                  <VersionBadge
                    versionNumber={state.specification.versionNumber}
                    isLatest={isLatestVersion}
                  />
                </div>
                <p className="text-gray-500 text-sm">
                  생성일: {new Date(state.specification.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Version history toggle */}
                <button
                  type="button"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showVersionHistory
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  히스토리
                  <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                    {state.specifications.length}
                  </span>
                </button>

                <RegenerateButton
                  ideaId={ideaId}
                  remainingCount={state.remainingRegenerations}
                  currentConstraints={state.specification.constraintsSnapshot}
                  onRegenerate={handleRegenerate}
                />

                <ExportButton
                  specification={state.specification}
                  ideaId={ideaId}
                />
              </div>
            </div>

            {/* Main content area */}
            <div className="flex gap-6">
              {/* Document viewer */}
              <div className={`flex-1 bg-white rounded-xl border border-gray-200 ${showVersionHistory ? 'mr-80' : ''}`}>
                <DocumentTabs
                  specification={state.specification}
                  activeTab={state.activeTab}
                  onTabChange={(tab) => setState((prev) => ({ ...prev, activeTab: tab }))}
                />
              </div>

              {/* Version history sidebar */}
              {showVersionHistory && (
                <div className="fixed right-6 top-24 w-72 bg-white rounded-xl border border-gray-200 p-4 shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto">
                  <VersionHistoryList
                    specifications={state.specifications}
                    currentVersionId={state.specification.id}
                    onVersionSelect={handleVersionSelect}
                  />
                </div>
              )}
            </div>

            {/* Quota display */}
            <div className="mt-6 max-w-sm">
              <QuotaDisplay
                usedCount={3 - state.remainingRegenerations}
                maxCount={3}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {renderContent()}
    </div>
  );
}

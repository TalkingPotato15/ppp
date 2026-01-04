'use client';

import { useEffect, useRef, useState } from 'react';
import type { ArchitectureDiagram } from '@/types/stage-c';

interface ArchitectureViewerProps {
  architecture: ArchitectureDiagram;
}

export function ArchitectureViewer({ architecture }: ArchitectureViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!architecture.diagramCode || !mermaidRef.current) {
        setIsLoading(false);
        return;
      }

      try {
        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
        });

        const { svg } = await mermaid.render('architecture-diagram', architecture.diagramCode);
        setDiagramSvg(svg);
        setDiagramError(null);
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
        setDiagramError('다이어그램 렌더링에 실패했습니다.');
        setDiagramSvg(null);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [architecture.diagramCode]);

  return (
    <div className="space-y-8">
      {/* Architecture Diagram */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          시스템 아키텍처 다이어그램
        </h3>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : diagramError ? (
            <div className="p-6">
              <p className="text-red-500 text-sm mb-4">{diagramError}</p>
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">원본 코드 보기</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto">
                  {architecture.diagramCode}
                </pre>
              </details>
            </div>
          ) : diagramSvg ? (
            <div
              ref={mermaidRef}
              className="p-6 flex justify-center"
              dangerouslySetInnerHTML={{ __html: diagramSvg }}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">
              다이어그램이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* Components */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          컴포넌트
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architecture.components.map((component, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{component.name}</h4>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  {component.technology}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{component.description}</p>

              {component.responsibilities.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">책임</p>
                  <ul className="space-y-1">
                    {component.responsibilities.map((resp, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      {architecture.integrations.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            외부 연동
          </h3>
          <div className="flex flex-wrap gap-2">
            {architecture.integrations.map((integration, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
              >
                {integration}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

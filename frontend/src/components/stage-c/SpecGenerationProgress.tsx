'use client';

import { useEffect, useState } from 'react';

interface SpecGenerationProgressProps {
  isGenerating: boolean;
  onComplete?: () => void;
}

const GENERATION_STEPS = [
  { id: 'analyzing', label: '비즈니스 아이디어 분석 중...', duration: 5000 },
  { id: 'prd', label: 'PRD 문서 생성 중...', duration: 10000 },
  { id: 'architecture', label: '시스템 아키텍처 설계 중...', duration: 12000 },
  { id: 'roadmap', label: 'MVP 로드맵 수립 중...', duration: 8000 },
  { id: 'techstack', label: '기술 스택 추천 중...', duration: 10000 },
  { id: 'finalizing', label: '최종 검토 및 마무리 중...', duration: 5000 },
];

export function SpecGenerationProgress({ isGenerating, onComplete }: SpecGenerationProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStepIndex(0);
      setProgress(0);
      return;
    }

    let elapsed = 0;
    const totalDuration = GENERATION_STEPS.reduce((sum, step) => sum + step.duration, 0);

    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95); // Cap at 95% until complete
      setProgress(newProgress);

      // Calculate current step based on elapsed time
      let accumulatedDuration = 0;
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        accumulatedDuration += GENERATION_STEPS[i].duration;
        if (elapsed < accumulatedDuration) {
          setCurrentStepIndex(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating && progress > 0) {
      // Generation completed - show 100%
      setProgress(100);
      onComplete?.();
    }
  }, [isGenerating, progress, onComplete]);

  if (!isGenerating && progress === 0) {
    return null;
  }

  const currentStep = GENERATION_STEPS[currentStepIndex];

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Main progress container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        {/* Animated icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            {/* Spinning ring */}
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-300 animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center text-gray-800 mb-2">
          Tech Architect가 분석 중입니다
        </h3>
        <p className="text-center text-gray-500 mb-6">
          약 45초 ~ 1분 정도 소요됩니다
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{currentStep?.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="space-y-3">
          {GENERATION_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-opacity ${
                index <= currentStepIndex ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-sm ${
                  index === currentStepIndex ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}
              >
                {step.label.replace('...', '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip section */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium">알고 계셨나요?</p>
            <p className="mt-1">Tech Architect AI는 예산, 팀 구성, 일정을 종합적으로 분석하여 실현 가능한 기술 사양을 생성합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

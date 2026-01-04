'use client';

import { useState, useCallback } from 'react';
import type { UserConstraints, TechPreferences } from '@/types/stage-c';
import { BudgetSelector } from './BudgetSelector';
import { TeamCompositionInput } from './TeamCompositionInput';
import { TimelineSelector } from './TimelineSelector';
import { TechPreferencesInput } from './TechPreferencesInput';
import {
  validateConstraints,
  isValidationSuccess,
  getDefaultConstraints,
  formatValidationWarnings,
} from '@/lib/constraint-validator';

interface ConstraintsFormProps {
  onSubmit: (constraints: UserConstraints) => void;
  isLoading?: boolean;
  initialValues?: Partial<UserConstraints>;
}

type FormStep = 'budget' | 'team' | 'timeline' | 'preferences';

const STEPS: Array<{ key: FormStep; label: string }> = [
  { key: 'budget', label: '예산' },
  { key: 'team', label: '팀 구성' },
  { key: 'timeline', label: '일정' },
  { key: 'preferences', label: '기술 선호' },
];

export function ConstraintsForm({
  onSubmit,
  isLoading = false,
  initialValues,
}: ConstraintsFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('budget');
  const [constraints, setConstraints] = useState<UserConstraints>(() => ({
    ...getDefaultConstraints(),
    ...initialValues,
  }));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const updateConstraints = useCallback(
    <K extends keyof UserConstraints>(
      key: K,
      value: UserConstraints[K]
    ) => {
      setConstraints((prev) => ({ ...prev, [key]: value }));
      // Clear error for this field
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    },
    []
  );

  const validateCurrentStep = useCallback((): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'budget':
        if (!constraints.budget.range) {
          stepErrors.budget = '예산 범위를 선택해주세요.';
        }
        break;
      case 'team':
        if (constraints.team.size < 1) {
          stepErrors.team = '팀 규모는 최소 1명 이상이어야 합니다.';
        }
        const { junior, middle, senior } = constraints.team.composition;
        const total = junior + middle + senior;
        if (total !== constraints.team.size) {
          stepErrors.team = `팀 구성원 합계(${total})가 팀 규모(${constraints.team.size})와 일치해야 합니다.`;
        }
        break;
      case 'timeline':
        if (!constraints.timeline) {
          stepErrors.timeline = '개발 기간을 선택해주세요.';
        }
        break;
      // preferences step has no required fields
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, constraints]);

  const goToNextStep = useCallback(() => {
    if (!validateCurrentStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  }, [currentStepIndex, validateCurrentStep]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  }, [currentStepIndex]);

  const handleSubmit = useCallback(() => {
    const result = validateConstraints(constraints);

    if (!isValidationSuccess(result)) {
      // Convert validation errors to form errors
      const formErrors: Record<string, string> = {};
      result.errors.forEach((error) => {
        const key = error.field.split('.')[0];
        if (!formErrors[key]) {
          formErrors[key] = error.message;
        }
      });
      setErrors(formErrors);
      return;
    }

    // Show warnings but allow submission
    if (result.warnings && result.warnings.length > 0) {
      setWarnings(result.warnings);
    }

    onSubmit(constraints);
  }, [constraints, onSubmit]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'budget':
        return (
          <BudgetSelector
            value={constraints.budget}
            onChange={(budget) => updateConstraints('budget', budget)}
            error={errors.budget}
          />
        );
      case 'team':
        return (
          <TeamCompositionInput
            value={constraints.team}
            onChange={(team) => updateConstraints('team', team)}
            error={errors.team}
          />
        );
      case 'timeline':
        return (
          <TimelineSelector
            value={constraints.timeline}
            onChange={(timeline) => updateConstraints('timeline', timeline)}
            error={errors.timeline}
          />
        );
      case 'preferences':
        return (
          <TechPreferencesInput
            value={constraints.techPreferences || {}}
            onChange={(prefs) =>
              updateConstraints('techPreferences', prefs as TechPreferences)
            }
          />
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (index < currentStepIndex) {
                    setCurrentStep(step.key);
                  }
                }}
                disabled={index > currentStepIndex}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStepIndex
                    ? 'bg-blue-500 text-white cursor-pointer'
                    : index === currentStepIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg
                    className="w-4 h-4"
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
                ) : (
                  index + 1
                )}
              </button>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  index === currentStepIndex
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderStepContent()}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 whitespace-pre-line">
              {formatValidationWarnings(warnings)}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStepIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            이전
          </button>

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLoading
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  생성 중...
                </span>
              ) : (
                '사양서 생성하기'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { Timeline } from '@/types/stage-c';
import { TIMELINE_DISPLAY } from '@/types/stage-c';

interface TimelineSelectorProps {
  value: Timeline;
  onChange: (timeline: Timeline) => void;
  error?: string;
}

const TIMELINE_OPTIONS: Array<{ value: Timeline; label: string; description: string }> = [
  {
    value: '1_TO_3_MONTHS',
    label: TIMELINE_DISPLAY['1_TO_3_MONTHS'],
    description: 'Need quick MVP launch'
  },
  {
    value: '3_TO_6_MONTHS',
    label: TIMELINE_DISPLAY['3_TO_6_MONTHS'],
    description: 'Core feature development & stabilization'
  },
  {
    value: '6_TO_12_MONTHS',
    label: TIMELINE_DISPLAY['6_TO_12_MONTHS'],
    description: 'High-quality product development'
  },
  {
    value: 'OVER_12_MONTHS',
    label: TIMELINE_DISPLAY['OVER_12_MONTHS'],
    description: 'Large-scale project or complex system'
  },
];

export function TimelineSelector({ value, onChange, error }: TimelineSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Development Timeline <span className="text-red-500">*</span>
      </label>

      <div className="space-y-2">
        {TIMELINE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full p-4 text-left border rounded-lg transition-colors ${
              value === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-medium ${
                value === option.value ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {option.label}
              </span>
              <div className={`w-4 h-4 rounded-full border-2 ${
                value === option.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {value === option.value && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{option.description}</p>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

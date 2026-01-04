'use client';

import { useState } from 'react';
import type { TechPreferences } from '@/types/stage-c';

interface TechPreferencesInputProps {
  value: TechPreferences;
  onChange: (prefs: TechPreferences) => void;
}

const POPULAR_LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'Kotlin', 'Swift'];
const POPULAR_PLATFORMS = ['Vercel', 'AWS', 'GCP', 'Azure', 'Supabase', 'Firebase', 'Heroku', 'Railway'];

// Framework compatibility map - which languages each framework works with
const FRAMEWORK_LANGUAGE_MAP: Record<string, string[]> = {
  // JavaScript/TypeScript frameworks
  'React': ['JavaScript', 'TypeScript'],
  'Next.js': ['JavaScript', 'TypeScript'],
  'Vue.js': ['JavaScript', 'TypeScript'],
  'Angular': ['TypeScript'],
  'NestJS': ['TypeScript'],
  'Express': ['JavaScript', 'TypeScript'],
  'Svelte': ['JavaScript', 'TypeScript'],
  // Python frameworks
  'FastAPI': ['Python'],
  'Django': ['Python'],
  'Flask': ['Python'],
  // Java frameworks
  'Spring Boot': ['Java', 'Kotlin'],
  // Go frameworks
  'Gin': ['Go'],
  'Echo': ['Go'],
  'Fiber': ['Go'],
  // Rust frameworks
  'Actix': ['Rust'],
  'Rocket': ['Rust'],
  // Swift frameworks
  'Vapor': ['Swift'],
  // Kotlin frameworks
  'Ktor': ['Kotlin'],
};

const ALL_FRAMEWORKS = Object.keys(FRAMEWORK_LANGUAGE_MAP);

// Get compatible frameworks based on selected languages
function getCompatibleFrameworks(selectedLanguages: string[]): string[] {
  if (!selectedLanguages || selectedLanguages.length === 0) {
    // No language selected - show all frameworks
    return ALL_FRAMEWORKS;
  }

  return ALL_FRAMEWORKS.filter((framework) => {
    const compatibleLanguages = FRAMEWORK_LANGUAGE_MAP[framework];
    // Show framework if ANY of the selected languages is compatible
    return selectedLanguages.some((lang) => compatibleLanguages.includes(lang));
  });
}

interface ChipInputProps {
  label: string;
  suggestions: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

function ChipInput({ label, suggestions, values, onChange, placeholder }: ChipInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addValue(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !values.includes(s) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative">
        <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg min-h-[42px]">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="text-blue-500 hover:text-blue-700"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={values.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none text-sm"
          />
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addValue(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TechPreferencesInput({ value, onChange }: TechPreferencesInputProps) {
  const selectedLanguages = value.languages || [];
  const compatibleFrameworks = getCompatibleFrameworks(selectedLanguages);

  const updateLanguages = (languages: string[]) => {
    // When languages change, remove any incompatible frameworks
    const newCompatible = getCompatibleFrameworks(languages);
    const currentFrameworks = value.frameworks || [];
    const filteredFrameworks = currentFrameworks.filter((f) => newCompatible.includes(f));

    onChange({
      ...value,
      languages: languages.length > 0 ? languages : undefined,
      frameworks: filteredFrameworks.length > 0 ? filteredFrameworks : undefined,
    });
  };

  const updatePreferences = (key: keyof TechPreferences, values: string[]) => {
    onChange({
      ...value,
      [key]: values.length > 0 ? values : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          기술 스택 선호도 <span className="text-gray-400">(선택사항)</span>
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          선호하는 기술이 있다면 입력해주세요. 입력하지 않으면 AI가 최적의 기술 스택을 추천합니다.
        </p>
      </div>

      <ChipInput
        label="프로그래밍 언어"
        suggestions={POPULAR_LANGUAGES}
        values={selectedLanguages}
        onChange={updateLanguages}
        placeholder="예: TypeScript, Python"
      />

      <ChipInput
        label="프레임워크"
        suggestions={compatibleFrameworks}
        values={value.frameworks || []}
        onChange={(values) => updatePreferences('frameworks', values)}
        placeholder={selectedLanguages.length > 0 ? "선택한 언어와 호환되는 프레임워크" : "언어를 먼저 선택하세요"}
      />

      <ChipInput
        label="플랫폼 / 인프라"
        suggestions={POPULAR_PLATFORMS}
        values={value.platforms || []}
        onChange={(values) => updatePreferences('platforms', values)}
        placeholder="예: Vercel, AWS"
      />
    </div>
  );
}

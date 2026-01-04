'use client';

import type { Team, TeamComposition } from '@/types/stage-c';

interface TeamCompositionInputProps {
  value: Team;
  onChange: (team: Team) => void;
  error?: string;
}

export function TeamCompositionInput({
  value,
  onChange,
  error,
}: TeamCompositionInputProps) {
  const handleSizeChange = (size: number) => {
    onChange({
      ...value,
      size,
    });
  };

  const handleCompositionChange = (
    level: keyof TeamComposition,
    count: number
  ) => {
    const newComposition = {
      ...value.composition,
      [level]: count,
    };
    onChange({
      ...value,
      composition: newComposition,
    });
  };

  const totalComposition =
    value.composition.junior +
    value.composition.middle +
    value.composition.senior;

  const isCompositionValid = totalComposition === value.size;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        팀 구성 <span className="text-red-500">*</span>
      </label>

      {/* Team Size */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">
          총 팀 규모: {value.size}명
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={value.size}
          onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1명</span>
          <span>20명</span>
        </div>
      </div>

      {/* Team Composition */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600">스킬 레벨별 구성</p>

        <div className="grid grid-cols-3 gap-3">
          {/* Junior */}
          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-xs text-gray-500 mb-1">주니어</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange(
                    'junior',
                    Math.max(0, value.composition.junior - 1)
                  )
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                -
              </button>
              <span className="flex-1 text-center font-medium">
                {value.composition.junior}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange('junior', value.composition.junior + 1)
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                +
              </button>
            </div>
          </div>

          {/* Middle */}
          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-xs text-gray-500 mb-1">미들</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange(
                    'middle',
                    Math.max(0, value.composition.middle - 1)
                  )
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                -
              </button>
              <span className="flex-1 text-center font-medium">
                {value.composition.middle}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange('middle', value.composition.middle + 1)
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                +
              </button>
            </div>
          </div>

          {/* Senior */}
          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-xs text-gray-500 mb-1">시니어</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange(
                    'senior',
                    Math.max(0, value.composition.senior - 1)
                  )
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                -
              </button>
              <span className="flex-1 text-center font-medium">
                {value.composition.senior}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCompositionChange('senior', value.composition.senior + 1)
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Validation message */}
        <div
          className={`text-sm ${
            isCompositionValid ? 'text-green-600' : 'text-orange-500'
          }`}
        >
          {isCompositionValid ? (
            <span>✓ 구성원 합계가 팀 규모와 일치합니다</span>
          ) : (
            <span>
              구성원 합계 ({totalComposition}명)가 팀 규모 ({value.size}명)와
              일치하지 않습니다
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

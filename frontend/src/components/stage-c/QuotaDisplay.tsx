'use client';

interface QuotaDisplayProps {
  usedCount: number;
  maxCount: number;
  showAsCompact?: boolean;
}

export function QuotaDisplay({
  usedCount,
  maxCount,
  showAsCompact = false,
}: QuotaDisplayProps) {
  const remainingCount = maxCount - usedCount;
  const percentage = (usedCount / maxCount) * 100;

  if (showAsCompact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: maxCount }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < usedCount ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {remainingCount}회 남음
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">재생성 가능 횟수</span>
        <span className="text-sm text-gray-500">
          {usedCount} / {maxCount} 사용
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            remainingCount === 0
              ? 'bg-red-400'
              : remainingCount === 1
              ? 'bg-yellow-400'
              : 'bg-blue-500'
          }`}
          style={{ width: `${100 - percentage}%` }}
        />
      </div>

      {/* Status message */}
      <p className={`mt-2 text-xs ${
        remainingCount === 0
          ? 'text-red-600'
          : remainingCount === 1
          ? 'text-yellow-600'
          : 'text-gray-500'
      }`}>
        {remainingCount === 0 ? (
          '재생성 횟수를 모두 사용했습니다.'
        ) : remainingCount === 1 ? (
          '마지막 1회 재생성이 남았습니다.'
        ) : (
          `${remainingCount}회 재생성 가능합니다.`
        )}
      </p>
    </div>
  );
}

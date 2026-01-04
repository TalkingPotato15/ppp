'use client';

interface VersionBadgeProps {
  versionNumber: number;
  isLatest?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function VersionBadge({
  versionNumber,
  isLatest = false,
  size = 'md',
}: VersionBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`
          inline-flex items-center font-medium rounded-full
          bg-blue-100 text-blue-700
          ${sizeClasses[size]}
        `}
      >
        v{versionNumber}
      </span>
      {isLatest && (
        <span
          className={`
            inline-flex items-center font-medium rounded-full
            bg-green-100 text-green-700
            ${sizeClasses[size]}
          `}
        >
          최신
        </span>
      )}
    </span>
  );
}

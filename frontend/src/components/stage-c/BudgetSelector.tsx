'use client';

import { useState } from 'react';
import type { Budget, BudgetRange } from '@/types/stage-c';

interface BudgetSelectorProps {
  value: Budget;
  onChange: (budget: Budget) => void;
  error?: string;
}

const BUDGET_OPTIONS: Array<{ range: BudgetRange; label: string }> = [
  { range: 'UNDER_10M', label: 'Under ₩10M' },
  { range: '10M_TO_50M', label: '₩10M ~ ₩50M' },
  { range: '50M_TO_200M', label: '₩50M ~ ₩200M' },
  { range: 'OVER_200M', label: 'Over ₩200M' },
];

export function BudgetSelector({ value, onChange, error }: BudgetSelectorProps) {
  const [showSpecificAmount, setShowSpecificAmount] = useState(
    !!value.specificAmount
  );

  const handleRangeChange = (range: BudgetRange) => {
    const option = BUDGET_OPTIONS.find((o) => o.range === range);
    onChange({
      range,
      displayText: option?.label || '',
      specificAmount: value.specificAmount,
    });
  };

  const handleSpecificAmountChange = (amount: string) => {
    const numericAmount = parseInt(amount.replace(/,/g, ''), 10) || undefined;
    onChange({
      ...value,
      specificAmount: numericAmount,
    });
  };

  const formatAmount = (amount: number | undefined): string => {
    if (!amount) return '';
    return amount.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Budget Range <span className="text-red-500">*</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        {BUDGET_OPTIONS.map((option) => (
          <button
            key={option.range}
            type="button"
            onClick={() => handleRangeChange(option.range)}
            className={`p-3 text-sm border rounded-lg text-left transition-colors ${
              value.range === option.range
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showSpecificAmount"
          checked={showSpecificAmount}
          onChange={(e) => setShowSpecificAmount(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded border-gray-300"
        />
        <label htmlFor="showSpecificAmount" className="text-sm text-gray-600">
          Enter specific budget amount
        </label>
      </div>

      {showSpecificAmount && (
        <div className="relative">
          <input
            type="text"
            value={formatAmount(value.specificAmount)}
            onChange={(e) => handleSpecificAmountChange(e.target.value)}
            placeholder="e.g. 30,000,000"
            className="w-full p-3 border border-gray-200 rounded-lg pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            KRW
          </span>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ProblemFilters, Trend, Sentiment } from '@/types/problem';
import { discoveryApi } from '@/lib/api';

interface FilterBarProps {
  filters: ProblemFilters;
  onFiltersChange: (filters: ProblemFilters) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [domains, setDomains] = useState<string[]>([]);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await discoveryApi.getDomains();
        setDomains(response.data.domains);
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      }
    };
    fetchDomains();
  }, []);

  const handleChange = (key: keyof ProblemFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filters.domain || ''}
          onChange={(e) => handleChange('domain', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Domains</option>
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>

        <select
          value={filters.trend || ''}
          onChange={(e) => handleChange('trend', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Trends</option>
          <option value="RISING">Rising</option>
          <option value="STABLE">Stable</option>
          <option value="DECLINING">Declining</option>
        </select>

        <select
          value={filters.sentiment || ''}
          onChange={(e) => handleChange('sentiment', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="NEGATIVE">Negative</option>
        </select>

        <select
          value={filters.sort_by || 'recent'}
          onChange={(e) => handleChange('sort_by', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
        </select>

        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

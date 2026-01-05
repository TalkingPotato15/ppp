import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuotaDisplay } from '@/components/stage-c/QuotaDisplay';

describe('QuotaDisplay', () => {
  it('should display used and max count', () => {
    render(<QuotaDisplay usedCount={1} maxCount={3} />);

    expect(screen.getByText('1 / 3 Used')).toBeInTheDocument();
  });

  it('should display remaining count message when quota available', () => {
    render(<QuotaDisplay usedCount={1} maxCount={3} />);

    expect(screen.getByText('2 regenerations available.')).toBeInTheDocument();
  });

  it('should display warning when only 1 regeneration left', () => {
    render(<QuotaDisplay usedCount={2} maxCount={3} />);

    expect(screen.getByText('One regeneration remaining.')).toBeInTheDocument();
  });

  it('should display exhausted message when no regenerations left', () => {
    render(<QuotaDisplay usedCount={3} maxCount={3} />);

    expect(screen.getByText('You have used all regenerations.')).toBeInTheDocument();
  });

  it('should render compact view with dots', () => {
    render(<QuotaDisplay usedCount={1} maxCount={3} showAsCompact />);

    expect(screen.getByText('2 left')).toBeInTheDocument();
  });

  it('should apply different colors based on remaining count', () => {
    const { rerender } = render(<QuotaDisplay usedCount={0} maxCount={3} />);

    // Check progress bar color (blue for plenty of quota)
    let progressBar = document.querySelector('[class*="bg-blue-500"]');
    expect(progressBar).toBeInTheDocument();

    // Yellow when 1 left
    rerender(<QuotaDisplay usedCount={2} maxCount={3} />);
    progressBar = document.querySelector('[class*="bg-yellow-400"]');
    expect(progressBar).toBeInTheDocument();

    // Red when none left
    rerender(<QuotaDisplay usedCount={3} maxCount={3} />);
    progressBar = document.querySelector('[class*="bg-red-400"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should calculate progress bar width correctly', () => {
    render(<QuotaDisplay usedCount={1} maxCount={3} />);

    // 1/3 used = 66.67% remaining
    const progressBar = document.querySelector('[class*="bg-blue-500"]');
    expect(progressBar).not.toBeNull();
    // Width is set via inline style
    const style = progressBar?.getAttribute('style');
    expect(style).toContain('66');
  });
});

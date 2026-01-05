import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetSelector } from '@/components/stage-c/BudgetSelector';
import type { Budget } from '@/types/stage-c';

describe('BudgetSelector', () => {
  const defaultBudget: Budget = {
    range: '10M_TO_50M',
    displayText: '₩10M ~ ₩50M',
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render all budget options', () => {
    render(<BudgetSelector value={defaultBudget} onChange={mockOnChange} />);

    expect(screen.getByText('Under ₩10M')).toBeInTheDocument();
    expect(screen.getByText('₩10M ~ ₩50M')).toBeInTheDocument();
    expect(screen.getByText('₩50M ~ ₩200M')).toBeInTheDocument();
    expect(screen.getByText('Over ₩200M')).toBeInTheDocument();
  });

  it('should highlight the selected option', () => {
    render(<BudgetSelector value={defaultBudget} onChange={mockOnChange} />);

    const selectedButton = screen.getByText('₩10M ~ ₩50M').closest('button');
    expect(selectedButton).toHaveClass('border-blue-500');
  });

  it('should call onChange when a different option is selected', () => {
    render(<BudgetSelector value={defaultBudget} onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('Over ₩200M'));

    expect(mockOnChange).toHaveBeenCalledWith({
      range: 'OVER_200M',
      displayText: 'Over ₩200M',
      specificAmount: undefined,
    });
  });

  it('should show specific amount input when checkbox is checked', () => {
    render(<BudgetSelector value={defaultBudget} onChange={mockOnChange} />);

    expect(screen.queryByPlaceholderText(/30,000,000/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Enter specific budget amount'));

    expect(screen.getByPlaceholderText(/30,000,000/)).toBeInTheDocument();
  });

  it('should format specific amount with commas', () => {
    const budgetWithAmount: Budget = {
      ...defaultBudget,
      specificAmount: 50000000,
    };

    render(<BudgetSelector value={budgetWithAmount} onChange={mockOnChange} />);

    // The checkbox state is initialized from the value prop
    // When specificAmount exists, checkbox should be checked and input visible
    const input = screen.getByPlaceholderText(/30,000,000/) as HTMLInputElement;
    expect(input.value).toBe('50,000,000');
  });

  it('should display error message when provided', () => {
    render(
      <BudgetSelector
        value={defaultBudget}
        onChange={mockOnChange}
        error="Please select a budget range"
      />
    );

    expect(screen.getByText('Please select a budget range')).toBeInTheDocument();
    expect(screen.getByText('Please select a budget range')).toHaveClass('text-red-500');
  });

  it('should show required indicator', () => {
    render(<BudgetSelector value={defaultBudget} onChange={mockOnChange} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

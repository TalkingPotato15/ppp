import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamCompositionInput } from '@/components/stage-c/TeamCompositionInput';
import type { Team } from '@/types/stage-c';

describe('TeamCompositionInput', () => {
  const defaultTeam: Team = {
    size: 3,
    composition: { junior: 1, middle: 1, senior: 1 },
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render team size slider', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    expect(screen.getByRole('slider')).toBeInTheDocument();
    // Check for the team size display (may be formatted with 명 suffix)
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('should render composition counters', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    expect(screen.getByText('Junior')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('should call onChange when slider value changes', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '5' } });

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      size: 5,
    }));
  });

  it('should increment junior count when + is clicked', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    const addButtons = screen.getAllByText('+');
    fireEvent.click(addButtons[0]); // First + button is for junior

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      composition: expect.objectContaining({
        junior: 2,
      }),
    }));
  });

  it('should decrement middle count when - is clicked', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    const subtractButtons = screen.getAllByText('-');
    fireEvent.click(subtractButtons[1]); // Second - button is for middle

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      composition: expect.objectContaining({
        middle: 0,
      }),
    }));
  });

  it('should not decrement below 0 when - is clicked at 0', () => {
    const teamWithZeroJunior: Team = {
      size: 2,
      composition: { junior: 0, middle: 1, senior: 1 },
    };

    render(<TeamCompositionInput value={teamWithZeroJunior} onChange={mockOnChange} />);

    const subtractButtons = screen.getAllByText('-');
    fireEvent.click(subtractButtons[0]); // Click minus on junior which is already 0

    // Should call onChange with junior still at 0 (not negative)
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      composition: expect.objectContaining({
        junior: 0,
      }),
    }));
  });

  it('should display error when composition sum does not match size', () => {
    const mismatchedTeam: Team = {
      size: 5,
      composition: { junior: 1, middle: 1, senior: 1 }, // Sum = 3, not 5
    };

    render(
      <TeamCompositionInput
        value={mismatchedTeam}
        onChange={mockOnChange}
        error="Total team members do not match team size"
      />
    );

    // Multiple elements match - use getAllByText and check length
    const matchingElements = screen.getAllByText(/do not match/);
    expect(matchingElements.length).toBeGreaterThan(0);
  });

  it('should show composition summary', () => {
    render(<TeamCompositionInput value={defaultTeam} onChange={mockOnChange} />);

    // Check that each level shows the count
    const juniorCounter = screen.getByText('Junior').closest('div');
    expect(juniorCounter?.textContent).toContain('1');
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker, DateRange } from './DateRangePicker';

describe('DateRangePicker Component', () => {
  const initialValue: DateRange = {
    startDate: new Date(2026, 5, 24), // June 24, 2026
    endDate: new Date(2026, 5, 30),   // June 30, 2026
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the trigger button with formatted initial dates', () => {
    render(<DateRangePicker value={initialValue} onChange={mockOnChange} />);
    
    // Expect dates like "Jun 24, 2026 — Jun 30, 2026"
    expect(screen.getByText(/Jun 24, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 30, 2026/)).toBeInTheDocument();
  });

  it('opens the calendar dropdown list when trigger is clicked', () => {
    render(<DateRangePicker value={initialValue} onChange={mockOnChange} />);
    
    const trigger = screen.getByRole('button', { name: /Jun 24, 2026/i });
    fireEvent.click(trigger);

    // Dropdown list should be open
    expect(screen.getByText('Presized periods')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });

  it('triggers onChange with the expected range when a preset like "Today" is selected', () => {
    render(<DateRangePicker value={initialValue} onChange={mockOnChange} />);
    
    const trigger = screen.getByRole('button', { name: /Jun 24, 2026/i });
    fireEvent.click(trigger);

    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const lastCall = mockOnChange.mock.calls[0][0];
    expect(lastCall.startDate).toBeInstanceOf(Date);
    expect(lastCall.endDate).toBeInstanceOf(Date);
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch Component', () => {
  it('renders check switch in unchecked state correctly', () => {
    const handleChange = jest.fn();
    const { container } = render(<ToggleSwitch checked={false} onChange={handleChange} />);
    expect(container.firstChild).not.toHaveClass('on');
  });

  it('renders check switch in checked state correctly', () => {
    const handleChange = jest.fn();
    const { container } = render(<ToggleSwitch checked={true} onChange={handleChange} />);
    expect(container.firstChild).toHaveClass('on');
  });

  it('triggers change event when clicked', () => {
    const handleChange = jest.fn();
    const { container } = render(<ToggleSwitch checked={false} onChange={handleChange} />);
    const button = container.querySelector('button') || container.firstChild;
    if (button) {
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith(true);
    }
  });
});

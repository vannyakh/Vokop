import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders children content correctly', () => {
    render(<Badge>Test Alert</Badge>);
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
  });

  it('applies the appropriate primary classes by default', () => {
    const { container } = render(<Badge>KYC</Badge>);
    expect(container.firstChild).toHaveClass('bg-[var(--indigo)]');
  });

  it('applies danger classes when danger variant is requested', () => {
    const { container } = render(<Badge variant="danger">High</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-500');
  });
});

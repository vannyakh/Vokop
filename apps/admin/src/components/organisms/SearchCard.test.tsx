import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchCard } from './SearchCard';

describe('SearchCard Component', () => {
  it('allows user inputs on filter elements', () => {
    const handleSearch = jest.fn();
    const handleReset = jest.fn();
    render(<SearchCard onSearch={handleSearch} onReset={handleReset} />);

    const nameInput = screen.getByLabelText('Role name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Admin' } });
    expect(nameInput.value).toBe('Admin');
  });

  it('triggers search handler with input values on search button click', () => {
    const handleSearch = jest.fn();
    const handleReset = jest.fn();
    render(<SearchCard onSearch={handleSearch} onReset={handleReset} />);

    const nameInput = screen.getByLabelText('Role name');
    fireEvent.change(nameInput, { target: { value: 'Moderator' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Moderator',
      })
    );
  });
});

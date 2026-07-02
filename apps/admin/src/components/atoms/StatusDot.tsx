import React from 'react';

interface StatusDotProps {
  color?: 'green' | 'gray' | 'indigo' | 'red';
  glow?: boolean;
  id?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  color = 'green',
  glow = false,
  id,
}) => {
  const colors = {
    green: 'bg-green-500',
    gray: 'bg-[var(--text-dim)]',
    indigo: 'bg-[var(--indigo)]',
    red: 'bg-red-500',
  };

  const glows = {
    green: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
    gray: '',
    indigo: 'shadow-[0_0_6px_var(--indigo-glow)]',
    red: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
  };

  return (
    <span
      id={id}
      className={`w-1.5 h-1.5 rounded-full inline-block ${colors[color]} ${
        glow ? glows[color] : ''
      }`}
    />
  );
};

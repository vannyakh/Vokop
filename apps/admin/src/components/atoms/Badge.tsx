import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'danger' | 'secondary' | 'success';
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', id }) => {
  const baseStyle = 'text-[10.5px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0';
  const variants = {
    primary: 'bg-[var(--indigo)] text-white',
    danger: 'bg-red-500 text-white',
    secondary: 'bg-white/10 text-[var(--text-dim)]',
    success: 'bg-green-500/20 text-green-400',
  };

  return (
    <span id={id} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </span>
  );
};

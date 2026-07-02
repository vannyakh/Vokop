import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  id,
  className = '',
  ...props
}) => {
  const baseStyle =
    'font-semibold transition-all duration-150 ease-in-out cursor-pointer flex items-center justify-center border select-none';

  const sizes = {
    sm: 'h-9 px-4 text-xs rounded-lg gap-1.5',
    md: 'h-11 px-[22px] text-sm rounded-xl gap-2',
    lg: 'h-[52px] px-7 text-base rounded-2xl gap-2.5',
  };

  const variants = {
    primary:
      'bg-[var(--indigo)] hover:bg-[#5558e0] border-[var(--indigo)] hover:border-[#5558e0] text-white shadow-sm shadow-[var(--indigo-dim)]',
    secondary:
      'bg-transparent hover:bg-white/5 border-[var(--border)] hover:border-white/20 text-[var(--text-mid)] hover:text-[var(--text)]',
    danger:
      'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 text-red-400',
    ghost:
      'bg-transparent border-transparent hover:bg-white/5 text-[var(--text-mid)] hover:text-[var(--text)]',
  };

  return (
    <button
      id={id}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

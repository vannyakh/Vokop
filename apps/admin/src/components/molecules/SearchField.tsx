import React from 'react';

interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  label,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || `search-field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-xs text-[var(--text-mid)] font-medium select-none">
        {label}
      </label>
      <input
        id={inputId}
        className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-white/6 transition-all duration-150 shadow-inner"
        {...props}
      />
    </div>
  );
};

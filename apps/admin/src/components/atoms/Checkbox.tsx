import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, id }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      id={id}
      onClick={() => onChange(!checked)}
      className={`w-4.5 h-4.5 rounded-[6px] border cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-150 select-none ${
        checked
          ? 'bg-[var(--indigo)] border-[var(--indigo)] shadow-[0_2px_4px_rgba(99,102,241,0.25)]'
          : isLight
            ? 'bg-slate-100/70 border-slate-300 hover:border-indigo-500/50 hover:bg-white'
            : 'bg-white/5 border-white/15 hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <Check
        className={`w-3 h-3 text-white transition-all duration-150 ${
          checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
        strokeWidth={3}
      />
    </div>
  );
};

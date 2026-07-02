import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { Theme } from '../../types';

interface ThemeSwitcherProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  id?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  id,
}) => {
  const options: { val: Theme; label: string; icon: React.ReactNode; idx: number }[] = [
    { val: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" />, idx: 0 },
    { val: 'light', label: 'Light', icon: <Sun className="w-4 h-4" />, idx: 1 },
    { val: 'dim', label: 'Dim', icon: <Sparkles className="w-4 h-4" />, idx: 2 },
  ];

  const activeIdx = options.find((opt) => opt.val === currentTheme)?.idx ?? 0;

  return (
    <div
      id={id}
      className="relative flex items-center gap-0 p-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner overflow-hidden isolation-isolate select-none select-none"
      style={{
        // @ts-ignore
        '--active-idx': activeIdx,
        width: 'fit-content',
        backdropFilter: 'blur(18px) url(#ts-filter) saturate(160%)',
      }}
    >
      {/* Sliding Bubble Background */}
      <div
        className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(1,0,0.4,1)] z-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_2px_1.5px_0_-1px_rgba(255,255,255,0.9),inset_-1.5px_-1px_0_-1px_rgba(255,255,255,0.6),inset_-2px_-5px_1px_-4px_rgba(255,255,255,0.5),inset_-1px_2px_3px_-1px_rgba(0,0,0,0.18),0_3px_8px_rgba(0,0,0,0.1)]"
        style={{
          width: 'calc((100% - 12px) / 3)',
          transform: `translateX(calc(${activeIdx} * 100%))`,
          background: 'color-mix(in srgb, var(--c-glass) calc(var(--glass-pill-alpha) * 1.6), transparent)',
        }}
      />

      {options.map((opt) => (
        <button
          key={opt.val}
          onClick={() => onThemeChange(opt.val)}
          type="button"
          className={`relative z-10 flex items-center justify-center gap-1.5 h-9 min-width-[80px] px-4 rounded-full text-xs font-semibold cursor-pointer border-0 outline-none transition-colors duration-200 select-none ${
            currentTheme === opt.val
              ? 'text-[var(--text)]'
              : 'text-[var(--text-dim)] hover:text-[var(--text-mid)]'
          }`}
        >
          <span className="transition-transform duration-200 hover:scale-110">
            {opt.icon}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
};

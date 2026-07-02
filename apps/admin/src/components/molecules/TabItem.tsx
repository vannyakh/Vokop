import React from 'react';
import { X } from 'lucide-react';
import { Tab } from '../../types';
import { StatusDot } from '../atoms/StatusDot';

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  id?: string;
}

export const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  onActivate,
  onClose,
  id,
}) => {
  return (
    <div
      id={id}
      onClick={onActivate}
      data-active={isActive}
      className={`group relative flex items-center gap-1.5 h-[28px] min-w-[120px] max-w-[180px] px-3.5 rounded-md cursor-pointer text-xs font-semibold select-none transition-all duration-150 flex-shrink-0 border ${
        isActive
          ? 'bg-[var(--panel-solid-hover)] text-[var(--text)] border-white/12 shadow-sm'
          : 'bg-transparent text-[var(--text-dim)] border-transparent hover:border-white/5 hover:bg-white/4 hover:text-[var(--text-mid)]'
      }`}
    >
      {/* Tab dot indicator */}
      <StatusDot color={isActive ? 'indigo' : 'gray'} glow={isActive} />

      {/* Tab label */}
      <span className="truncate pr-3 select-none text-[11.5px] tracking-wide">{tab.label}</span>

      {/* Close button */}
      <button
        onClick={onClose}
        type="button"
        className={`absolute right-1.5 w-4 h-4 rounded-[4px] flex items-center justify-center text-[var(--text-dim)] hover:bg-white/8 hover:text-[var(--text)] transition-all duration-150 cursor-pointer ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <X className="w-[10px] h-[10px]" strokeWidth={2.5} />
      </button>
    </div>
  );
};

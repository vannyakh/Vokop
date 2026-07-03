import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Select } from 'antd';
import { Button } from '@/components/atoms/Button';

export interface AdminFilterField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
}

interface AdminFilterPanelProps {
  fields: AdminFilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

const inputClass =
  'w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold';

export function AdminFilterPanel({ fields, values, onChange, onReset }: AdminFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const primaryFields = fields.slice(0, 2);

  return (
    <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200">
      {!isCollapsed ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            {fields.map((field) => (
              <div
                key={field.key}
                className={`flex flex-col gap-1.5 ${field.colSpan === 2 ? 'md:col-span-2' : ''}`}
              >
                <label className="text-xs text-[var(--text-mid)] font-semibold select-none">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <Select
                    value={values[field.key] ?? ''}
                    onChange={(value) => onChange(field.key, value)}
                    size="large"
                    className="w-full font-semibold"
                    options={field.options ?? [{ value: '', label: 'All' }]}
                  />
                ) : (
                  <input
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ''}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer"
            >
              Collapse
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5">
              <Button type="button" onClick={onReset}>
                Reset
              </Button>
              <Button type="button" variant="primary">
                Search
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryFields.map((field) => (
              <div key={field.key} className="flex items-center gap-3 w-full">
                <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">
                  {field.label}
                </label>
                <input
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0 md:ml-auto">
            <Button type="button" onClick={onReset}>
              Reset
            </Button>
            <Button type="button" variant="primary">
              Search
            </Button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer ml-1.5"
            >
              Expand
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

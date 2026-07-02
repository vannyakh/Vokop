import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SearchField } from '../molecules/SearchField';
import { Button } from '../atoms/Button';
import { Select } from 'antd';
import dayjs from 'dayjs';
import { AntDateRangePicker, AntDateRangeValue } from '../molecules/AntDateRangePicker';

interface SearchFilters {
  name: string;
  id: string;
  status: string;
  remark: string;
  startDate: string;
  endDate: string;
}

interface SearchCardProps {
  onSearch: (filters: Partial<SearchFilters>) => void;
  onReset: () => void;
  id?: string;
}

const initialFilters: SearchFilters = {
  name: '',
  id: '',
  status: '',
  remark: '',
  startDate: '',
  endDate: '',
};

export const SearchCard: React.FC<SearchCardProps> = ({ onSearch, onReset, id }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    onReset();
  };

  const dateRangeValue: AntDateRangeValue = [
    filters.startDate ? dayjs(filters.startDate) : null,
    filters.endDate ? dayjs(filters.endDate) : null,
  ];

  const handleDateRangeChange = (value: AntDateRangeValue) => {
    setFilters((prev) => ({
      ...prev,
      startDate: value && value[0] ? value[0].format('YYYY-MM-DD') : '',
      endDate: value && value[1] ? value[1].format('YYYY-MM-DD') : '',
    }));
  };

  return (
    <div
      id={id}
      className="bg-[var(--panel)] rounded-2xl p-5 shadow-sm transition-all duration-200"
    >
      {/* ── EXPANDED GRID VIEW ── */}
      {!isCollapsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <SearchField
              label="Role name"
              placeholder="Enter role name"
              value={filters.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            <SearchField
              label="Role ID"
              placeholder="Enter role ID"
              value={filters.id}
              onChange={(e) => handleInputChange('id', e.target.value)}
            />
            
            {/* Styled Status Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-mid)] font-semibold select-none">
                Status
              </label>
              <Select
                value={filters.status}
                onChange={(value) => handleInputChange('status', value)}
                size="large"
                className="w-full font-semibold"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
              />
            </div>

            <SearchField
              label="Remark"
              placeholder="Enter remark"
              value={filters.remark}
              onChange={(e) => handleInputChange('remark', e.target.value)}
            />
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs text-[var(--text-mid)] font-semibold select-none">
                Created Date Range
              </label>
              <AntDateRangePicker
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                className="w-full"
                id="search-card-created-date"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-2">
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer"
            >
              Collapse
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5">
              <Button onClick={handleReset}>Reset</Button>
              <Button variant="primary" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLAPSED COMPACT ROW VIEW ── */}
      {isCollapsed && (
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 w-full">
              <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">
                Role name
              </label>
              <input
                placeholder="Enter role name"
                value={filters.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 shadow-inner font-semibold"
              />
            </div>
            <div className="flex items-center gap-3 w-full">
              <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">
                Role ID
              </label>
              <input
                placeholder="Enter role ID"
                value={filters.id}
                onChange={(e) => handleInputChange('id', e.target.value)}
                className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 shadow-inner font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0 md:ml-auto">
            <Button onClick={handleReset}>Reset</Button>
            <Button variant="primary" onClick={handleSearch}>
              Search
            </Button>
            <button
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
};

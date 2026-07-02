import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Extend dayjs with the isBetween plugin
dayjs.extend(isBetween);

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  id?: string;
}

const PRESETS = [
  { 
    label: 'Today', 
    getValue: () => ({
      startDate: dayjs().startOf('day').toDate(),
      endDate: dayjs().endOf('day').toDate()
    })
  },
  { 
    label: 'Yesterday', 
    getValue: () => ({
      startDate: dayjs().subtract(1, 'day').startOf('day').toDate(),
      endDate: dayjs().subtract(1, 'day').endOf('day').toDate()
    })
  },
  { 
    label: 'Last 7 Days', 
    getValue: () => ({
      startDate: dayjs().subtract(6, 'day').startOf('day').toDate(),
      endDate: dayjs().endOf('day').toDate()
    })
  },
  { 
    label: 'Last 30 Days', 
    getValue: () => ({
      startDate: dayjs().subtract(29, 'day').startOf('day').toDate(),
      endDate: dayjs().endOf('day').toDate()
    })
  },
  { 
    label: 'This Month', 
    getValue: () => ({
      startDate: dayjs().startOf('month').toDate(),
      endDate: dayjs().endOf('month').toDate()
    })
  },
  { label: 'Custom Range', getValue: null }
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = '',
  id = 'date-range-picker'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Last 7 Days');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(value.startDate));
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  
  // Selection flow: selectingStart is true if we are waiting to click the start date, or false if clicking the end date
  const [selectingStart, setSelectingStart] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => {
    return dayjs(date).format('MMM D, YYYY');
  };

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    if (preset.getValue) {
      const range = preset.getValue();
      onChange(range);
      setCurrentMonth(new Date(range.startDate));
      setIsOpen(false);
    } else {
      // Custom range: don't close, keep dropdown open and set selecting mode
      setSelectingStart(true);
    }
  };

  // Calendar math using Day.js
  const getDaysInMonth = (date: Date) => {
    const startOfMonth = dayjs(date).startOf('month');
    const startOfWeek = startOfMonth.startOf('week'); // defaults to Sunday (0)
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    let currentDay = startOfWeek;
    
    // Populate exactly 42 cells (6 rows of 7 columns) for a grid layout
    for (let i = 0; i < 42; i++) {
      days.push({
        date: currentDay.toDate(),
        isCurrentMonth: currentDay.month() === startOfMonth.month()
      });
      currentDay = currentDay.add(1, 'day');
    }
    
    return days;
  };

  const changeMonth = (offset: number) => {
    const newMonth = dayjs(currentMonth).add(offset, 'month').toDate();
    setCurrentMonth(newMonth);
  };

  const isSelected = (date: Date) => {
    const d = dayjs(date).startOf('day');
    const start = dayjs(value.startDate).startOf('day');
    const end = dayjs(value.endDate).startOf('day');
    return d.isSame(start) || d.isSame(end);
  };

  const isInRange = (date: Date) => {
    const d = dayjs(date).startOf('day');
    const start = dayjs(value.startDate).startOf('day');
    const end = dayjs(value.endDate).startOf('day');
    
    if (selectingStart) {
      return d.isBetween(start, end, 'day', '[]');
    } else if (hoveredDate) {
      const hover = dayjs(hoveredDate).startOf('day');
      if (hover.isAfter(start)) {
        return d.isBetween(start, hover, 'day', '[]');
      } else {
        return d.isBetween(hover, start, 'day', '[]');
      }
    }
    return d.isBetween(start, end, 'day', '[]');
  };

  const handleDateClick = (date: Date) => {
    setActivePreset('Custom Range');
    const clicked = dayjs(date).startOf('day');
    const start = dayjs(value.startDate).startOf('day');

    if (selectingStart) {
      // First click: sets start date, clears end date (or sets end date same as start)
      onChange({ 
        startDate: clicked.toDate(), 
        endDate: clicked.endOf('day').toDate() 
      });
      setSelectingStart(false);
    } else {
      // Second click: sets end date
      if (clicked.isBefore(start)) {
        // If clicked date is before start date, set it as start date and wait for end date
        onChange({ 
          startDate: clicked.toDate(), 
          endDate: clicked.endOf('day').toDate() 
        });
        setSelectingStart(false);
      } else {
        onChange({ 
          startDate: value.startDate, 
          endDate: clicked.endOf('day').toDate() 
        });
        setSelectingStart(true);
        setIsOpen(false); // Finished picking custom range!
      }
    }
  };

  const days = getDaysInMonth(currentMonth);
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        id={`${id}-trigger`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:bg-white/4 transition-all duration-150 text-xs font-semibold text-[var(--text)] select-none shadow-sm cursor-pointer"
      >
        <CalendarIcon className="w-4 h-4 text-[var(--indigo)]" />
        <span className="font-mono">
          {formatDate(value.startDate)} — {formatDate(value.endDate)}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-dim)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="absolute right-0 mt-2 z-50 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row gap-5 backdrop-blur-[var(--glass-blur)] bg-opacity-95"
          style={{ minWidth: '460px' }}
        >
          {/* Preset Sidebar */}
          <div className="flex flex-col gap-1 w-full md:w-36 flex-shrink-0 border-r border-[var(--border)] pr-4 md:pr-5 select-none">
            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2">Presized periods</span>
            {PRESETS.map((p) => {
              const isActive = activePreset === p.label;
              return (
                <button
                  key={p.label}
                  id={`${id}-preset-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`flex items-center justify-between text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--indigo)] text-white'
                      : 'text-[var(--text-mid)] hover:text-white hover:bg-white/3'
                  }`}
                >
                  {p.label}
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Calendar Selector Container */}
          <div className="flex-1 flex flex-col min-w-[240px]">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-white select-none">
                {dayjs(currentMonth).format('MMMM YYYY')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id={`${id}-prev-month`}
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 border border-white/4 text-[var(--text)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  id={`${id}-next-month`}
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 border border-white/4 text-[var(--text)] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays row */}
            <div className="grid grid-cols-7 text-center gap-y-1 mb-2 select-none">
              {weekdays.map((w) => (
                <span key={w} className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                  {w}
                </span>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-1">
              {days.map((dayObj, index) => {
                const isSel = isSelected(dayObj.date);
                const isRange = isInRange(dayObj.date);
                const isCurrentM = dayObj.isCurrentMonth;
                const dateKey = dayjs(dayObj.date).format('YYYY-MM-DD');

                let cellBg = 'bg-transparent text-[var(--text-mid)]';
                if (!isCurrentM) {
                  cellBg = 'bg-transparent text-white/10';
                }
                if (isRange && isCurrentM) {
                  cellBg = 'bg-[var(--indigo-dim)] text-[var(--indigo)]';
                }
                if (isSel) {
                  cellBg = 'bg-[var(--indigo)] text-white font-bold';
                }

                return (
                  <button
                    key={`${dateKey}-${index}`}
                    id={`${id}-day-${dateKey}`}
                    type="button"
                    onClick={() => handleDateClick(dayObj.date)}
                    onMouseEnter={() => !selectingStart && setHoveredDate(dayObj.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`h-7.5 w-7.5 rounded-lg flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-white/5 ${cellBg}`}
                  >
                    {dayObj.date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Active flow helper text */}
            <div className="mt-4 border-t border-[var(--border)] pt-3 flex items-center justify-between text-[11px] text-[var(--text-dim)] select-none">
              <span>
                {selectingStart ? 'Select start date' : 'Select end date'}
              </span>
              <button
                type="button"
                id={`${id}-clear`}
                onClick={() => {
                  const today = dayjs().endOf('day').toDate();
                  const start = dayjs().subtract(6, 'day').startOf('day').toDate();
                  onChange({ startDate: start, endDate: today });
                  setActivePreset('Last 7 Days');
                  setSelectingStart(true);
                }}
                className="text-[var(--indigo)] hover:underline cursor-pointer"
              >
                Reset range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';

const { RangePicker } = DatePicker;

export type AntDateRangeValue = [Dayjs | null, Dayjs | null] | null;

interface AntDateRangePickerProps {
  value: AntDateRangeValue;
  onChange: (values: AntDateRangeValue, formatString: [string, string]) => void;
  className?: string;
  id?: string;
}

export const AntDateRangePicker: React.FC<AntDateRangePickerProps> = ({
  value,
  onChange,
  className = '',
  id = 'ant-date-range-picker',
}) => {
  // Preset ranges to display
  const presets = [
    {
      label: 'Last 7 Days',
      value: [dayjs().subtract(6, 'day'), dayjs()] as const,
    },
    {
      label: 'Last 14 Days',
      value: [dayjs().subtract(13, 'day'), dayjs()] as const,
    },
    {
      label: 'Last 30 Days',
      value: [dayjs().subtract(29, 'day'), dayjs()] as const,
    },
    {
      label: 'Last 90 Days',
      value: [dayjs().subtract(89, 'day'), dayjs()] as const,
    },
    {
      label: 'This Month',
      value: [dayjs().startOf('month'), dayjs().endOf('month')] as const,
    },
  ];

  return (
    <div className={`relative flex items-center ${className}`} id={id}>
      <RangePicker
        id={`${id}-picker`}
        value={value}
        onChange={onChange}
        presets={presets}
        format="MMM D, YYYY"
        allowClear={true}
        suffixIcon={<Calendar className="w-4 h-4 text-[var(--text-dim)]" />}
        placeholder={['Start Date', 'End Date']}
        className="w-full"
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { DollarSign, MessageSquare, AlertTriangle, TrendingUp, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { StatusDot } from '../atoms/StatusDot';
import { DateRangePicker, DateRange } from '../molecules/DateRangePicker';
import { ALL_SALES, ALL_MESSAGES, ALL_DISPUTES, SaleActivity, MessageEvent, DisputeEvent } from '../../constants/mockData';
import { DashboardSummary } from '../organisms/DashboardSummary';

const formatFriendlyTime = (date: Date) => {
  const d = dayjs(date);
  const now = dayjs();
  const diffMins = now.diff(d, 'minute');
  const diffHours = now.diff(d, 'hour');
  const diffDays = now.diff(d, 'day');

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.format('MMM D');
};

export const DashboardPage: React.FC = () => {
  // Initial date range: Last 7 Days
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    startDate: dayjs().subtract(6, 'day').startOf('day').toDate(),
    endDate: dayjs().endOf('day').toDate()
  }));

  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Filter sales, messages, and disputes within current timeframe
  const filteredSales = useMemo(() => {
    return ALL_SALES.filter((s) => {
      const time = s.timestamp.getTime();
      return time >= dateRange.startDate.getTime() && time <= dateRange.endDate.getTime();
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [dateRange]);

  const filteredMessagesCount = useMemo(() => {
    return ALL_MESSAGES.filter((m) => {
      const time = m.timestamp.getTime();
      return time >= dateRange.startDate.getTime() && time <= dateRange.endDate.getTime();
    }).length;
  }, [dateRange]);

  const filteredDisputesCount = useMemo(() => {
    return ALL_DISPUTES.filter((d) => {
      const time = d.timestamp.getTime();
      return time >= dateRange.startDate.getTime() && time <= dateRange.endDate.getTime();
    }).length;
  }, [dateRange]);

  // Compute metrics
  const metrics = useMemo(() => {
    const completedSales = filteredSales.filter((s) => s.status === 'Completed');
    const grossSalesSum = completedSales.reduce((sum, s) => sum + s.amount, 0);

    const pendingSales = filteredSales.filter((s) => s.status === 'Awaiting delivery');
    const pendingBalanceSum = pendingSales.reduce((sum, s) => sum + s.amount, 0);

    return [
      {
        title: "Gross Sales",
        value: `$${grossSalesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: `${completedSales.length} settled payments`,
        color: 'green',
        icon: <DollarSign className="w-5 h-5 text-green-400" />,
      },
      {
        title: 'Pending Balance',
        value: `$${pendingBalanceSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: 'Settles in 1 business day',
        color: 'indigo',
        icon: <TrendingUp className="w-5 h-5 text-[var(--indigo)]" />,
      },
      {
        title: 'Unread Messages',
        value: `${filteredMessagesCount}`,
        change: 'Average response: 6m',
        color: 'indigo',
        icon: <MessageSquare className="w-5 h-5 text-indigo-400" />,
      },
      {
        title: 'Open Disputes',
        value: `${filteredDisputesCount}`,
        change: 'SLA: Response due in 24h',
        color: 'red',
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      },
    ];
  }, [filteredSales, filteredMessagesCount, filteredDisputesCount]);

  // Generate trend points by dividing the dateRange into 7 uniform steps
  const trendPoints = useMemo(() => {
    const points = [];
    const startTime = dateRange.startDate.getTime();
    const endTime = dateRange.endDate.getTime();
    const step = startTime === endTime ? 0 : (endTime - startTime) / 6;

    for (let i = 0; i < 7; i++) {
      const timeAtStep = startTime + step * i;
      const dateAtStep = new Date(timeAtStep);

      // We associate transactions with the closest step
      const subStart = new Date(timeAtStep - (i === 0 ? 0 : step / 2));
      const subEnd = new Date(timeAtStep + (i === 6 ? 0 : step / 2));

      const salesInStep = ALL_SALES.filter((s) => {
        const t = s.timestamp.getTime();
        return t >= subStart.getTime() && t <= subEnd.getTime() && s.status === 'Completed';
      });

      const totalAmount = salesInStep.reduce((sum, s) => sum + s.amount, 0);

      // Dynamic label formatting based on duration
      const numDays = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
      let label = '';
      if (numDays <= 1) {
        label = dayjs(dateAtStep).format('h A');
      } else if (numDays <= 7) {
        label = dayjs(dateAtStep).format('ddd');
      } else {
        label = dayjs(dateAtStep).format('MMM D');
      }

      points.push({
        label,
        value: totalAmount,
        date: dateAtStep,
      });
    }
    return points;
  }, [dateRange]);

  const maxValue = useMemo(() => {
    const max = Math.max(...trendPoints.map((p) => p.value));
    return max === 0 ? 10 : max;
  }, [trendPoints]);

  // Construct dynamic SVG paths
  const svgPaths = useMemo(() => {
    const coords = trendPoints.map((p, idx) => {
      const x = idx * 100;
      const y = 130 - (p.value / maxValue) * 110;
      return { x, y };
    });

    if (coords.length === 0) return { linePath: '', fillPath: '' };

    const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const fillPath = `${linePath} L 600 150 L 0 150 Z`;

    return { linePath, fillPath };
  }, [trendPoints, maxValue]);

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Header with DateRangePicker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4.5 shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-white select-none">Dashboard</h2>
          <p className="text-xs text-[var(--text-dim)] select-none">Monitor your store activity, sales trends, and payout balances</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} id="dashboard-date-range" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4.5 flex items-start justify-between shadow-sm"
          >
            <div className="space-y-1.5">
              <div className="text-[11.5px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                {m.title}
              </div>
              <div className="text-2xl font-bold text-[var(--text)]">{m.value}</div>
              <div className="text-xs text-[var(--text-dim)]">{m.change}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/5 flex items-center justify-center flex-shrink-0">
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Recharts Chart in Liquid Layout */}
        <div className="lg:col-span-2">
          <DashboardSummary />
        </div>

        {/* Recent sales */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0 select-none">
            <h3 className="text-sm font-bold text-[var(--text)]">Recent activity</h3>
            <span className="text-[11px] text-[var(--text-dim)] font-semibold">
              {filteredSales.length} orders
            </span>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 scrollbar-thin">
            {filteredSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-dim)] text-xs select-none space-y-2">
                <CalendarIcon className="w-8 h-8 text-white/5" />
                <p>No activity found in this period.</p>
              </div>
            ) : (
              filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-start justify-between p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-colors duration-150"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-[var(--text)] truncate">{sale.item}</div>
                    <div className="text-[11px] text-[var(--text-dim)] flex items-center gap-1.5 select-none truncate">
                      <span className="font-mono">{sale.id}</span>
                      <span>•</span>
                      <span>{formatFriendlyTime(sale.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5 flex-shrink-0 pl-2">
                    <div className="text-xs font-bold text-white">${sale.amount.toFixed(2)}</div>
                    <div className="inline-flex items-center gap-1 text-[10px] text-[var(--text-dim)] font-semibold select-none">
                      <StatusDot color={sale.status === 'Completed' ? 'green' : sale.status === 'Refunded' ? 'red' : 'indigo'} />
                      {sale.status === 'Completed' ? 'Completed' : sale.status === 'Refunded' ? 'Refunded' : 'Awaiting'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


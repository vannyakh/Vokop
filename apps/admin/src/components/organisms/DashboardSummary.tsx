import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ComposedChart,
  Line
} from 'recharts';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Sparkles, 
  Activity, 
  ArrowUpRight, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { AntDateRangePicker, AntDateRangeValue } from '../molecules/AntDateRangePicker';

// Define Interface for Day Data
interface DailyTrend {
  date: string;
  fullDate: string;
  sales: number;
  customers: number;
}

export const DashboardSummary: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isDim = theme === 'dim';

  // State to hold the selected range of the Ant DateRangePicker
  const [dateRange, setDateRange] = useState<AntDateRangeValue>(() => [
    dayjs().subtract(29, 'day').startOf('day'),
    dayjs().endOf('day')
  ]);

  // Toggle state to switch chart view types or highlight specific metrics
  const [activeMetric, setActiveMetric] = useState<'both' | 'sales' | 'customers'>('both');
  const [hoveredData, setHoveredData] = useState<DailyTrend | null>(null);

  // Generate continuous, realistic, organic trend data dynamically based on the selected dateRange
  const trendData = useMemo<DailyTrend[]>(() => {
    const data: DailyTrend[] = [];
    
    // Fallback if no date range is selected
    const start = dateRange && dateRange[0] ? dateRange[0] : dayjs().subtract(29, 'day');
    const end = dateRange && dateRange[1] ? dateRange[1] : dayjs();

    // Calculate number of days in the range
    const totalDays = end.diff(start, 'day') + 1;
    const safetyDays = Math.max(1, Math.min(365, totalDays)); // Limit from 1 to 365 days for performance safety

    // Organic wave generators to simulate real sales cycles
    for (let i = 0; i < safetyDays; i++) {
      const currentDate = start.add(i, 'day').toDate();

      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Base trend with weekend dips and mid-month paycheck spikes
      const timeFactor = Math.sin((i / Math.max(1, safetyDays - 1)) * Math.PI * 2.5); // Multi-wave trend
      const paycheckFactor = (currentDate.getDate() >= 13 && currentDate.getDate() <= 17) ? 1.4 : (currentDate.getDate() >= 27) ? 1.3 : 1.0;
      const weekendDip = isWeekend ? 0.75 : 1.1;
      
      // Random organic fluctuation
      const noiseSales = Math.sin(i * 1.7) * 45 + Math.cos(i * 3.1) * 20;
      const noiseCustomers = Math.sin(i * 2.1) * 6 + Math.cos(i * 1.4) * 3;

      // Calculate organic sales volume and active customers
      const baseSales = 380 + (timeFactor * 120);
      const sales = Math.round((baseSales * paycheckFactor * weekendDip + noiseSales) * 100) / 100;

      const baseCustomers = 45 + (timeFactor * 15);
      const customers = Math.round(baseCustomers * (paycheckFactor * 0.9) * (isWeekend ? 0.85 : 1.05) + noiseCustomers);

      data.push({
        date: dayjs(currentDate).format('MMM D'),
        fullDate: dayjs(currentDate).format('dddd, MMMM D, YYYY'),
        sales: Math.max(120, sales),
        customers: Math.max(12, customers),
      });
    }
    return data;
  }, [dateRange]);

  // Compute stats summary
  const stats = useMemo(() => {
    if (trendData.length === 0) {
      return {
        totalSales: '$0.00',
        avgSales: '$0.00',
        avgCustomers: 0,
        peakSales: '$0.00',
        peakSalesDate: 'N/A',
        salesGrowth: '0.0%',
        customersGrowth: '0.0%',
      };
    }
    const totalSales = trendData.reduce((sum, d) => sum + d.sales, 0);
    const avgSales = totalSales / trendData.length;
    const totalCustomers = trendData.reduce((sum, d) => sum + d.customers, 0);
    const avgCustomers = Math.round(trendData.reduce((sum, d) => sum + d.customers, 0) / trendData.length);
    
    // Find peak sales day
    const peakSalesDay = [...trendData].sort((a, b) => b.sales - a.sales)[0];

    return {
      totalSales: `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      avgSales: `$${avgSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      avgCustomers,
      peakSales: `$${peakSalesDay.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      peakSalesDate: peakSalesDay.date,
      salesGrowth: '+18.4%',
      customersGrowth: '+12.1%',
    };
  }, [trendData]);

  // Liquid gradients, active highlights, and custom theme tokens
  const colors = useMemo(() => {
    if (isLight) {
      return {
        salesLine: '#4f46e5', // indigo-600
        salesFill: 'url(#lightSalesGrad)',
        custLine: '#10b981', // emerald-500
        custFill: 'url(#lightCustGrad)',
        gridColor: 'rgba(99, 102, 241, 0.05)',
        tooltipBg: '#ffffff',
        tooltipBorder: 'rgba(99, 102, 241, 0.15)',
        text: '#1e293b', // slate-800
        textDim: '#64748b', // slate-500
      };
    } else if (isDim) {
      return {
        salesLine: '#818cf8', // indigo-400
        salesFill: 'url(#dimSalesGrad)',
        custLine: '#34d399', // emerald-400
        custFill: 'url(#dimCustGrad)',
        gridColor: 'rgba(255, 255, 255, 0.04)',
        tooltipBg: '#12202e',
        tooltipBorder: 'rgba(100, 140, 180, 0.2)',
        text: '#f1f5f9', // slate-100
        textDim: '#8a9dc0', // blue-slate-400
      };
    } else {
      // Dark Theme
      return {
        salesLine: '#6366f1', // indigo-500
        salesFill: 'url(#darkSalesGrad)',
        custLine: '#10b981', // emerald-500
        custFill: 'url(#darkCustGrad)',
        gridColor: 'rgba(255, 255, 255, 0.04)',
        tooltipBg: '#0f0f17',
        tooltipBorder: 'rgba(255, 255, 255, 0.08)',
        text: '#f8fafc',
        textDim: '#94a3b8',
      };
    }
  }, [isLight, isDim]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl transition-all duration-300">
      
      {/* 1. Liquid background accents / Floating slow-moving fluid meshes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft floating indigo-purple fluid orb */}
        <div className={`absolute -top-24 -left-20 w-80 h-80 rounded-full mix-blend-screen filter blur-[70px] opacity-[0.14] animate-pulse duration-[12s] ${
          isLight ? 'bg-indigo-300' : 'bg-indigo-600'
        }`} />
        
        {/* Soft floating emerald fluid orb */}
        <div className={`absolute -bottom-24 -right-16 w-80 h-80 rounded-full mix-blend-screen filter blur-[70px] opacity-[0.12] animate-pulse duration-[15s] ${
          isLight ? 'bg-emerald-200' : 'bg-emerald-600'
        }`} />
        
        {/* Center organic soft highlight */}
        <div className={`absolute top-1/2 left-1/3 w-96 h-96 rounded-full mix-blend-screen filter blur-[90px] opacity-[0.06] ${
          isLight ? 'bg-violet-200' : 'bg-purple-900/40'
        }`} />
      </div>

      {/* 2. Main Content Frame (above glass background) */}
      <div className="relative z-10 space-y-6">
        
        {/* Header & Meta */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${
                isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
              }`}>
                <Activity className="w-4 h-4 animate-pulse" />
              </span>
              <h3 className="text-base font-bold text-[var(--text)] tracking-tight flex items-center gap-1.5">
                {trendData.length}-Day Liquid Performance Summary
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              </h3>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              An interactive, liquid-styled analytics visualization tracking core growth vectors
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Customized Ant Design DateRangePicker */}
            <AntDateRangePicker 
              value={dateRange} 
              onChange={setDateRange} 
              id="summary-ant-picker" 
              className="w-full sm:w-[300px] z-20"
            />

            {/* Interactive Metric Filter Toggle - Pill design */}
            <div className={`inline-flex p-1 rounded-xl border self-start sm:self-auto ${
              isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-white/4 border-white/5'
            }`}>
              <button
                onClick={() => setActiveMetric('both')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeMetric === 'both'
                    ? isLight
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/10'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveMetric('sales')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeMetric === 'sales'
                    ? isLight
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/10'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Sales
              </button>
              <button
                onClick={() => setActiveMetric('customers')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeMetric === 'customers'
                    ? isLight
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/10'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Customers
              </button>
            </div>
          </div>
        </div>

        {/* 3. Liquid-style Fluid Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Sales Volume */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`relative p-4 rounded-xl border transition-all duration-200 ${
              isLight 
                ? 'bg-gradient-to-br from-indigo-50/50 via-white to-white border-indigo-100/50 shadow-sm' 
                : 'bg-gradient-to-br from-[var(--indigo-dim)]/20 via-white/1 to-white/2 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[var(--text-dim)] uppercase tracking-wider">{trendData.length}D Sales Volume</span>
              <div className={`p-1.5 rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-lg font-black text-[var(--text)]">{stats.totalSales}</span>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> {stats.salesGrowth}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-1 font-medium">Accumulated gross payment capture</p>
          </motion.div>

          {/* Card 2: Average Daily Sales */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`relative p-4 rounded-xl border transition-all duration-200 ${
              isLight 
                ? 'bg-gradient-to-br from-indigo-50/50 via-white to-white border-indigo-100/50 shadow-sm' 
                : 'bg-gradient-to-br from-[var(--indigo-dim)]/20 via-white/1 to-white/2 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Daily Average</span>
              <div className={`p-1.5 rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-lg font-black text-[var(--text)]">{stats.avgSales}</span>
              <span className="text-[10px] text-[var(--text-dim)]">per day</span>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-1 font-medium">Smoothed {trendData.length}-day processing rate</p>
          </motion.div>

          {/* Card 3: Active Customers Avg */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`relative p-4 rounded-xl border transition-all duration-200 ${
              isLight 
                ? 'bg-gradient-to-br from-emerald-50/30 via-white to-white border-emerald-100/40 shadow-sm' 
                : 'bg-gradient-to-br from-emerald-500/5 via-white/1 to-white/2 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Avg Daily Customers</span>
              <div className={`p-1.5 rounded-lg ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-lg font-black text-[var(--text)]">{stats.avgCustomers}</span>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> {stats.customersGrowth}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-1 font-medium">Unique active account footprints</p>
          </motion.div>

          {/* Card 4: Peak Sales Record */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`relative p-4 rounded-xl border transition-all duration-200 ${
              isLight 
                ? 'bg-gradient-to-br from-amber-50/30 via-white to-white border-amber-100/40 shadow-sm' 
                : 'bg-gradient-to-br from-amber-500/5 via-white/1 to-white/2 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[var(--text-dim)] uppercase tracking-wider">{trendData.length}D Peak Volume</span>
              <div className={`p-1.5 rounded-lg ${isLight ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-lg font-black text-[var(--text)]">{stats.peakSales}</span>
              <span className="text-[10.5px] font-semibold text-amber-500">
                on {stats.peakSalesDate}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-1 font-medium">Highest single-day capture event</p>
          </motion.div>

        </div>

        {/* 4. Chart Stage Frame */}
        <div className={`relative rounded-xl border p-4 ${
          isLight ? 'bg-white/80 border-slate-200/60 shadow-inner' : 'bg-black/15 border-white/5'
        }`}>
          
          {/* Interactive Floating Hover Status Label */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-4 text-[10.5px] select-none font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[var(--text)]">Sales Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[var(--text)]">Active Customers</span>
            </div>
          </div>

          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                onMouseMove={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    setHoveredData(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredData(null)}
              >
                <defs>
                  {/* Liquid Gradients - Light Mode */}
                  <linearGradient id="lightSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lightCustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Liquid Gradients - Dark Mode */}
                  <linearGradient id="darkSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="darkCustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Liquid Gradients - Dim Mode */}
                  <linearGradient id="dimSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dimCustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={colors.gridColor} 
                  vertical={false} 
                />

                <XAxis 
                  dataKey="date" 
                  stroke={colors.textDim}
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />

                {/* Left Y Axis for Sales */}
                {(activeMetric === 'both' || activeMetric === 'sales') && (
                  <YAxis 
                    yAxisId="left"
                    stroke={colors.textDim}
                    fontSize={10}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                    dx={-5}
                  />
                )}

                {/* Right Y Axis for Active Customers */}
                {(activeMetric === 'both' || activeMetric === 'customers') && (
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke={colors.textDim}
                    fontSize={10}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dx={5}
                  />
                )}

                {/* Custom Interactive Tooltip */}
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DailyTrend;
                      return (
                        <div 
                          className="rounded-xl border p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                          style={{ 
                            backgroundColor: colors.tooltipBg, 
                            borderColor: colors.tooltipBorder,
                            color: colors.text
                          }}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-60">
                            {data.fullDate}
                          </div>
                          <div className="space-y-1.5">
                            {(activeMetric === 'both' || activeMetric === 'sales') && (
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-[11px] font-semibold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  Sales Volume
                                </span>
                                <span className="text-xs font-extrabold font-mono">
                                  ${data.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            {(activeMetric === 'both' || activeMetric === 'customers') && (
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-[11px] font-semibold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active Customers
                                </span>
                                <span className="text-xs font-extrabold font-mono">
                                  {data.customers}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ 
                    stroke: isLight ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    strokeWidth: 1.5,
                    strokeDasharray: '4 4'
                  }}
                />

                {/* Sales Volume Area Stream */}
                {(activeMetric === 'both' || activeMetric === 'sales') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sales"
                    stroke={colors.salesLine}
                    strokeWidth={2.5}
                    fill={colors.salesFill}
                    dot={false}
                    activeDot={{ 
                      r: 5, 
                      strokeWidth: 2, 
                      stroke: colors.tooltipBg,
                      fill: colors.salesLine,
                      className: "shadow-lg"
                    }}
                    name="Sales Volume"
                    animationDuration={1500}
                  />
                )}

                {/* Active Customers Area / Line Stream */}
                {(activeMetric === 'both' || activeMetric === 'customers') && (
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="customers"
                    stroke={colors.custLine}
                    strokeWidth={2}
                    fill={colors.custFill}
                    dot={false}
                    activeDot={{ 
                      r: 5, 
                      strokeWidth: 2, 
                      stroke: colors.tooltipBg,
                      fill: colors.custLine,
                      className: "shadow-lg"
                    }}
                    name="Active Customers"
                    animationDuration={1500}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Fluid Live Hover Insights Indicator */}
        <div className={`flex items-center justify-between text-xs px-4 py-3 rounded-xl border transition-all duration-300 ${
          isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-white/2 border-white/5'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-ping ${
              hoveredData ? 'bg-indigo-500' : 'bg-emerald-500'
            }`} />
            <span className="text-[11px] text-[var(--text-dim)] font-medium">
              {hoveredData ? (
                <>
                  Hovering <span className="font-bold text-[var(--text)]">{hoveredData.date}</span>: Sales of <span className="font-bold text-indigo-500">${hoveredData.sales.toFixed(2)}</span> and <span className="font-bold text-emerald-500">{hoveredData.customers}</span> active accounts.
                </>
              ) : (
                'Hover over the liquid chart stream to track daily performance vectors.'
              )}
            </span>
          </div>
          <span className={`text-[10px] font-bold flex items-center gap-1 cursor-default ${
            isLight ? 'text-indigo-600' : 'text-indigo-400'
          }`}>
            Live Insights <ChevronRight className="w-3 h-3" />
          </span>
        </div>

      </div>
    </div>
  );
};

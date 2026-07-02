import React, { useState } from 'react';
import {
  Package,
  Plus,
  AlertCircle,
  RefreshCw,
  Layers,
  Gamepad2,
  FileText,
  CheckCircle2,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

interface StockItem {
  id: string;
  gameTitle: string;
  category: string;
  stockCount: number;
  lowStockThreshold: number;
  lastReplenished: string;
  status: 'healthy' | 'critical' | 'empty';
}

const initialStocks: StockItem[] = [
  { id: '1', gameTitle: 'Cyberpunk 2077: Phantom Liberty', category: 'RPG', stockCount: 140, lowStockThreshold: 20, lastReplenished: '2026-06-28', status: 'healthy' },
  { id: '2', gameTitle: 'Grand Theft Auto V: Premium Edition', category: 'Action', stockCount: 12, lowStockThreshold: 15, lastReplenished: '2026-06-15', status: 'critical' },
  { id: '3', gameTitle: 'Elden Ring - Shadow of the Erdtree', category: 'RPG', stockCount: 85, lowStockThreshold: 20, lastReplenished: '2026-06-30', status: 'healthy' },
  { id: '4', gameTitle: 'Minecraft Java & Bedrock Edition', category: 'Sandbox', stockCount: 0, lowStockThreshold: 10, lastReplenished: '2026-05-10', status: 'empty' },
  { id: '5', gameTitle: 'Hades II (Steam Early Access)', category: 'Rogue-like', stockCount: 64, lowStockThreshold: 15, lastReplenished: '2026-06-29', status: 'healthy' },
];

export const StockPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [stocks, setStocks] = useState<StockItem[]>(initialStocks);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [batchKeysInput, setBatchKeysInput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Filter & Pagination States
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [filters, setFilters] = useState({
    gameTitle: '',
    category: '',
    status: '',
  });

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({
      gameTitle: '',
      category: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const handleAddKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !batchKeysInput.trim()) return;

    const addedKeys = batchKeysInput.split('\n').filter((k) => k.trim().length > 0);
    if (addedKeys.length === 0) return;

    setStocks((prev) =>
      prev.map((item) => {
        if (item.id === selectedStock.id) {
          const newCount = item.stockCount + addedKeys.length;
          return {
            ...item,
            stockCount: newCount,
            status: newCount > item.lowStockThreshold ? 'healthy' : newCount > 0 ? 'critical' : 'empty',
            lastReplenished: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      })
    );

    setNotification(`Successfully added ${addedKeys.length} license keys to "${selectedStock.gameTitle}"!`);
    setBatchKeysInput('');
    setSelectedStock(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRowCheck = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, itemId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleAllCheck = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStocks.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected games from catalog?`)) {
      setStocks((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Game Title,Category,Stock Count,Low-Stock Threshold,Last Replenished,Status';
    const rows = filteredStocks.map((s) =>
      `"${s.gameTitle.replace(/"/g, '""')}","${s.category}",${s.stockCount},${s.lowStockThreshold},"${s.lastReplenished}","${s.status}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'stock_catalog_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStocks = stocks.filter((s) => {
    if (filters.gameTitle && !s.gameTitle.toLowerCase().includes(filters.gameTitle.toLowerCase())) return false;
    if (filters.category && s.category !== filters.category) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStocks = filteredStocks.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredStocks.length / pageSize) || 1;

  return (
    <div className="space-y-4 flex-grow flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Total Stock (Keys)</div>
            <div className="text-xl font-black text-white">
              {stocks.reduce((acc, curr) => acc + curr.stockCount, 0)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <Package className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Monitored Games</div>
            <div className="text-xl font-black text-white">{stocks.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <Gamepad2 className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-amber-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">Low Stock Warning</div>
            <div className="text-xl font-black text-amber-400">
              {stocks.filter((s) => s.status === 'critical').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-red-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Out of Stock</div>
            <div className="text-xl font-black text-red-400">
              {stocks.filter((s) => s.status === 'empty').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <Layers className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in slide-in-from-top-1 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* ── INTERACTIVE SEARCH CARD ── */}
      {showSearch && (
        <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Game Title</label>
                  <input
                    placeholder="Enter game title"
                    value={filters.gameTitle}
                    onChange={(e) => handleInputChange('gameTitle', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Category</label>
                  <Select
                    value={filters.category}
                    onChange={(val) => handleInputChange('category', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All categories' },
                      { value: 'RPG', label: 'RPG' },
                      { value: 'Action', label: 'Action' },
                      { value: 'Sandbox', label: 'Sandbox' },
                      { value: 'Rogue-like', label: 'Rogue-like' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Status</label>
                  <Select
                    value={filters.status}
                    onChange={(val) => handleInputChange('status', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'healthy', label: 'Healthy' },
                      { value: 'critical', label: 'Critical / Low Stock' },
                      { value: 'empty', label: 'Empty' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-2">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer"
                >
                  Collapse <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <Button onClick={handleReset}>Reset</Button>
                  <Button variant="primary" onClick={() => setCurrentPage(1)}>
                    Search
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 w-full">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Title</label>
                  <input
                    placeholder="Enter game title"
                    value={filters.gameTitle}
                    onChange={(e) => handleInputChange('gameTitle', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0 md:ml-auto">
                <Button onClick={handleReset}>Reset</Button>
                <Button variant="primary" onClick={() => setCurrentPage(1)}>
                  Search
                </Button>
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer ml-1.5"
                >
                  Expand <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: list + quick replenisher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow min-h-0">
        {/* Left Side: Stock Table */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between overflow-hidden relative min-h-[400px]">
          {/* Table Toolbar */}
          <div className="flex items-center justify-between min-h-[44px] flex-shrink-0 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none">
              <span>Stock Catalog List</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
                {filteredStocks.length} games
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStocks(initialStocks)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
                title="Reset database to initial stocks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <Tooltip title="Export current catalog to CSV">
                <button
                  onClick={handleExportCSV}
                  className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

              <Tooltip title={showSearch ? 'Hide Search Filters' : 'Show Search Filters'}>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] cursor-pointer transition-colors duration-150 ${
                    showSearch
                      ? 'border-[var(--indigo)]/50 text-[var(--indigo)] bg-[var(--indigo)]/10 hover:text-[var(--indigo)]'
                      : 'hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Selected Counter & Bulk Actions */}
          {selectedIds.length > 0 && (
            <div 
              className={`border rounded-xl px-4 py-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-1 flex-shrink-0 ${
                isLight
                  ? 'bg-indigo-50/80 border-indigo-200/60'
                  : 'bg-[var(--indigo-dim)]/50 border border-[var(--indigo)]/20'
              }`}
            >
              <span className={`text-xs font-semibold ${isLight ? 'text-indigo-950' : 'text-white'}`}>
                <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> games selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  className={`h-8 rounded-lg text-xs px-3 font-semibold transition-all duration-150 cursor-pointer border ${
                    isLight
                      ? 'bg-rose-100/70 border-rose-300 hover:bg-rose-500 hover:text-white text-rose-700'
                      : 'bg-red-500/20 border-red-500/10 hover:bg-red-500 hover:text-white text-red-400'
                  }`}
                >
                  Delete Selected Games
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 overflow-auto min-h-0 border border-white/5 rounded-xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="w-12 px-4 py-3.5 border-b border-white/8 text-center select-none">
                    <Checkbox
                      checked={filteredStocks.length > 0 && selectedIds.length === filteredStocks.length}
                      onChange={handleAllCheck}
                    />
                  </th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Game Title</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Category</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">In Stock</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Low Threshold</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Status</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
                {paginatedStocks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-dim)] select-none">
                      No stock catalog items match filters.
                    </td>
                  </tr>
                ) : (
                  paginatedStocks.map((s) => (
                    <tr key={s.id} className="hover:bg-white/2 transition-colors duration-100">
                      <td className="w-12 px-4 py-3.5 text-center">
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onChange={(checked) => handleRowCheck(s.id, checked)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white truncate max-w-[180px]" title={s.gameTitle}>
                        {s.gameTitle}
                      </td>
                      <td className="px-4 py-3.5 select-none">
                        <span className="text-[10px] bg-white/4 border border-white/5 text-[var(--text-dim)] font-bold px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-white">
                        {s.stockCount} <span className="text-[10px] font-medium text-[var(--text-dim)]">keys</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[var(--text-dim)]">
                        {s.lowStockThreshold}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.status === 'healthy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'critical'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[12px]">
                        <button
                          onClick={() => {
                            setSelectedStock(s);
                            const container = document.getElementById('replenish-form');
                            if (container) {
                              container.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="text-[var(--indigo)] hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          Replenish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between mt-4 flex-shrink-0 select-none">
            <div className="text-[12.5px] font-semibold text-[var(--text-dim)]">
              Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredStocks.length)}</strong> to{' '}
              <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredStocks.length)}</strong> of{' '}
              <strong className="text-[var(--text-mid)]">{filteredStocks.length}</strong> records
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-dim)] font-bold">Show</span>
                <Select
                  value={pageSize}
                  onChange={(val) => {
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  className="w-[85px]"
                  size="middle"
                  options={[
                    { value: 5, label: '5 / page' },
                    { value: 10, label: '10 / page' },
                    { value: 20, label: '20 / page' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-1 bg-white/2 border border-white/6 rounded-xl p-0.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3.5 text-xs text-white font-bold select-none">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Key Replenisher */}
        <div id="replenish-form" className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 h-full">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none mb-4">
              <Plus className="w-4 h-4 text-[var(--indigo)]" />
              <span>Key Delivery Terminal</span>
            </h3>

            {selectedStock ? (
              <form onSubmit={handleAddKeys} className="space-y-4">
                <div className="bg-[var(--indigo-dim)]/50 border border-[var(--indigo)]/20 rounded-xl p-3.5 space-y-1">
                  <span className="text-[9px] text-[var(--indigo)] font-black uppercase tracking-widest">Active Game Selected</span>
                  <div className="text-xs font-bold text-white">{selectedStock.gameTitle}</div>
                  <div className="text-[10px] text-[var(--text-dim)]">Current stock: {selectedStock.stockCount} units</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--text-mid)] font-semibold flex items-center justify-between select-none">
                    <span>Enter License Keys</span>
                    <span className="text-[9px] text-[var(--text-dim)]">One key per line</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={batchKeysInput}
                    onChange={(e) => setBatchKeysInput(e.target.value)}
                    placeholder={`XXXX-XXXX-XXXX-XXXX&#13;YYYY-YYYY-YYYY-YYYY&#13;ZZZZ-ZZZZ-ZZZZ-ZZZZ`}
                    className="w-full bg-white/4 border border-[var(--border)] rounded-xl p-3.5 text-xs text-[var(--text)] font-mono outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all placeholder-[var(--text-dim)] leading-relaxed resize-none"
                  />
                </div>

                <div className="flex gap-2 select-none">
                  <button
                    type="button"
                    onClick={() => setSelectedStock(null)}
                    className="flex-1 h-10 rounded-xl bg-white/2 hover:bg-white/6 border border-[var(--border)] text-xs text-[var(--text-mid)] font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button type="submit" className="flex-1 h-10 text-xs font-bold">
                    Deliver Keys
                  </Button>
                </div>
              </form>
            ) : (
              <div className="h-[280px] border border-dashed border-white/8 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none bg-black/10">
                <FileText className="w-8 h-8 text-[var(--text-dim)] mb-2.5 animate-bounce" />
                <div className="text-xs font-bold text-white mb-1">No game selected</div>
                <p className="text-[10px] text-[var(--text-dim)] leading-relaxed max-w-[180px]">
                  Click the <strong className="text-[var(--indigo)]">Replenish</strong> link next to any game on the catalog list to deliver license codes.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-[var(--text-dim)] select-none italic text-center pt-4 border-t border-white/5">
            Key drops are processed in escrow until delivered directly to purchasing customer's order checkout widget.
          </div>
        </div>
      </div>
    </div>
  );
};

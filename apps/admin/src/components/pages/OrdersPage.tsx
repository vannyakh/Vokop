import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  Eye,
  Trash2,
  Check,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShoppingCart,
  X,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { initialOrders, Order } from '../../constants/mockData';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

export const OrdersPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Order Form state
  const [newOrder, setNewOrder] = useState({
    id: '',
    buyer: '',
    item: '',
    qty: 1,
    amount: '',
    status: 'awaiting' as 'completed' | 'awaiting' | 'refunded',
  });

  // Filters State
  const [filters, setFilters] = useState({
    id: '',
    buyer: '',
    item: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({
      id: '',
      buyer: '',
      item: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  const filteredOrders = orders.filter((o) => {
    if (filters.id && !o.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
    if (filters.buyer && !o.buyer.toLowerCase().includes(filters.buyer.toLowerCase())) return false;
    if (filters.item && !o.item.toLowerCase().includes(filters.item.toLowerCase())) return false;
    if (filters.status && o.status !== filters.status) return false;
    if (filters.startDate && !o.date.includes(filters.startDate)) return false;
    if (filters.endDate && !o.date.includes(filters.endDate)) return false;
    return true;
  });

  const handleRowCheck = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, orderId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleAllCheck = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const nextStatusMap: Record<'completed' | 'awaiting' | 'refunded', 'completed' | 'awaiting' | 'refunded'> = {
            completed: 'refunded',
            awaiting: 'completed',
            refunded: 'awaiting',
          };
          return { ...o, status: nextStatusMap[o.status] };
        }
        return o;
      })
    );
  };

  const handleDeleteRow = (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSelectedIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected orders?`)) {
      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      setSelectedIds([]);
    }
  };

  const handleBulkComplete = () => {
    setOrders((prev) =>
      prev.map((o) => (selectedIds.includes(o.id) ? { ...o, status: 'completed' as const } : o))
    );
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const headers = 'Order ID,Buyer,Item,Qty,Amount,Status,Date';
    const rows = filteredOrders.map((o) =>
      `"${o.id}","${o.buyer}","${o.item.replace(/"/g, '""')}",${o.qty},"${o.amount}","${o.status}","${o.date}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'orders_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.buyer || !newOrder.item || !newOrder.amount) {
      alert('Please fill out all required fields.');
      return;
    }

    const orderToAdd: Order = {
      id: newOrder.id.startsWith('ORD-') ? newOrder.id : `ORD-${newOrder.id}`,
      buyer: newOrder.buyer,
      item: newOrder.item,
      qty: Number(newOrder.qty),
      amount: newOrder.amount.startsWith('$') ? newOrder.amount : `$${newOrder.amount}`,
      status: newOrder.status,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '/'),
    };

    setOrders([orderToAdd, ...orders]);
    setIsAddModalOpen(false);
    setNewOrder({
      id: '',
      buyer: '',
      item: '',
      qty: 1,
      amount: '',
      status: 'awaiting',
    });
  };

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  const content = (
    <div className={`space-y-4 flex flex-col h-full min-h-0 transition-all duration-200 ${
      isFullscreen ? 'fixed inset-0 z-[250] m-0 rounded-none p-6 bg-[var(--bg)]' : ''
    }`}>
      {/* ── INTERACTIVE SEARCH CARD ── */}
      {showSearch && (
        <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200">
          {!isCollapsed && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Order ID</label>
                  <input
                    placeholder="Enter order ID"
                    value={filters.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Buyer Name</label>
                  <input
                    placeholder="Enter buyer username"
                    value={filters.buyer}
                    onChange={(e) => handleInputChange('buyer', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
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
                      { value: 'completed', label: 'Completed' },
                      { value: 'awaiting', label: 'Awaiting' },
                      { value: 'refunded', label: 'Refunded' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Item Description</label>
                  <input
                    placeholder="Enter item description"
                    value={filters.item}
                    onChange={(e) => handleInputChange('item', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Order Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Start Year/Date (e.g., 2024)"
                      value={filters.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                    />
                    <span className="text-[var(--text-dim)] text-xs font-bold flex-shrink-0 select-none px-1">→</span>
                    <input
                      type="text"
                      placeholder="End Year/Date (e.g., 2024)"
                      value={filters.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                    />
                  </div>
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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Order ID</label>
                  <input
                    placeholder="Enter order ID"
                    value={filters.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex items-center gap-3 w-full">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Buyer Name</label>
                  <input
                    placeholder="Enter buyer username"
                    value={filters.buyer}
                    onChange={(e) => handleInputChange('buyer', e.target.value)}
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

      {/* ── STATEFUL DATA TABLE ── */}
      <div className="flex-1 min-h-0 bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm flex flex-col justify-between overflow-hidden relative">
        {/* Table Header Toolbar */}
        <div className="flex items-center justify-between mb-4 min-h-[44px] flex-shrink-0">
          <h2 className="text-sm font-bold text-[var(--text)] select-none flex items-center gap-2">
            Order list
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
              {filteredOrders.length} total
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <span className="text-base leading-none mr-1">+</span> New order
            </Button>

            <Tooltip title="Export current to CSV">
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

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
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
              <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> orders selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkComplete}
                className={`h-8 rounded-lg text-xs px-3 font-semibold transition-all duration-150 cursor-pointer border ${
                  isLight
                    ? 'bg-emerald-100/70 border-emerald-300 hover:bg-emerald-500 hover:text-white text-emerald-700'
                    : 'bg-emerald-500/20 border-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400'
                }`}
              >
                Mark Completed
              </button>
              <button
                onClick={handleBulkDelete}
                className={`h-8 rounded-lg text-xs px-3 font-semibold transition-all duration-150 cursor-pointer border ${
                  isLight
                    ? 'bg-rose-100/70 border-rose-300 hover:bg-rose-500 hover:text-white text-rose-700'
                    : 'bg-red-500/20 border-red-500/10 hover:bg-red-500 hover:text-white text-red-400'
                }`}
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Orders Table container */}
        <div className="flex-1 overflow-auto min-h-0 border border-white/5 rounded-xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 px-4 py-3.5 border-b border-white/8 text-center select-none">
                  <Checkbox
                    checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                    onChange={handleAllCheck}
                  />
                </th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Order ID</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Buyer</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Item Description</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Qty</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Amount</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Status</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Order Date</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-[var(--text-dim)] select-none">
                    No orders matching search query.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/2 transition-colors duration-100">
                    <td className="w-12 px-4 py-3.5 text-center">
                      <Checkbox
                        checked={selectedIds.includes(o.id)}
                        onChange={(checked) => handleRowCheck(o.id, checked)}
                      />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-dim)] font-bold">{o.id}</td>
                    <td className="px-5 py-3.5 text-[var(--text)] font-semibold">{o.buyer}</td>
                    <td className="px-5 py-3.5 text-[var(--text-mid)] font-semibold">{o.item}</td>
                    <td className="px-5 py-3.5 text-[var(--text-dim)]">{o.qty}</td>
                    <td className="px-5 py-3.5 font-bold text-white">{o.amount}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(o.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                          o.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : o.status === 'awaiting'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          o.status === 'completed' ? 'bg-emerald-400' : o.status === 'awaiting' ? 'bg-blue-400 animate-pulse' : 'bg-red-400'
                        }`} />
                        {o.status}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-dim)]">{o.date}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-[12.5px]">
                      <div className="flex items-center justify-end gap-3 select-none">
                        <button
                          onClick={() => handleToggleStatus(o.id)}
                          className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          Cycle
                        </button>
                        <button
                          onClick={() => handleDeleteRow(o.id)}
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
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
            Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredOrders.length)}</strong> to{' '}
            <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredOrders.length)}</strong> of{' '}
            <strong className="text-[var(--text-mid)]">{filteredOrders.length}</strong> records
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
                  { value: 50, label: '50 / page' },
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

      {/* Add Order Modal overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e16] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 select-none">
              <ShoppingCart className="w-4 h-4 text-[var(--indigo)]" />
              <span>Create Storefront Order</span>
            </h3>

            <form onSubmit={handleAddOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Order ID</label>
                <input
                  required
                  placeholder="e.g. ORD-902185"
                  value={newOrder.id}
                  onChange={(e) => setNewOrder((p) => ({ ...p, id: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Buyer Username</label>
                <input
                  required
                  placeholder="e.g. srey_nich_kh"
                  value={newOrder.buyer}
                  onChange={(e) => setNewOrder((p) => ({ ...p, buyer: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Item Description</label>
                <input
                  required
                  placeholder="e.g. Elden Ring - Premium Key"
                  value={newOrder.item}
                  onChange={(e) => setNewOrder((p) => ({ ...p, item: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOrder.qty}
                    onChange={(e) => setNewOrder((p) => ({ ...p, qty: Number(e.target.value) }))}
                    className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Amount</label>
                  <input
                    required
                    placeholder="e.g. 59.99"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Initial Status</label>
                <Select
                  value={newOrder.status}
                  onChange={(val) => setNewOrder((p) => ({ ...p, status: val }))}
                  className="w-full font-semibold"
                  options={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'awaiting', label: 'Awaiting' },
                    { value: 'refunded', label: 'Refunded' },
                  ]}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 h-10 rounded-xl bg-white/2 hover:bg-white/6 border border-[var(--border)] text-xs text-[var(--text-mid)] font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <Button type="submit" className="flex-1 h-10 text-xs font-bold">
                  Create Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
};

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  X,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';
import dayjs from 'dayjs';
import { AntDateRangePicker, AntDateRangeValue } from '../molecules/AntDateRangePicker';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'sale_escrow' | 'payout' | 'refund';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  reference: string;
}

const initialTransactions: Transaction[] = [
  { id: 'TXN-902184', type: 'sale_escrow', amount: 59.99, currency: 'USD', status: 'completed', date: '2026-06-30 22:15', reference: 'Order #ORD-982194' },
  { id: 'TXN-902183', type: 'payout', amount: -240.00, currency: 'USD', status: 'completed', date: '2026-06-29 14:30', reference: 'Bank Transfer ABA' },
  { id: 'TXN-902182', type: 'sale_escrow', amount: 29.99, currency: 'USD', status: 'completed', date: '2026-06-28 10:11', reference: 'Order #ORD-298311' },
  { id: 'TXN-902181', type: 'refund', amount: -19.99, currency: 'USD', status: 'completed', date: '2026-06-20 11:21', reference: 'Refund Order #ORD-021029' },
  { id: 'TXN-902180', type: 'sale_escrow', amount: 15.00, currency: 'USD', status: 'completed', date: '2026-06-19 18:45', reference: 'Order #ORD-021948' },
  { id: 'TXN-902179', type: 'withdrawal', amount: -450.00, currency: 'USD', status: 'completed', date: '2026-06-15 09:00', reference: 'Crypto Wallet USDT-TRC20' },
  { id: 'TXN-902178', type: 'sale_escrow', amount: 110.00, currency: 'USD', status: 'completed', date: '2026-06-14 11:20', reference: 'Order #ORD-128312' },
  { id: 'TXN-902177', type: 'deposit', amount: 50.00, currency: 'USD', status: 'failed', date: '2026-06-10 13:02', reference: 'Visa Debit top-up' },
];

export const TransactionsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [txns, setTxns] = useState<Transaction[]>(initialTransactions);
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // New Transaction State
  const [newTxn, setNewTxn] = useState({
    id: '',
    type: 'sale_escrow' as Transaction['type'],
    amount: '',
    reference: '',
    status: 'completed' as Transaction['status'],
  });

  // Filters State
  const [filters, setFilters] = useState({
    id: '',
    reference: '',
    type: '',
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
      reference: '',
      type: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
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

  const filteredTxns = txns.filter((t) => {
    if (filters.id && !t.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
    if (filters.reference && !t.reference.toLowerCase().includes(filters.reference.toLowerCase())) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.status && t.status !== filters.status) return false;
    
    // Proper date range check (inclusive)
    const tDateOnly = t.date.split(' ')[0]; // gets "YYYY-MM-DD" from "YYYY-MM-DD HH:mm"
    if (filters.startDate && tDateOnly < filters.startDate) return false;
    if (filters.endDate && tDateOnly > filters.endDate) return false;
    
    return true;
  });

  const handleRowCheck = (txnId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, txnId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== txnId));
    }
  };

  const handleAllCheck = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTxns.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = (txnId: string) => {
    if (window.confirm('Are you sure you want to delete this ledger transaction entry?')) {
      setTxns((prev) => prev.filter((t) => t.id !== txnId));
      setSelectedIds((prev) => prev.filter((id) => id !== txnId));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected ledger entries?`)) {
      setTxns((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Transaction ID,Type,Reference/Log,Amount,Currency,Status,Date';
    const rows = filteredTxns.map((t) =>
      `"${t.id}","${t.type}","${t.reference.replace(/"/g, '""')}",${t.amount},"${t.currency}","${t.status}","${t.date}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transaction_ledger_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  const handleAddTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxn.id || !newTxn.amount || !newTxn.reference) {
      alert('Please fill out all required fields.');
      return;
    }

    const value = parseFloat(newTxn.amount);
    if (isNaN(value)) {
      alert('Please enter a valid numeric amount.');
      return;
    }

    const txnToAdd: Transaction = {
      id: newTxn.id.toUpperCase().startsWith('TXN-') ? newTxn.id.toUpperCase() : `TXN-${newTxn.id.toUpperCase()}`,
      type: newTxn.type,
      amount: value,
      currency: 'USD',
      status: newTxn.status,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reference: newTxn.reference,
    };

    setTxns([txnToAdd, ...txns]);
    setIsAddModalOpen(false);
    setNewTxn({
      id: '',
      type: 'sale_escrow',
      amount: '',
      reference: '',
      status: 'completed',
    });
  };

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTxns = filteredTxns.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredTxns.length / pageSize) || 1;

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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Transaction ID</label>
                  <input
                    placeholder="Enter TXN ID"
                    value={filters.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Reference / Log</label>
                  <input
                    placeholder="Enter reference description"
                    value={filters.reference}
                    onChange={(e) => handleInputChange('reference', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Type</label>
                  <Select
                    value={filters.type}
                    onChange={(val) => handleInputChange('type', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All types' },
                      { value: 'sale_escrow', label: 'Sale Escrow' },
                      { value: 'payout', label: 'Payout' },
                      { value: 'withdrawal', label: 'Withdrawal' },
                      { value: 'deposit', label: 'Deposit' },
                      { value: 'refund', label: 'Refund' },
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
                      { value: 'completed', label: 'Completed' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'failed', label: 'Failed' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Transaction Date</label>
                  <AntDateRangePicker
                    value={dateRangeValue}
                    onChange={handleDateRangeChange}
                    className="w-full"
                    id="transactions-date-range"
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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">TXN ID</label>
                  <input
                    placeholder="Enter TXN ID"
                    value={filters.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex items-center gap-3 w-full">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Reference</label>
                  <input
                    placeholder="Enter reference description"
                    value={filters.reference}
                    onChange={(e) => handleInputChange('reference', e.target.value)}
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

      {showExportSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in fade-in flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Ledger successfully compiled and exported as: transaction_ledger_export.csv</span>
        </div>
      )}

      {/* ── STATEFUL DATA TABLE ── */}
      <div className="flex-1 min-h-0 bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm flex flex-col justify-between overflow-hidden relative">
        {/* Table Header Toolbar */}
        <div className="flex items-center justify-between mb-4 min-h-[44px] flex-shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[var(--text)] select-none flex items-center gap-2">
              Financial Ledger
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
                {filteredTxns.length} entries
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <span className="text-base leading-none mr-1">+</span> New transaction
            </Button>

            <Tooltip title="Export ledger to CSV">
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
              <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> transaction entries selected
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
                Delete Selected Logs
              </button>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="flex-1 overflow-auto min-h-0 border border-white/5 rounded-xl">
          <table className="w-full border-collapse text-left table-fixed min-w-[750px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 px-4 py-3.5 border-b border-white/8 text-center select-none">
                  <Checkbox
                    checked={filteredTxns.length > 0 && selectedIds.length === filteredTxns.length}
                    onChange={handleAllCheck}
                  />
                </th>
                <th className="w-[140px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Transaction ID</th>
                <th className="w-[120px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Type</th>
                <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Reference / Log</th>
                <th className="w-[120px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Amount</th>
                <th className="w-[150px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Date</th>
                <th className="w-[90px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-center">Status</th>
                <th className="w-[80px] px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
              {paginatedTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[var(--text-dim)] select-none">
                    <FileText className="w-8 h-8 mx-auto text-white/5 mb-2" />
                    No ledger history matching search query.
                  </td>
                </tr>
              ) : (
                paginatedTxns.map((t) => {
                  const isPositive = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-white/2 transition-colors duration-100">
                      <td className="px-4 py-3.5 text-center">
                        <Checkbox
                          checked={selectedIds.includes(t.id)}
                          onChange={(checked) => handleRowCheck(t.id, checked)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--text-dim)] font-bold">{t.id}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.25 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          t.type === 'sale_escrow'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : t.type === 'payout' || t.type === 'withdrawal'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.type === 'sale_escrow' ? 'Sale' : t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--text-mid)] font-semibold truncate" title={t.reference}>
                        {t.reference}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-black ${isPositive ? 'text-emerald-400' : 'text-white'}`}>
                        {isPositive ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--text-dim)] font-medium">{t.date}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          t.status === 'completed'
                            ? 'bg-emerald-500'
                            : t.status === 'pending'
                            ? 'bg-amber-500 animate-ping'
                            : 'bg-red-500'
                        }`} title={t.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[12px]">
                        <button
                          onClick={() => handleDeleteRow(t.id)}
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between mt-4 flex-shrink-0 select-none">
          <div className="text-[12.5px] font-semibold text-[var(--text-dim)]">
            Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredTxns.length)}</strong> to{' '}
            <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredTxns.length)}</strong> of{' '}
            <strong className="text-[var(--text-mid)]">{filteredTxns.length}</strong> records
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

      {/* Add Transaction Modal */}
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
              <CreditCard className="w-4 h-4 text-[var(--indigo)]" />
              <span>Log Ledger Transaction</span>
            </h3>

            <form onSubmit={handleAddTxn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Transaction ID</label>
                <input
                  required
                  placeholder="e.g. TXN-902185"
                  value={newTxn.id}
                  onChange={(e) => setNewTxn((p) => ({ ...p, id: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Type</label>
                <Select
                  value={newTxn.type}
                  onChange={(val) => setNewTxn((p) => ({ ...p, type: val }))}
                  className="w-full font-semibold"
                  options={[
                    { value: 'sale_escrow', label: 'Sale Escrow' },
                    { value: 'payout', label: 'Payout' },
                    { value: 'withdrawal', label: 'Withdrawal' },
                    { value: 'deposit', label: 'Deposit' },
                    { value: 'refund', label: 'Refund' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Amount (USD)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 59.99 or -240.00"
                  value={newTxn.amount}
                  onChange={(e) => setNewTxn((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Reference / Log Description</label>
                <input
                  required
                  placeholder="e.g. Bank Transfer ABA or Order #ORD-111"
                  value={newTxn.reference}
                  onChange={(e) => setNewTxn((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Status</label>
                <Select
                  value={newTxn.status}
                  onChange={(val) => setNewTxn((p) => ({ ...p, status: val }))}
                  className="w-full font-semibold"
                  options={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'failed', label: 'Failed' },
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
                  Log Entry
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

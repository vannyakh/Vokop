import React, { useState } from 'react';
import {
  DollarSign,
  Landmark,
  ArrowUpRight,
  History,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { initialPayouts, Payout } from '../../constants/mockData';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

export const WalletPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [balance, setBalance] = useState(240.0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);

  // Search filter and pagination states
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [filters, setFilters] = useState({
    ref: '',
    bank: '',
    status: '',
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (amt > balance) {
      alert('Insufficient wallet balance.');
      return;
    }
    if (window.confirm(`Request bank payout of $${amt.toFixed(2)} to ABA Bank account?`)) {
      setBalance((b) => b - amt);
      setWithdrawAmount('');

      // Add a pending payout log
      const refId = `PAY-${Math.random().toString(36).substring(2, 7)}a`;
      const newLog: Payout = {
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        ref: refId,
        amount: `$${amt.toFixed(2)}`,
        bank: 'ABA Bank ••••2231',
        status: 'Completed', // For immediate preview sandbox feedback
      };
      setPayouts([newLog, ...payouts]);
      alert(`Withdrawal request of $${amt.toFixed(2)} successfully sent. Settlements are processed in 1 business day.`);
    }
  };

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({
      ref: '',
      bank: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const filteredPayouts = payouts.filter((p) => {
    if (filters.ref && !p.ref.toLowerCase().includes(filters.ref.toLowerCase())) return false;
    if (filters.bank && !p.bank.toLowerCase().includes(filters.bank.toLowerCase())) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  });

  const handleRowCheck = (payoutRef: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, payoutRef]);
    } else {
      setSelectedIds((prev) => prev.filter((ref) => ref !== payoutRef));
    }
  };

  const handleAllCheck = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredPayouts.map((p) => p.ref));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected payout logs?`)) {
      setPayouts((prev) => prev.filter((p) => !selectedIds.includes(p.ref)));
      setSelectedIds([]);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Disbursement Date,Reference ID,Amount,Destination,Status';
    const rows = filteredPayouts.map((p) =>
      `"${p.date}","${p.ref}","${p.amount}","${p.bank}","${p.status}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'payouts_ledger_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayouts = filteredPayouts.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredPayouts.length / pageSize) || 1;

  return (
    <div className="space-y-6 flex-grow flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-shrink-0">
        {/* Balance Card */}
        <div className="md:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5.5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold">Available balance</div>
              <div className="text-3xl font-extrabold text-white">${balance.toFixed(2)}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[var(--indigo-dim)] text-[var(--indigo)] flex items-center justify-center">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
          </div>

          <div className="h-[1px] bg-[var(--border)]" />

          {/* Quick withdraw form */}
          <form onSubmit={handleWithdraw} className="space-y-3">
            <div className="text-xs text-[var(--text-mid)] font-semibold">Request bank payout</div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 flex items-center h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 w-full focus-within:border-[var(--indigo)] focus-within:ring-2 focus-within:ring-[var(--indigo)]/20 transition-all shadow-inner">
                <span className="text-xs text-[var(--text-dim)] font-bold mr-2 select-none">$</span>
                <input
                  type="text"
                  placeholder="Enter payout amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs text-[var(--text)] w-full placeholder-[var(--text-dim)] font-semibold"
                />
              </div>
              <Button type="submit" variant="primary" size="md" className="flex-shrink-0">
                Request payout <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </div>

        {/* Bank Account */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/5 flex items-center justify-center text-amber-500 flex-shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">ABA Bank</div>
              <div className="text-[11px] text-[var(--text-dim)] mt-0.5 select-none">••••2231</div>
            </div>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed select-none">
              This ABA bank account is linked to your public storefront for automatic payouts and direct disbursements.
            </p>
          </div>
          <button
            onClick={() => alert('Change bank link flow...')}
            className="text-xs font-bold text-[var(--indigo)] hover:text-indigo-400 cursor-pointer select-none text-left"
          >
            Change linked bank account
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE SEARCH CARD ── */}
      {showSearch && (
        <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Reference ID</label>
                  <input
                    placeholder="Enter Reference ID"
                    value={filters.ref}
                    onChange={(e) => handleInputChange('ref', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Destination Account</label>
                  <input
                    placeholder="Enter Bank or Destination name"
                    value={filters.bank}
                    onChange={(e) => handleInputChange('bank', e.target.value)}
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
                      { value: 'Completed', label: 'Completed' },
                      { value: 'Pending', label: 'Pending' },
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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Ref ID</label>
                  <input
                    placeholder="Enter Reference ID"
                    value={filters.ref}
                    onChange={(e) => handleInputChange('ref', e.target.value)}
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
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 flex-grow flex flex-col justify-between overflow-hidden relative min-h-[350px]">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between min-h-[44px] flex-shrink-0">
          <div className="flex items-center gap-2 select-none">
            <History className="w-4 h-4 text-[var(--text-dim)]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Payout Log</h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
              {filteredPayouts.length} total
            </span>
          </div>

          <div className="flex items-center gap-2">
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
              <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> payout logs selected
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
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 px-4 py-3.5 border-b border-white/8 text-center select-none">
                  <Checkbox
                    checked={filteredPayouts.length > 0 && selectedIds.length === filteredPayouts.length}
                    onChange={handleAllCheck}
                  />
                </th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Disbursement Date</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Reference ID</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Amount</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Destination</th>
                <th className="px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Disbursement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
              {paginatedPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-dim)] select-none">
                    No disbursement payout logs found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedPayouts.map((p) => (
                  <tr key={p.ref} className="hover:bg-white/2 transition-colors duration-100">
                    <td className="w-12 px-4 py-3.5 text-center">
                      <Checkbox
                        checked={selectedIds.includes(p.ref)}
                        onChange={(checked) => handleRowCheck(p.ref, checked)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-dim)] font-medium">{p.date}</td>
                    <td className="px-5 py-3.5 font-mono text-white font-bold">{p.ref}</td>
                    <td className="px-5 py-3.5 font-bold text-white">{p.amount}</td>
                    <td className="px-5 py-3.5 text-[var(--text)] font-semibold">{p.bank}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {p.status}
                      </span>
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
            Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredPayouts.length)}</strong> to{' '}
            <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredPayouts.length)}</strong> of{' '}
            <strong className="text-[var(--text-mid)]">{filteredPayouts.length}</strong> records
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
    </div>
  );
};

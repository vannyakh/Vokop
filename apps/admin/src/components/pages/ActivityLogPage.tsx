import React, { useState } from 'react';
import {
  History,
  Shield,
  Key,
  FileText,
  Search,
  RefreshCw,
  Layers,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Trash2,
  Info,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

interface Activity {
  id: string;
  user: string;
  action: string;
  module: 'auth' | 'catalog' | 'keys' | 'settings';
  ipAddress: string;
  time: string;
  status: 'success' | 'warn' | 'error';
}

const initialActivities: Activity[] = [
  { id: 'ACT-001', user: 'Luki (Owner)', action: 'Generated Live Production API Secret Key', module: 'keys', ipAddress: '103.116.12.89', time: '2026-07-01 02:40', status: 'success' },
  { id: 'ACT-002', user: 'Luki (Owner)', action: 'Assigned "Moderator" Role to andrea_g', module: 'auth', ipAddress: '103.116.12.89', time: '2026-06-30 21:50', status: 'success' },
  { id: 'ACT-003', user: 'System Sync', action: 'Imported 140 game license keys (batch #381A)', module: 'catalog', ipAddress: '127.0.0.1', time: '2026-06-28 10:11', status: 'success' },
  { id: 'ACT-004', user: 'Jack (Admin)', action: 'Deleted listing "Minecraft Java" (out of stock)', module: 'catalog', ipAddress: '172.56.29.112', time: '2026-06-25 15:44', status: 'warn' },
  { id: 'ACT-005', user: 'Luki (Owner)', action: 'Changed payout routing details for ABA Bank', module: 'settings', ipAddress: '103.116.12.89', time: '2026-06-20 11:21', status: 'success' },
  { id: 'ACT-006', user: 'Guest Guest', action: 'Failed login attempt: invalid password', module: 'auth', ipAddress: '45.138.89.214', time: '2026-06-15 03:00', status: 'error' },
];

export const ActivityLogPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter & Pagination States
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [filters, setFilters] = useState({
    userOrAction: '',
    module: '',
    status: '',
  });

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({
      userOrAction: '',
      module: '',
      status: '',
    });
    setCurrentPage(1);
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
      setSelectedIds(filteredActs.map((act) => act.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected activity logs?`)) {
      setActivities((prev) => prev.filter((act) => !selectedIds.includes(act.id)));
      setSelectedIds([]);
      setNotification('Selected logs deleted successfully.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Log ID,User,Action,Module,IP Address,Time,Status';
    const rows = filteredActs.map((act) =>
      `"${act.id}","${act.user.replace(/"/g, '""')}","${act.action.replace(/"/g, '""')}","${act.module}","${act.ipAddress}","${act.time}","${act.status}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit_activity_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredActs = activities.filter((act) => {
    if (filters.userOrAction) {
      const query = filters.userOrAction.toLowerCase();
      const match = act.action.toLowerCase().includes(query) || act.user.toLowerCase().includes(query);
      if (!match) return false;
    }
    if (filters.module && act.module !== filters.module) return false;
    if (filters.status && act.status !== filters.status) return false;
    return true;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedActs = filteredActs.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredActs.length / pageSize) || 1;

  return (
    <div className="space-y-4 flex-grow flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Total Operations</div>
            <div className="text-xl font-black text-white">{activities.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <History className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Auth & Security</div>
            <div className="text-xl font-black text-white">
              {activities.filter((act) => act.module === 'auth').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <Shield className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-amber-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">Warnings Logs</div>
            <div className="text-xl font-black text-amber-400">
              {activities.filter((act) => act.status === 'warn').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-red-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Security Failures</div>
            <div className="text-xl font-black text-red-400">
              {activities.filter((act) => act.status === 'error').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <XCircle className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in slide-in-from-top-1 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Interactive Search Card */}
      {showSearch && (
        <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Keyword (User / Action)</label>
                  <input
                    placeholder="Search by action text or admin user..."
                    value={filters.userOrAction}
                    onChange={(e) => handleInputChange('userOrAction', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">System Module</label>
                  <Select
                    value={filters.module}
                    onChange={(val) => handleInputChange('module', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All modules' },
                      { value: 'keys', label: 'Keys API' },
                      { value: 'auth', label: 'Auth & Access' },
                      { value: 'catalog', label: 'Catalog Keys' },
                      { value: 'settings', label: 'Settings' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Status Level</label>
                  <Select
                    value={filters.status}
                    onChange={(val) => handleInputChange('status', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'success', label: 'Success / Info' },
                      { value: 'warn', label: 'Warning' },
                      { value: 'error', label: 'Error / Failure' },
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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Keyword</label>
                  <input
                    placeholder="Search logs..."
                    value={filters.userOrAction}
                    onChange={(e) => handleInputChange('userOrAction', e.target.value)}
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

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow min-h-0">
        {/* Left Side: Audit Table */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between overflow-hidden relative min-h-[400px]">
          {/* Table Toolbar */}
          <div className="flex items-center justify-between min-h-[44px] flex-shrink-0 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none">
              <span>Security Audit Logs</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
                {filteredActs.length} logs
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivities(initialActivities)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
                title="Reset Database Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <Tooltip title="Export current logs to CSV">
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
                <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> logs selected
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
                      checked={filteredActs.length > 0 && selectedIds.length === filteredActs.length}
                      onChange={handleAllCheck}
                    />
                  </th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Log ID</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">User</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Action</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Module</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Status</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
                {paginatedActs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-dim)] select-none">
                      No activities match the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedActs.map((act) => (
                    <tr key={act.id} className="hover:bg-white/2 transition-colors duration-100">
                      <td className="w-12 px-4 py-3.5 text-center">
                        <Checkbox
                          checked={selectedIds.includes(act.id)}
                          onChange={(checked) => handleRowCheck(act.id, checked)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--text-dim)] font-bold">
                        {act.id}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white">
                        {act.user}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--text-mid)] truncate max-w-[200px]" title={act.action}>
                        {act.action}
                      </td>
                      <td className="px-4 py-3.5 select-none">
                        <span className="text-[10px] bg-white/4 border border-white/5 text-[var(--text-dim)] font-bold px-2.5 py-0.5 rounded-full uppercase">
                          {act.module}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          act.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : act.status === 'warn'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[12px]">
                        <button
                          onClick={() => setSelectedActivity(act)}
                          className="text-[var(--indigo)] hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          View
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
              Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredActs.length)}</strong> to{' '}
              <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredActs.length)}</strong> of{' '}
              <strong className="text-[var(--text-mid)]">{filteredActs.length}</strong> records
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

        {/* Right Side: Log Detail View */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 h-full">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none mb-4">
              <Info className="w-4 h-4 text-[var(--indigo)]" />
              <span>Log Inspector</span>
            </h3>

            {selectedActivity ? (
              <div className="space-y-4 text-xs font-semibold">
                <div className="bg-[var(--indigo-dim)]/40 border border-[var(--indigo)]/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-[9px] text-[var(--indigo)] font-black uppercase tracking-widest">Active Audit Log</span>
                    <span className="font-mono text-[9px] text-[var(--text-dim)]">{selectedActivity.id}</span>
                  </div>
                  <div className="text-white text-xs leading-normal">{selectedActivity.action}</div>
                </div>

                <div className="space-y-3 bg-white/2 border border-white/5 rounded-xl p-3.5 text-[var(--text-mid)]">
                  <div className="flex justify-between py-1 border-b border-white/4">
                    <span className="text-[var(--text-dim)]">Admin Operator:</span>
                    <span className="text-white font-bold">{selectedActivity.user}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/4">
                    <span className="text-[var(--text-dim)]">Network IP:</span>
                    <span className="font-mono text-white">{selectedActivity.ipAddress}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/4">
                    <span className="text-[var(--text-dim)]">Module Sector:</span>
                    <span className="text-white uppercase text-[10px] bg-white/5 px-2 py-0.5 rounded-full font-bold">{selectedActivity.module}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/4">
                    <span className="text-[var(--text-dim)]">Timestamp:</span>
                    <span className="text-white">{selectedActivity.time}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-dim)]">Integrity Status:</span>
                    <span className={`font-bold capitalize ${
                      selectedActivity.status === 'success' ? 'text-emerald-400' : selectedActivity.status === 'warn' ? 'text-amber-400' : 'text-red-400'
                    }`}>{selectedActivity.status}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="w-full h-10 rounded-xl bg-white/2 hover:bg-white/6 border border-[var(--border)] text-xs text-[var(--text-mid)] font-bold transition-all cursor-pointer"
                  >
                    Clear Inspector
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[280px] border border-dashed border-white/8 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none bg-black/10">
                <FileText className="w-8 h-8 text-[var(--text-dim)] mb-2.5" />
                <div className="text-xs font-bold text-white mb-1">No log selected</div>
                <p className="text-[10px] text-[var(--text-dim)] leading-relaxed max-w-[180px]">
                  Click the <strong className="text-[var(--indigo)]">View</strong> link next to any item in the audit log list to view terminal details.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-[var(--text-dim)] select-none italic text-center pt-4 border-t border-white/5">
            Audit recordings are cryptographic hashes signed by administrative authorization keys for system non-repudiation.
          </div>
        </div>
      </div>
    </div>
  );
};

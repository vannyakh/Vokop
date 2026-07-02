import React, { useState } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Server,
  Check,
  CheckCircle2,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

interface ApiKey {
  id: string;
  name: string;
  token: string;
  created: string;
  status: 'active' | 'revoked';
}

const initialKeys: ApiKey[] = [
  { id: '1', name: 'Production Live Backend', token: 'vk_live_8a921b38e02d0cfed7760e4b8910', created: '2026-06-20', status: 'active' },
  { id: '2', name: 'Development Sandbox', token: 'vk_test_521bc2ea812f00acdd27e80f9012', created: '2026-06-25', status: 'active' }
];

export const ApiKeysPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revealMap, setRevealMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('https://api.vok2z.com/v1/webhook');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Pagination States
  const [showSearch, setShowSearch] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [filters, setFilters] = useState({
    keyName: '',
    status: '',
  });

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({
      keyName: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const randomSuffix = Math.random().toString(36).substring(2, 14);
    const newKey: ApiKey = {
      id: String(keys.length + 1),
      name: newKeyName,
      token: `vk_live_${randomSuffix}`,
      created: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    setKeys([newKey, ...keys]);
    setNewKeyName('');
    setSuccessMsg(`New API secret key "${newKey.name}" generated successfully.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleRevoke = (id: string) => {
    if (window.confirm('Are you absolutely sure you want to revoke this API access key? Any active server integration using this key will immediately return 401 Unauthorized.')) {
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k));
      setSuccessMsg('API secret key revoked.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      setSelectedIds(filteredKeys.map((k) => k.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkRevoke = () => {
    if (window.confirm(`Revoke the ${selectedIds.length} selected API keys? Connected clients will immediately be disconnected.`)) {
      setKeys((prev) =>
        prev.map((k) => {
          if (selectedIds.includes(k.id)) {
            return { ...k, status: 'revoked' as const };
          }
          return k;
        })
      );
      setSelectedIds([]);
      setSuccessMsg('Selected API access tokens have been revoked.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Key ID,Name,Token,Created Date,Status';
    const rows = filteredKeys.map((k) =>
      `"${k.id}","${k.name.replace(/"/g, '""')}","${k.token}","${k.created}","${k.status}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'api_credentials_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredKeys = keys.filter((k) => {
    if (filters.keyName && !k.name.toLowerCase().includes(filters.keyName.toLowerCase())) return false;
    if (filters.status && k.status !== filters.status) return false;
    return true;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedKeys = filteredKeys.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredKeys.length / pageSize) || 1;

  return (
    <div className="space-y-4 flex-grow flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Active API Keys</div>
            <div className="text-xl font-black text-white">
              {keys.filter((k) => k.status === 'active').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <Key className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold">Total Provisioned</div>
            <div className="text-xl font-black text-white">{keys.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center text-[var(--text-mid)]">
            <Server className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-emerald-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">Gateway Status</div>
            <div className="text-xl font-black text-emerald-400">99.98%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-red-500/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Revoked Access Tokens</div>
            <div className="text-xl font-black text-red-400">
              {keys.filter((k) => k.status === 'revoked').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in slide-in-from-top-1 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Interactive Search Card */}
      {showSearch && (
        <div className="bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm transition-all duration-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">API Key Name</label>
                  <input
                    placeholder="Search by API credential name..."
                    value={filters.keyName}
                    onChange={(e) => handleInputChange('keyName', e.target.value)}
                    className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 transition-all duration-150 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Access Status</label>
                  <Select
                    value={filters.status}
                    onChange={(val) => handleInputChange('status', val)}
                    size="large"
                    className="w-full font-semibold"
                    options={[
                      { value: '', label: 'All credentials' },
                      { value: 'active', label: 'Active Keys' },
                      { value: 'revoked', label: 'Revoked Keys' },
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
                  <label className="text-xs text-[var(--text-mid)] font-semibold select-none whitespace-nowrap min-w-[70px]">Name</label>
                  <input
                    placeholder="Search by credential name..."
                    value={filters.keyName}
                    onChange={(e) => handleInputChange('keyName', e.target.value)}
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

      {/* Main Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow min-h-0">
        {/* Left Side: Keys Table */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between overflow-hidden relative min-h-[400px]">
          {/* Table Toolbar */}
          <div className="flex items-center justify-between min-h-[44px] flex-shrink-0 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none">
              <span>Merchant Access Credentials</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
                {filteredKeys.length} items
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setKeys(initialKeys)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
                title="Reset API Database Keys"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <Tooltip title="Export keys catalog to CSV">
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
                <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>{selectedIds.length}</strong> tokens selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkRevoke}
                  className={`h-8 rounded-lg text-xs px-3 font-semibold transition-all duration-150 cursor-pointer border ${
                    isLight
                      ? 'bg-rose-100/70 border-rose-300 hover:bg-rose-500 hover:text-white text-rose-700'
                      : 'bg-red-500/20 border-red-500/10 hover:bg-red-500 hover:text-white text-red-400'
                  }`}
                >
                  Revoke Selected Keys
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
                      checked={filteredKeys.length > 0 && selectedIds.length === filteredKeys.length}
                      onChange={handleAllCheck}
                    />
                  </th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Credential Name</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Access Token</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Generated Date</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none">Status</th>
                  <th className="px-4 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-xs text-white">
                {paginatedKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-dim)] select-none">
                      No credentials match search parameters.
                    </td>
                  </tr>
                ) : (
                  paginatedKeys.map((k) => {
                    const isRevealed = !!revealMap[k.id];
                    const isRevoked = k.status === 'revoked';
                    return (
                      <tr key={k.id} className="hover:bg-white/2 transition-colors duration-100">
                        <td className="w-12 px-4 py-3.5 text-center">
                          <Checkbox
                            checked={selectedIds.includes(k.id)}
                            onChange={(checked) => handleRowCheck(k.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white truncate max-w-[150px]" title={k.name}>
                          {k.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-dim)] font-medium">
                              {isRevealed ? k.token : '••••••••••••••••••••••••••••'}
                            </span>
                            {!isRevoked && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setRevealMap(prev => ({ ...prev, [k.id]: !prev[k.id] }))}
                                  className="text-[var(--text-dim)] hover:text-white cursor-pointer transition-colors"
                                  title={isRevealed ? "Hide token text" : "Reveal token text"}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleCopy(k.id, k.token)}
                                  className="text-[var(--text-dim)] hover:text-white cursor-pointer transition-colors"
                                  title="Copy token string"
                                >
                                  {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-dim)]">
                          {k.created}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            !isRevoked
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-[12px]">
                          {!isRevoked ? (
                            <button
                              onClick={() => handleRevoke(k.id)}
                              className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-[var(--text-dim)] italic select-none">Inactive</span>
                          )}
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
              Showing <strong className="text-[var(--text-mid)]">{Math.min(startIndex + 1, filteredKeys.length)}</strong> to{' '}
              <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, filteredKeys.length)}</strong> of{' '}
              <strong className="text-[var(--text-mid)]">{filteredKeys.length}</strong> records
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

        {/* Right Side: Generate key & Webhook details */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 h-full">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none mb-4">
              <Key className="w-4 h-4 text-[var(--indigo)]" />
              <span>Token Provision Terminal</span>
            </h3>

            <div className="space-y-4">
              {/* Key generator form */}
              <form onSubmit={handleGenerate} className="space-y-3 bg-white/2 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] text-[var(--indigo)] font-black uppercase tracking-widest block mb-1">Generate API Token</span>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Integration / App Name</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. My Website Bot"
                    className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
                  />
                </div>
                <Button type="submit" className="w-full h-10 text-xs font-bold uppercase select-none">
                  Generate Key
                </Button>
              </form>

              {/* Webhook endpoint */}
              <div className="space-y-3 bg-white/2 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] text-[var(--indigo)] font-black uppercase tracking-widest block mb-1">Webhook Dispatcher</span>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-mid)] font-semibold select-none">Destination Payload URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full h-10 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-mono font-bold"
                  />
                </div>
                <button
                  onClick={() => {
                    setSuccessMsg('Webhook endpoint successfully verified with response status 200 OK.');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  className="w-full h-10 rounded-xl bg-white/4 hover:bg-white/8 border border-[var(--border)] text-xs text-white font-bold transition-all cursor-pointer uppercase select-none"
                >
                  Test Connection
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-dim)] select-none italic text-center pt-4 border-t border-white/5">
            Security tokens should never be committed to repository codebases. Rotations are recommended every 90 days.
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  Settings as GridIcon,
  Trash2,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Pin,
  GripVertical,
} from 'lucide-react';
import { Role, ColumnSetting } from '../../types';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';
import { AddRoleModal } from './AddRoleModal';
import { Select, Tooltip } from 'antd';
import { useTheme } from '../../context/ThemeContext';

interface DataTableProps {
  roles: Role[];
  onRolesChange: (updatedRoles: Role[]) => void;
  id?: string;
  showSearch?: boolean;
  onToggleSearch?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const defaultColumns: ColumnSetting[] = [
  { id: 'name', label: 'Role name', visible: true, pinned: false },
  { id: 'id', label: 'Role ID', visible: true, pinned: false },
  { id: 'status', label: 'Status', visible: true, pinned: false },
  { id: 'remark', label: 'Remark', visible: true, pinned: false },
  { id: 'created', label: 'Created', visible: true, pinned: false },
  { id: 'actions', label: 'Actions', visible: true, pinned: 'right' },
];

export const DataTable: React.FC<DataTableProps> = ({
  roles,
  onRolesChange,
  id,
  showSearch,
  onToggleSearch,
  isFullscreen: isFullscreenProp,
  onToggleFullscreen,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
  const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : localIsFullscreen;
  const toggleFullscreen = onToggleFullscreen !== undefined ? onToggleFullscreen : () => setLocalIsFullscreen(!localIsFullscreen);
  const applyFixedFullscreen = isFullscreenProp === undefined && isFullscreen;
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedRemarkIds, setExpandedRemarkIds] = useState<Record<string, boolean>>({});

  // Column settings state
  const [colSettingsOpen, setColSettingsOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnSetting[]>(defaultColumns);
  const [tempColumns, setTempColumns] = useState<ColumnSetting[]>(defaultColumns);

  const colSettingsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch Select Options State
  const [batchSelectDropdownOpen, setBatchSelectDropdownOpen] = useState(false);
  const batchSelectDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll Shadow state for sticky columns
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrolledLeft, setScrolledLeft] = useState(false);
  const [scrolledRight, setScrolledRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrolledL = el.scrollLeft > 0;
      const isScrolledR = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
      setScrolledLeft(isScrolledL);
      setScrolledRight(isScrolledR);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrolledL = target.scrollLeft > 0;
    const isScrolledR = target.scrollLeft < target.scrollWidth - target.clientWidth - 2;
    setScrolledLeft(isScrolledL);
    setScrolledRight(isScrolledR);
  };

  // Check scroll whenever roles, columns, fullscreen, or mount state changes
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [roles, columns, isFullscreen]);

  // Handle outside click for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colSettingsRef.current && !colSettingsRef.current.contains(target)) {
        setColSettingsOpen(false);
      }
      if (batchSelectDropdownRef.current && !batchSelectDropdownRef.current.contains(target)) {
        setBatchSelectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleRowCheck = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, roleId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const handleAllCheck = (checked: boolean) => {
    if (checked) {
      setSelectedIds(roles.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleStatus = (roleId: string) => {
    const updated = roles.map((r) =>
      r.id === roleId
        ? { ...r, status: r.status === 'enabled' ? ('disabled' as const) : ('enabled' as const) }
        : r
    );
    onRolesChange(updated);
  };

  const handleDeleteRow = (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      const updated = roles.filter((r) => r.id !== roleId);
      onRolesChange(updated);
      setSelectedIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const handleAddRole = (newRole: Role) => {
    onRolesChange([...roles, newRole]);
  };

  // Bulk operations
  const handleBulkEnable = () => {
    const updated = roles.map((r) =>
      selectedIds.includes(r.id) ? { ...r, status: 'enabled' as const } : r
    );
    onRolesChange(updated);
  };

  const handleBulkDisable = () => {
    const updated = roles.map((r) =>
      selectedIds.includes(r.id) ? { ...r, status: 'disabled' as const } : r
    );
    onRolesChange(updated);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete the ${selectedIds.length} selected roles?`)) {
      const updated = roles.filter((r) => !selectedIds.includes(r.id));
      onRolesChange(updated);
      setSelectedIds([]);
    }
  };

  // CSV Export Utility
  const handleExportCSV = (rowsToExport = roles) => {
    const visibleCols = columns.filter((c) => c.visible && c.id !== 'actions');
    const headers = visibleCols.map((c) => c.label).join(',');
    const rows = rowsToExport.map((row) => {
      return visibleCols
        .map((c) => {
          const val = row[c.id as keyof Role] || '';
          return `"${val.toString().replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'roles_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkExport = () => {
    const rowsToExport = roles.filter((r) => selectedIds.includes(r.id));
    handleExportCSV(rowsToExport);
  };

  // CSV Import Utility
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(
        `Importing "${file.name}"... In a full production environment, this CSV file would be parsed on the client or sent to an API endpoint to insert records.`
      );
      e.target.value = ''; // Reset input
    }
  };

  // Column settings actions
  const openColSettings = () => {
    setTempColumns([...columns]);
    setColSettingsOpen(true);
  };

  const handleTempColCheck = (id: string, checked: boolean) => {
    setTempColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: checked } : c)));
  };

  const handleTempAllColCheck = (checked: boolean) => {
    setTempColumns((prev) => prev.map((c) => ({ ...c, visible: checked })));
  };

  const applyColumnSettings = () => {
    setColumns([...tempColumns]);
    setColSettingsOpen(false);
  };

  const restoreDefaultColumns = () => {
    setColumns(defaultColumns);
    setTempColumns(defaultColumns);
    setColSettingsOpen(false);
  };

  const isColVisible = (colId: string) => {
    return columns.find((c) => c.id === colId)?.visible !== false;
  };

  const getChineseLabel = (colId: string) => {
    const map: Record<string, string> = {
      name: '角色名称',
      id: '角色ID',
      status: '状态',
      remark: '备注',
      created: '创建时间',
      actions: '操作',
    };
    return map[colId] || colId;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(sourceIndex)) return;
    const updated = [...tempColumns];
    const [movedItem] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setTempColumns(updated);
  };

  const handleTogglePin = (colId: string, side: 'left' | 'right') => {
    setTempColumns((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          const currentPin = c.pinned;
          const targetPin = currentPin === side ? false : side;
          return { ...c, pinned: targetPin };
        }
        return c;
      })
    );
  };

  const renderCell = (row: Role, colId: string) => {
    switch (colId) {
      case 'name':
        return (
          <span className="text-sm font-semibold text-[var(--text)]">
            {row.name}
          </span>
        );
      case 'id':
        return (
          <span className="font-mono text-[var(--text-dim)]">
            {row.id}
          </span>
        );
      case 'status':
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(row.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-all duration-150 ${
              row.status === 'enabled'
                ? 'bg-[var(--indigo)] text-white shadow-sm shadow-[var(--indigo)]/20'
                : 'bg-white/6 text-[var(--text-dim)]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                row.status === 'enabled'
                  ? 'bg-white shadow-[0_0_6px_var(--indigo-glow)]'
                  : 'bg-[var(--text-dim)]'
              }`}
            />
            {row.status === 'enabled' ? 'Enabled' : 'Disabled'}
          </button>
        );
      case 'remark': {
        const isExpanded = !!expandedRemarkIds[row.id];
        return (
          <Tooltip title={isExpanded ? 'Click to show less' : 'Click to see full content'}>
            <span
              onClick={() => {
                setExpandedRemarkIds((prev) => ({
                  ...prev,
                  [row.id]: !prev[row.id],
                }));
              }}
              className={`text-xs text-[var(--text-dim)] leading-relaxed block cursor-pointer transition-all duration-200 select-none ${
                isExpanded ? 'whitespace-normal break-words max-w-[450px]' : 'max-w-[340px] truncate'
              }`}
            >
              {row.remark}
            </span>
          </Tooltip>
        );
      }
      case 'created':
        return (
          <span className="text-xs text-[var(--text-dim)]">
            {row.created}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => alert(`Edit role: ${row.name}`)}
              className="text-[var(--indigo)] hover:text-indigo-300 transition-colors duration-150 cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={() => alert(`Details for: ${row.name}\nID: ${row.id}`)}
              className="text-[var(--indigo)] hover:text-indigo-300 transition-colors duration-150 cursor-pointer"
            >
              Detail
            </button>
            <button
              onClick={() => handleDeleteRow(row.id)}
              className="text-red-400 hover:text-red-300 transition-colors duration-150 cursor-pointer"
            >
              Delete
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(roles.length / pageSize);

  // Reset page to 1 if it is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [roles.length, pageSize, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRoles = roles.slice(startIndex, startIndex + pageSize);
  const hasPinnedLeft = columns.some((c) => c.visible && c.pinned === 'left');

  return (
    <div
      id={id}
      className={`bg-[var(--panel)] rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-0 overflow-hidden relative ${
        applyFixedFullscreen ? 'fixed inset-0 z-[250] m-0 rounded-none p-6' : ''
      }`}
    >
      {/* Table Toolbar */}
      <div className="flex items-center justify-between mb-4 min-h-[44px]">
        <h2 className="text-sm font-bold text-[var(--text)] select-none flex items-center gap-2">
          Role list
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
            {roles.length} total
          </span>
        </h2>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <span className="text-base leading-none mr-1">+</span> New role
          </Button>

          <Tooltip title="Export all to CSV">
            <button
              onClick={() => handleExportCSV()}
              className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip title="Import Roles from CSV">
            <button
              onClick={handleImportClick}
              className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            style={{ display: 'none' }}
            accept=".csv"
          />

          {onToggleSearch && (
            <Tooltip title={showSearch ? 'Hide Search Filters' : 'Show Search Filters'}>
              <button
                onClick={onToggleSearch}
                className={`w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] cursor-pointer transition-colors duration-150 ${
                  showSearch
                    ? 'border-[var(--indigo)]/50 text-[var(--indigo)] bg-[var(--indigo)]/10 hover:text-[var(--indigo)]'
                    : 'hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>

          {/* Column Settings Trigger Dropdown */}
          <div className="relative" ref={colSettingsRef}>
            <Tooltip title="Configure Columns">
              <button
                onClick={colSettingsOpen ? () => setColSettingsOpen(false) : openColSettings}
                className={`w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150 ${
                  colSettingsOpen ? 'border-[var(--indigo)] border-opacity-50 text-white bg-white/5' : ''
                }`}
              >
                <GridIcon className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {colSettingsOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-[290px] bg-[#0d0d14]/95 border border-white/10 rounded-xl shadow-[0_24px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl z-[120] overflow-hidden select-none">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 font-bold text-xs text-[var(--text)] bg-white/[0.02]">
                  <Checkbox
                    checked={tempColumns.every((c) => c.visible)}
                    onChange={handleTempAllColCheck}
                  />
                  全部 / All Columns
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 scrollbar-none">
                  {tempColumns.map((c, idx) => {
                    const isPinnedLeft = c.pinned === 'left';
                    const isPinnedRight = c.pinned === 'right';
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 bg-white/[0.01] border border-transparent hover:border-white/5 transition-all duration-150 group cursor-default select-none"
                      >
                        <div className="flex items-center gap-3 text-xs text-white">
                          <Checkbox
                            checked={c.visible}
                            onChange={(checked) => handleTempColCheck(c.id, checked)}
                          />
                          <div className="text-white/20 group-hover:text-white/40 cursor-grab active:cursor-grabbing p-0.5" title="Drag to reorder">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col select-none leading-none">
                            <span className="text-xs font-semibold text-white/95">{getChineseLabel(c.id)}</span>
                            <span className="text-[10px] text-[var(--text-dim)] mt-1 font-medium">{c.label}</span>
                          </div>
                        </div>
                        
                        {/* Pin buttons aligned to the right side */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(c.id, 'left')}
                            title="Pin to left (sticky left)"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isPinnedLeft
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'text-white/20 hover:text-white/60 hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5 -rotate-45" />
                          </button>
                          <button
                            onClick={() => handleTogglePin(c.id, 'right')}
                            title="Pin to right (sticky right)"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isPinnedRight
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'text-white/20 hover:text-white/60 hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-[11px] bg-white/[0.01]">
                  <button
                    onClick={restoreDefaultColumns}
                    className="text-[var(--text-dim)] hover:text-white font-semibold transition-colors cursor-pointer"
                  >
                    恢复默认 / Reset
                  </button>
                  <div className="flex items-center gap-3 font-semibold">
                    <button
                      onClick={() => setColSettingsOpen(false)}
                      className="text-[var(--text-dim)] hover:text-white font-semibold transition-colors cursor-pointer"
                    >
                      取消 / Cancel
                    </button>
                    <button
                      onClick={applyColumnSettings}
                      className="text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
                    >
                      确认 / Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center select-none animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--indigo)] to-indigo-500/20 rounded-full blur-2xl opacity-15 animate-pulse" />
            <div className="w-24 h-24 rounded-full border border-dashed border-white/10 flex items-center justify-center animate-[spin_40s_linear_infinite]">
              <div className="w-18 h-18 rounded-full border border-white/5 border-dashed" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1b1b29] to-[#0f0f17] border border-white/10 flex items-center justify-center text-[var(--indigo)] shadow-xl shadow-black/40">
                <ShieldAlert className="w-6 h-6 animate-[bounce_3s_infinite]" />
              </div>
            </div>
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-60 animate-ping" />
            <div className="absolute bottom-3 left-1 w-1 h-1 rounded-full bg-indigo-300 opacity-40 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">No custom roles defined yet</h3>
          <p className="text-xs text-[var(--text-dim)] max-w-sm mb-6 leading-relaxed">
            Create custom roles to manage permission mappings, control access visibility policies, and audit administrative actions across the network.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-lg shadow-[var(--indigo)]/10 text-xs font-bold"
          >
            <span className="text-lg leading-none mr-1">+</span> Add Your First Role
          </Button>
        </div>
      ) : (
        <>
          {/* Main Grid View Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-lg scrollbar-none ${
              scrolledLeft ? 'has-scrolled-left' : ''
            } ${scrolledRight ? 'has-scrolled-right' : ''}`}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`sticky top-0 left-0 z-30 w-20 pl-4.5 pr-3 py-3.5 border-b border-[var(--border)] text-left select-none table-sticky-cell ${!hasPinnedLeft ? 'table-sticky-left' : ''}`}>
                    <div className="flex items-center gap-1.5 relative" ref={batchSelectDropdownRef}>
                      <Checkbox
                        checked={roles.length > 0 && selectedIds.length === roles.length}
                        onChange={handleAllCheck}
                      />
                      <div className="relative flex items-center justify-center">
                        <button
                          onClick={() => setBatchSelectDropdownOpen(!batchSelectDropdownOpen)}
                          className={`w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center text-[var(--text-dim)] hover:text-white transition-all cursor-pointer ${
                            batchSelectDropdownOpen ? 'bg-white/10 text-white' : ''
                          }`}
                          title="Batch Selection Options"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {batchSelectDropdownOpen && (
                          <div className="absolute top-6 left-0 w-40 bg-[#0f0f17] border border-white/10 rounded-xl shadow-xl py-1 z-[130] animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={() => {
                                setSelectedIds(roles.map((r) => r.id));
                                setBatchSelectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer block"
                            >
                              All
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds([]);
                                setBatchSelectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer block"
                            >
                              None
                            </button>
                            <div className="h-[1px] bg-white/5 my-1" />
                            <button
                              onClick={() => {
                                setSelectedIds(roles.filter((r) => r.status === 'enabled').map((r) => r.id));
                                setBatchSelectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--text-mid)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2 block"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Enabled only
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds(roles.filter((r) => r.status === 'disabled').map((r) => r.id));
                                setBatchSelectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--text-mid)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2 block"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Disabled only
                            </button>
                            <div className="h-[1px] bg-white/5 my-1" />
                            <button
                              onClick={() => {
                                setSelectedIds((prev) => roles.map((r) => r.id).filter((id) => !prev.includes(id)));
                                setBatchSelectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer block"
                            >
                              Invert Selection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  {columns
                    .filter((c) => c.visible)
                    .map((c) => {
                      const isPinnedLeft = c.pinned === 'left';
                      const isPinnedRight = c.pinned === 'right';
                      
                      let stickyClass = "sticky top-0 z-20";
                      
                      if (isPinnedLeft) {
                        stickyClass = "sticky top-0 left-20 z-30 table-sticky-cell table-sticky-left";
                      } else if (isPinnedRight) {
                        stickyClass = "sticky top-0 right-0 z-30 table-sticky-cell table-sticky-right";
                      }
                      
                      return (
                        <th
                          key={c.id}
                          className={`${stickyClass} px-4.5 py-3.5 border-b border-[var(--border)] text-left text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider select-none whitespace-nowrap`}
                        >
                          {c.label}
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {paginatedRoles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length + 1}
                      className="px-4.5 py-16 text-center text-sm text-[var(--text-dim)] select-none animate-in fade-in"
                    >
                      No roles match the search criteria. Click reset to see all roles.
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((row) => {
                    const isChecked = selectedIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className="group hover:bg-white/[0.035] transition-colors duration-150 border-b border-white/5 last:border-b-0 even:bg-white/[0.005]"
                      >
                        <td className={`sticky left-0 z-20 w-20 pl-4.5 pr-3 py-3 border-b border-white/5 transition-all duration-150 table-sticky-cell ${!hasPinnedLeft ? 'table-sticky-left' : ''}`}>
                          <Checkbox
                            checked={isChecked}
                            onChange={(checked) => handleRowCheck(row.id, checked)}
                          />
                        </td>
                        {columns
                          .filter((c) => c.visible)
                          .map((c) => {
                            const isPinnedLeft = c.pinned === 'left';
                            const isPinnedRight = c.pinned === 'right';
                            
                            let stickyClass = "";
                            if (isPinnedLeft) {
                              stickyClass = "sticky left-20 z-10 transition-all duration-150 table-sticky-cell table-sticky-left";
                            } else if (isPinnedRight) {
                              stickyClass = "sticky right-0 z-10 transition-all duration-150 table-sticky-cell table-sticky-right";
                            }
                            
                            return (
                              <td
                                key={c.id}
                                className={`${stickyClass} px-4.5 py-3 text-xs whitespace-nowrap align-middle`}
                              >
                                {renderCell(row, c.id)}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Premium Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4.5 border-t border-[var(--border)] text-xs select-none">
            {/* Left: Total Records Info */}
            <div className="text-[var(--text-dim)] font-semibold">
              Showing <span className="text-white font-bold">{roles.length > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="text-white font-bold">
                {Math.min(startIndex + pageSize, roles.length)}
              </span> of <span className="text-white font-bold">{roles.length}</span> records
            </div>

            {/* Right: Controls (Limit selector + Page buttons) */}
            <div className="flex flex-wrap items-center gap-4.5">
              {/* Limit / Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-dim)] font-semibold">Show</span>
                <Select
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                  className="w-[110px]"
                  options={[
                    { value: 5, label: '5 / page' },
                    { value: 10, label: '10 / page' },
                    { value: 20, label: '20 / page' },
                    { value: 50, label: '50 / page' },
                    { value: 100, label: '100 / page' },
                  ]}
                />
              </div>

              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-white/3 border border-[var(--border)] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)] transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)] transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                      );
                    })
                    .map((p, index, arr) => {
                      const showEllipsisBefore = index > 0 && p - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsisBefore && (
                            <span className="text-[var(--text-dim)] px-1 select-none">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentPage === p
                                ? 'bg-[var(--indigo)] text-white shadow-sm shadow-[var(--indigo)]/20'
                                : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)] transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)] transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Premium Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div 
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl px-5 py-3 backdrop-blur-xl z-[150] flex items-center gap-5 animate-in slide-in-from-bottom-5 fade-in duration-200 ${
            isLight
              ? 'bg-white/95 border border-slate-200 shadow-[0_20px_40px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.04)]'
              : 'bg-[#0c0c14]/95 border border-[var(--indigo)]/40 shadow-[0_24px_50px_rgba(0,0,0,0.7)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--indigo)] animate-pulse" />
            <span 
              className={`text-xs font-semibold whitespace-nowrap ${
                isLight ? 'text-slate-500' : 'text-[var(--text-dim)]'
              }`}
            >
              <strong className={isLight ? 'text-slate-900 text-sm mr-1' : 'text-white text-sm mr-1'}>
                {selectedIds.length}
              </strong> 
              selected
            </span>
          </div>
          <div className={`w-[1px] h-5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBulkEnable}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border ${
                isLight
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100/70 shadow-sm'
                  : 'bg-[var(--indigo-dim)] border-[var(--indigo)]/20 hover:border-[var(--indigo)]/50 hover:bg-[var(--indigo)]/15 text-[var(--indigo)] hover:text-white'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Enable
            </button>
            <button
              onClick={handleBulkDisable}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border ${
                isLight
                  ? 'bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-sm'
                  : 'bg-white/4 border border-white/5 hover:border-white/20 hover:bg-white/8 text-[var(--text-mid)] hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Disable
            </button>
            <button
              onClick={handleBulkExport}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border ${
                isLight
                  ? 'bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-sm'
                  : 'bg-white/4 border border-white/5 hover:border-white/20 hover:bg-white/8 text-[var(--text-mid)] hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleBulkDelete}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border ${
                isLight
                  ? 'bg-rose-50 border-rose-200 hover:border-rose-400 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 shadow-sm'
                  : 'bg-red-500/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 text-red-400 hover:text-red-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
          <div className={`w-[1px] h-5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
          <button
            onClick={() => setSelectedIds([])}
            className={`text-xs font-semibold hover:underline cursor-pointer transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-[var(--text-dim)] hover:text-white'
            }`}
          >
            Clear
          </button>
        </div>
      )}

      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddRole}
      />
    </div>
  );
};

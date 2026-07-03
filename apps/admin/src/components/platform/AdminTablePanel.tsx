import type { ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Select, Tooltip } from 'antd';
import { Checkbox } from '@/components/atoms/Checkbox';
import { useTheme } from '@/context/ThemeContext';

export interface AdminTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface AdminTablePanelProps<T> {
  title: string;
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  totalCount: number;
  isLoading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleRow?: (id: string, checked: boolean) => void;
  onToggleAll?: (checked: boolean) => void;
  toolbarActions?: ReactNode;
  onRefresh?: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  startIndex: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onExport?: () => void;
}

export function AdminTablePanel<T>({
  title,
  columns,
  rows,
  rowKey,
  totalCount,
  isLoading = false,
  emptyMessage = 'No records found.',
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  toolbarActions,
  onRefresh,
  showFilters,
  onToggleFilters,
  pageSize,
  onPageSizeChange,
  currentPage,
  onPageChange,
  totalPages,
  startIndex,
  isFullscreen = false,
  onToggleFullscreen,
  onExport,
}: AdminTablePanelProps<T>) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const panel = (
    <div className="flex-1 min-h-0 bg-[var(--panel)] rounded-2xl p-5 border border-[var(--border)] shadow-sm flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 min-h-[44px] flex-shrink-0">
        <h2 className="text-sm font-bold text-[var(--text)] select-none flex items-center gap-2">
          {title}
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[var(--text-dim)] font-medium">
            {totalCount} total
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {toolbarActions}
          {onExport ? (
            <Tooltip title="Export to CSV">
              <button
                type="button"
                onClick={onExport}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          ) : null}
          {onRefresh ? (
            <Tooltip title="Refresh">
              <button
                type="button"
                onClick={onRefresh}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          ) : null}
          {onToggleFilters ? (
            <Tooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
              <button
                type="button"
                onClick={onToggleFilters}
                className={`w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] cursor-pointer transition-colors duration-150 ${
                  showFilters
                    ? 'border-[var(--indigo)]/50 text-[var(--indigo)] bg-[var(--indigo)]/10 hover:text-[var(--indigo)]'
                    : 'hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          ) : null}
          {onToggleFullscreen ? (
            <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="w-8 h-8 rounded-lg border border-[var(--border)] hover:border-[var(--indigo)] hover:border-opacity-50 bg-white/2 hover:bg-white/5 flex items-center justify-center text-[var(--text-mid)] hover:text-white cursor-pointer transition-colors duration-150"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {selectable && selectedIds.length > 0 ? (
        <div
          className={`border rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-shrink-0 ${
            isLight
              ? 'bg-indigo-50/80 border-indigo-200/60'
              : 'bg-[var(--indigo-dim)]/50 border border-[var(--indigo)]/20'
          }`}
        >
          <span className={`text-xs font-semibold ${isLight ? 'text-indigo-950' : 'text-white'}`}>
            <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-white font-bold'}>
              {selectedIds.length}
            </strong>{' '}
            selected
          </span>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto min-h-0 border border-white/5 rounded-xl relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--panel)]/80 z-10">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-mid)]" />
          </div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              {selectable ? (
                <th className="w-12 px-4 py-3.5 border-b border-white/8 text-center select-none">
                  <Checkbox checked={allSelected} onChange={(checked) => onToggleAll?.(checked)} />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`px-5 py-3.5 border-b border-white/8 text-xs font-bold text-[var(--text-mid)] uppercase select-none ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-xs text-[var(--text)]">
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center text-xs text-[var(--text-dim)] select-none"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                return (
                  <tr key={id} className="hover:bg-white/2 transition-colors duration-100">
                    {selectable ? (
                      <td className="w-12 px-4 py-3.5 text-center">
                        <Checkbox
                          checked={selectedIds.includes(id)}
                          onChange={(checked) => onToggleRow?.(id, checked)}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.id} className={`px-5 py-3.5 ${col.className ?? ''}`}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 flex-shrink-0 select-none">
        <div className="text-[12.5px] font-semibold text-[var(--text-dim)]">
          Showing{' '}
          <strong className="text-[var(--text-mid)]">
            {totalCount === 0 ? 0 : Math.min(startIndex + 1, totalCount)}
          </strong>{' '}
          to <strong className="text-[var(--text-mid)]">{Math.min(startIndex + pageSize, totalCount)}</strong> of{' '}
          <strong className="text-[var(--text-mid)]">{totalCount}</strong> records
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)] font-bold">Show</span>
            <Select
              value={pageSize}
              onChange={onPageSizeChange}
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
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3.5 text-xs text-[var(--text)] font-bold select-none">
              Page {currentPage} of {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-mid)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-mid)] transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return panel;
}

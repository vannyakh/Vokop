import { useMemo, useState } from 'react';

interface UseClientTableOptions<T> {
  rows: T[];
  getRowId: (row: T) => string;
  initialPageSize?: number;
  filterFn?: (row: T, filters: Record<string, string>) => boolean;
}

export function useClientTable<T>({
  rows,
  getRowId,
  initialPageSize = 20,
  filterFn,
}: UseClientTableOptions<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const filteredRows = useMemo(() => {
    if (!filterFn) return rows;
    return rows.filter((row) => filterFn(row, filters));
  }, [rows, filters, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)));
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredRows.map(getRowId) : []);
  };

  const clearSelection = () => setSelectedIds([]);

  return {
    filters,
    setFilter,
    resetFilters,
    filteredRows,
    paginatedRows,
    totalCount: filteredRows.length,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    startIndex,
    selectedIds,
    toggleRow,
    toggleAll,
    clearSelection,
    showFilters,
    setShowFilters,
  };
}

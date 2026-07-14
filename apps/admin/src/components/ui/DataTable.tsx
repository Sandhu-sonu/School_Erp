'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Eye, EyeOff, Search, ArrowUpDown, Download, Printer, Settings } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  pinned?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  exportFileName?: string;
  defaultRowsPerPage?: number;
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  bulkActions?: (selectedRows: T[]) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  searchKey,
  exportFileName = 'export',
  defaultRowsPerPage = 10,
  rowKey,
  onRowClick,
  bulkActions
}: DataTableProps<T>) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [density, setDensity] = useState<'compact' | 'default' | 'spacious'>('default');
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [activeFocusedRowIndex, setActiveFocusedRowIndex] = useState(-1);

  const tableRef = useRef<HTMLTableElement>(null);

  const getRowId = (row: T) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveFocusedRowIndex((prev) => Math.min(prev + 1, processedData.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveFocusedRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && activeFocusedRowIndex >= 0) {
        e.preventDefault();
        const selectedRow = processedData[activeFocusedRowIndex];
        if (selectedRow && onRowClick) onRowClick(selectedRow);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, activeFocusedRowIndex]);

  // Search & Filter
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      if (searchKey) {
        return String(row[searchKey] || '').toLowerCase().includes(term);
      }
      return Object.values(row).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchKey]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return sorted;
  }, [filteredData, sortKey, sortDirection]);

  // Pagination bounds
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const processedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleColumnHide = (key: string) => {
    setHiddenColumns(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(processedData.map(r => getRowId(r)));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const visibleCols = columns.filter(c => !hiddenColumns.includes(c.key as string));
    const headerRow = visibleCols.map(c => c.header).join(',');
    const rows = sortedData.map(row =>
      visibleCols.map(c => {
        const val = row[c.key as string];
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paddingClasses = {
    compact: 'px-2 py-1 text-[11px]',
    default: 'px-3.5 py-2.5 text-xs',
    spacious: 'px-5 py-4 text-sm'
  };

  return (
    <div className="space-y-4">
      {/* Top action grid */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        {/* Configurations, density, hide/show cols */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end text-xs font-semibold text-slate-655 relative">
          {bulkActions && selectedRows.length > 0 && (
            <div className="mr-auto sm:mr-0">
              {bulkActions(data.filter(r => selectedRows.includes(getRowId(r))))}
            </div>
          )}

          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-1.5 py-2 px-3 border border-slate-200 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 py-2 px-3 border border-slate-200 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>

          {/* Density selection */}
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as any)}
            className="py-2 px-3 border border-slate-200 bg-white rounded-xl shadow-sm focus:outline-none"
          >
            <option value="compact">Compact View</option>
            <option value="default">Default Padding</option>
            <option value="spacious">Spacious padding</option>
          </select>

          {/* Config dropdown toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 border border-slate-200 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showConfig && (
            <div className="absolute right-0 top-10 bg-white border border-slate-200 shadow-2xl p-4 rounded-2xl z-25 w-48 text-left space-y-2.5">
              <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wide border-b border-slate-100 pb-1">Toggle Columns</h5>
              {columns.map((c) => (
                <div key={c.key as string} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`col-${c.key as string}`}
                    checked={!hiddenColumns.includes(c.key as string)}
                    onChange={() => toggleColumnHide(c.key as string)}
                    className="rounded text-primary border-slate-350 focus:ring-primary/50 cursor-pointer h-3.5 w-3.5"
                  />
                  <label htmlFor={`col-${c.key as string}`} className="cursor-pointer text-[10px] font-semibold text-slate-655 select-none">
                    {c.header}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto relative">
        <table ref={tableRef} className="w-full border-collapse text-left select-none">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur z-10">
              {bulkActions && (
                <th className="p-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={processedData.length > 0 && selectedRows.length === processedData.length}
                    className="rounded border-slate-300 text-primary focus:ring-primary/50 cursor-pointer h-4 w-4"
                  />
                </th>
              )}
              {columns.map((c) => {
                if (hiddenColumns.includes(c.key as string)) return null;
                const isPinned = c.pinned;
                return (
                  <th
                    key={c.key as string}
                    onClick={() => c.sortable !== false && handleSort(c.key as string)}
                    className={`p-3.5 font-bold ${
                      c.sortable !== false ? 'cursor-pointer hover:bg-slate-150 transition-colors' : ''
                    } ${isPinned ? 'sticky left-0 bg-slate-50/90 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{c.header}</span>
                      {c.sortable !== false && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="p-8 text-center text-slate-400">
                  No matching records found.
                </td>
              </tr>
            ) : (
              processedData.map((row, idx) => {
                const id = getRowId(row);
                const isSelected = selectedRows.includes(id);
                const isFocused = idx === activeFocusedRowIndex;
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''
                    } ${isFocused ? 'ring-2 ring-primary/20 bg-slate-50/80' : ''}`}
                  >
                    {bulkActions && (
                      <td 
                        onClick={(e) => e.stopPropagation()} 
                        className="p-3 text-center"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/50 cursor-pointer h-4 w-4"
                        />
                      </td>
                    )}
                    {columns.map((c) => {
                      if (hiddenColumns.includes(c.key as string)) return null;
                      const isPinned = c.pinned;
                      return (
                        <td
                          key={c.key as string}
                          className={`${paddingClasses[density]} ${
                            isPinned ? 'sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
                          }`}
                        >
                          {c.render ? c.render(row) : String(row[c.key as string] || '')}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-455 pt-2">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="py-1 px-3 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="py-1 px-3 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default DataTable;

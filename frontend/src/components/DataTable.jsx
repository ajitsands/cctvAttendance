// frontend/src/components/DataTable.jsx
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Download, 
  X,
  FileSpreadsheet
} from 'lucide-react';

/**
 * Universal High-Performance DataTable Component
 * Features:
 * - Ultra-fast client-side search across all columns or specific keys
 * - Multi-direction column sorting (Ascending, Descending, None)
 * - Pagination with selectable page sizes (10, 25, 50, 100)
 * - Detailed entry counter ("Showing 1 to 10 of 45 entries")
 * - 1-Click CSV / Excel Export
 * - Full theme compatibility (Light & Dark mode, custom accents)
 */
export default function DataTable({
  columns = [],
  data = [],
  defaultSortKey = '',
  defaultSortDir = 'asc',
  searchPlaceholder = 'Search records...',
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  exportFileName = 'datatable_export',
  exportable = true,
  loading = false,
  emptyMessage = 'No matching records found.',
  rowKey = 'id',
  tableActions = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 on search or page size change
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val) => {
    setPageSize(Number(val));
    setCurrentPage(1);
  };

  // Toggle sorting
  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey('');
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // 1. Filtered data with fast memoization
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((row) => {
      // Check each column
      for (const col of columns) {
        let val = '';
        if (typeof col.accessor === 'function') {
          val = col.accessor(row);
        } else if (col.key) {
          val = row[col.key];
        }

        if (val !== null && val !== undefined) {
          if (String(val).toLowerCase().includes(term)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [data, searchTerm, columns]);

  // 2. Sorted data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    const colDef = columns.find(c => c.key === sortKey);

    return [...filteredData].sort((a, b) => {
      let valA = typeof colDef?.accessor === 'function' ? colDef.accessor(a) : a[sortKey];
      let valB = typeof colDef?.accessor === 'function' ? colDef.accessor(b) : b[sortKey];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      // Number comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  // 3. Paginated slice
  const totalEntries = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  // Export CSV function
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`);
    const rows = sortedData.map(row => {
      return columns.map(c => {
        let val = typeof c.accessor === 'function' ? c.accessor(row) : (row[c.key] ?? '');
        if (typeof val === 'object') val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEntry = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalEntries);

  // Page numbers generator with smart window
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, safeCurrentPage - delta); i <= Math.min(totalPages - 1, safeCurrentPage + delta); i++) {
      range.push(i);
    }
    if (safeCurrentPage - delta > 2) range.unshift('...');
    if (safeCurrentPage + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  return (
    <div className="datatable-wrapper">
      {/* Top Controls: Length selector, Search input & Action buttons */}
      <div className="datatable-toolbar">
        <div className="datatable-length-group">
          <span>Show</span>
          <select 
            className="datatable-select" 
            value={pageSize} 
            onChange={(e) => handlePageSizeChange(e.target.value)}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span>entries</span>
        </div>

        <div className="datatable-actions-group">
          {tableActions}

          {exportable && (
            <button 
              type="button" 
              className="btn btn-secondary datatable-export-btn"
              onClick={handleExportCSV}
              disabled={totalEntries === 0}
              title="Export Current Table as CSV"
            >
              <FileSpreadsheet size={15} color="var(--menu-accent)" />
              <span>Export CSV</span>
            </button>
          )}

          <div className="datatable-search-container">
            <Search size={15} className="datatable-search-icon" />
            <input 
              type="text" 
              className="datatable-search-input" 
              placeholder={searchPlaceholder} 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                className="datatable-search-clear"
                onClick={() => handleSearchChange('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="table-container datatable-container">
        <table className="datatable-table">
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false && col.key;
                const isSorted = sortKey === col.key;
                return (
                  <th 
                    key={col.key || idx}
                    style={{ 
                      width: col.width, 
                      textAlign: col.align || 'left',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                    onClick={() => isSortable && handleSort(col.key)}
                    className={isSortable ? 'datatable-th-sortable' : ''}
                    title={isSortable ? `Click to sort by ${col.label}` : ''}
                  >
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.45rem',
                      justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start')
                    }}>
                      <span>{col.label ?? col.header}</span>
                      {isSortable && (
                        <span className={`datatable-sort-indicator ${isSorted ? 'active' : ''}`}>
                          {isSorted ? (
                            sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={13} style={{ opacity: 0.35 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-muted)' }}>
                    <span className="live-dot" style={{ background: 'var(--menu-accent)' }}></span>
                    <span style={{ fontWeight: 600 }}>Loading table data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                    <Search size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>{emptyMessage}</p>
                    {searchTerm && (
                      <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                        No records match "<strong>{searchTerm}</strong>".
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const k = typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] || rowIdx);
                return (
                  <tr key={k} className="datatable-row">
                    {columns.map((col, colIdx) => {
                      const cellContent = typeof col.render === 'function' 
                        ? col.render(row, (safeCurrentPage - 1) * pageSize + rowIdx) 
                        : (row[col.key] ?? '--');
                      return (
                        <td 
                          key={col.key || colIdx}
                          style={{ textAlign: col.align || 'left' }}
                        >
                          {cellContent}
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

      {/* Bottom Pagination & Counter Bar */}
      <div className="datatable-footer">
        <div className="datatable-info">
          {totalEntries === 0 ? (
            <span>Showing 0 to 0 of 0 entries</span>
          ) : (
            <span>
              Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{totalEntries}</strong> entries
              {searchTerm && ` (filtered from ${data.length} total entries)`}
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <div className="datatable-pagination">
            <button 
              type="button"
              className="datatable-page-btn" 
              onClick={() => setCurrentPage(1)} 
              disabled={safeCurrentPage === 1}
              title="First Page"
            >
              <ChevronsLeft size={15} />
            </button>
            <button 
              type="button"
              className="datatable-page-btn" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={safeCurrentPage === 1}
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>

            {getPageNumbers().map((num, i) => {
              if (num === '...') {
                return <span key={`ellipsis-${i}`} className="datatable-ellipsis">...</span>;
              }
              const isActive = num === safeCurrentPage;
              return (
                <button
                  key={num}
                  type="button"
                  className={`datatable-page-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              );
            })}

            <button 
              type="button"
              className="datatable-page-btn" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
              disabled={safeCurrentPage === totalPages}
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
            <button 
              type="button"
              className="datatable-page-btn" 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={safeCurrentPage === totalPages}
              title="Last Page"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

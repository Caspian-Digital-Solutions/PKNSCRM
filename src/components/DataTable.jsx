import { useEffect, useMemo, useState } from 'react';
import ExportButton from './ExportButton.jsx';
import Term from './Term.jsx';

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

function cellValue(row, col) {
  return col.sortValue ? col.sortValue(row) : row[col.key];
}

function display(row, col) {
  const value = row[col.key];
  if (col.format) return col.format(value, row);
  return value == null || value === '' ? '–' : String(value);
}

function totalValue(col, rows) {
  if (col.total == null) return undefined;
  if (col.total === 'sum') {
    return rows.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
  }
  return col.total(rows);
}

export default function DataTable({
  columns,
  rows,
  totals = false,
  exportName = 'export',
  onRowClick,
  initialSort,
  className,
  pageSize,
  pageSizes,
  empty = 'No rows in this filter.',
  tools,
  exportRows,
  onExport,
  exportMode = 'csv',
  exportLabel = 'Export CSV',
}) {
  const [sort, setSort] = useState(() => initialSort || { key: null, dir: 'asc' });
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize || (pageSizes ? pageSizes[0] : 0));

  const filtered = useMemo(() => rows.filter((row) => columns.every((col) => {
    const chosen = filters[col.key];
    if (!chosen) return true;
    const value = row[col.key];
    if (col.filter === 'select') return String(value ?? '') === chosen;
    if (col.filter === 'text') return String(value ?? '').toLowerCase().includes(chosen.toLowerCase());
    return true;
  })), [rows, columns, filters]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return filtered.slice().sort((a, b) => dir * compare(cellValue(a, col), cellValue(b, col)));
  }, [filtered, columns, sort]);

  useEffect(() => { setPage(0); }, [rows, sort.key, sort.dir, filters, size]);
  const shown = size ? sorted.slice(page * size, page * size + size) : sorted;
  const pages = size ? Math.max(1, Math.ceil(sorted.length / size)) : 1;

  const onHeader = (key) => {
    setSort((cur) => (cur.key === key
      ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }));
  };

  const filterable = columns.filter((c) => c.filter);
  const optionsFor = (col) => [...new Set(rows.map((row) => row[col.key]).filter((v) => v != null && v !== ''))]
    .sort((a, b) => compare(a, b));

  return (
    <div className="datatable">
      <div className="datatable-bar">
        {tools}
        {filterable.length > 0 && (
          <div className="filters">
            {filterable.map((col) => (
              <label key={col.key}>
                <span className="filter-name">{col.filterLabel || col.label}</span>
                {col.filter === 'select' ? (
                  <select value={filters[col.key] || ''} onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}>
                    <option value="">All</option>
                    {optionsFor(col).map((opt) => <option key={String(opt)} value={String(opt)}>{String(opt)}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filters[col.key] || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
        )}
        <ExportButton filename={exportName} columns={columns} rows={exportRows || sorted} mode={exportMode} label={exportLabel} onExport={onExport} />
      </div>
      <div className={className ? `table-scroll ${className}` : 'table-scroll'}>
        <table className={className ? `table data-table ${className}-table` : 'table data-table'}>
          {columns.some((col) => col.width) && (
            <colgroup>
              {columns.map((col) => <col key={col.key} style={col.width ? { width: col.width } : undefined} />)}
            </colgroup>
          )}
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort.key === col.key;
                const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                const button = (
                  <button type="button" className="th-btn" onClick={() => onHeader(col.key)}>
                    {col.head || col.label}
                    {active ? <span aria-hidden="true">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                  </button>
                );
                return (
                  <th key={col.key} className={col.align === 'right' ? 'r' : undefined} aria-sort={ariaSort}>
                    {col.term ? <Term id={col.term}>{button}</Term> : button}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr
                key={row.id ?? row.key ?? i}
                className={onRowClick ? 'clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? 'r' : undefined}>{display(row, col)}</td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            )}
            {totals && sorted.length > 0 && (
              <tr className="total">
                {columns.map((col, index) => {
                  const raw = totalValue(col, sorted);
                  let text = '';
                  if (index === 0 && col.total == null) text = 'Total';
                  else if (raw !== undefined) text = col.format ? col.format(raw, null) : (raw == null ? '–' : String(raw));
                  return <td key={col.key} className={col.align === 'right' ? 'r' : undefined}>{text}</td>;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {size > 0 && (
        <div className="pager">
          <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>{sorted.length ? `${page * size + 1}–${Math.min(sorted.length, (page + 1) * size)} of ${sorted.length}` : '0 rows'}</span>
          <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          {pageSizes && (
            <label className="page-size">
              <span className="filter-name">Rows</span>
              <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
                {pageSizes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

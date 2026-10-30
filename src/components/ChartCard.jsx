import { useState } from 'react';
import { Table2 } from 'lucide-react';
import DataTable from './DataTable.jsx';
import { num } from '../format.js';

export default function ChartCard({
  title,
  subtitle,
  children,
  footer,
  rows = [],
  columns,
  exportName = 'chart-data',
  height = 280,
}) {
  const [table, setTable] = useState(false);
  const tableColumns = columns || [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value', align: 'right', format: num },
  ];
  const tableRows = rows.map((row, index) => ({ id: row.id || row.name || index, ...row }));
  return (
    <article className="chart-card">
      <header className="chart-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button type="button" className="icon-btn" title={table ? 'View chart' : 'View data'} aria-label={table ? 'View chart' : 'View data'} onClick={() => setTable((open) => !open)}><Table2 size={16} aria-hidden="true" /></button>
      </header>
      <div className="chart-card-body" style={{ minHeight: table ? undefined : height }}>
        {table ? (
          <DataTable columns={tableColumns} rows={tableRows} exportName={exportName} pageSizes={[25, 50, 100]} empty="No figures for this chart." />
        ) : children}
      </div>
      {footer ? <footer className="chart-card-foot">{footer}</footer> : null}
    </article>
  );
}

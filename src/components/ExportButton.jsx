import * as XLSX from 'xlsx';

const BANNER = 'PKNS AMP Hub · Demo data · as at 28 Oct 2026';

function sheetRows(columns, rows) {
  const header = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => {
    const value = typeof c.exportValue === 'function' ? c.exportValue(row) : row[c.key];
    return value == null ? '' : value;
  }));
  return [header, ...body];
}

export function exportSheets({ filename = 'export', banner = BANNER, sheets }) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const [header, ...body] = sheetRows(sheet.columns, sheet.rows);
    const aoa = [[sheet.banner || banner], header, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, String(sheet.name || 'Data').slice(0, 31));
  }
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function exportCsv({ filename = 'export', columns, rows }) {
  const esc = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    columns.map((col) => esc(col.label)).join(','),
    ...rows.map((row) => columns.map((col) => esc(typeof col.exportValue === 'function' ? col.exportValue(row) : row[col.key])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExportButton({
  filename = 'export',
  columns,
  rows,
  sheets,
  banner,
  label = 'Export to Excel',
  mode = 'xlsx',
  onExport,
}) {
  const onClick = () => {
    if (onExport && onExport() === false) return;
    if (mode === 'csv') {
      exportCsv({ filename, columns, rows });
      window.dispatchEvent(new CustomEvent('pkns-toast', { detail: { title: `Exported ${rows.length} rows to CSV`, detail: filename } }));
      return;
    }
    const book = sheets || [{ name: 'Data', columns, rows }];
    const count = book.reduce((sum, sheet) => sum + (sheet.rows?.length || 0), 0);
    const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    exportSheets({ filename, banner, sheets: book });
    window.dispatchEvent(new CustomEvent('pkns-toast', { detail: { title: `Exported ${count} rows to Excel`, detail: name } }));
  };
  return (
    <button type="button" className="export-btn" onClick={onClick}>{label}</button>
  );
}

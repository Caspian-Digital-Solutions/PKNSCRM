import * as XLSX from 'xlsx';

const BANNER = 'PKNS Asset Marketing Hub · Demo data · as at 31 Oct 2026';

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

export default function ExportButton({
  filename = 'export',
  columns,
  rows,
  sheets,
  banner,
  label = 'Export to Excel',
}) {
  const onClick = () => {
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

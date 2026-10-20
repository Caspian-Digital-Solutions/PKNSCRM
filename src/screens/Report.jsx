import { useMemo, useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { useStore } from '../store.jsx';
import Num from '../components/Num.jsx';
import Term from '../components/Term.jsx';
import { exportSheets } from '../components/ExportButton.jsx';
import { MONTHS } from '../data/config.js';
import { DEFINITIONS } from '../data/definitions.js';
import { BENCHMARK_NOTE, reportModel } from '../data/reportModel.js';
import { buildReportPdf } from '../reportPdf.js';

function MeasureTable({ title, rows }) {
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th className="r">This month</th>
              <th className="r">Last month</th>
              <th className="r">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.term ? <Term id={row.term}>{row.label}</Term> : row.label}
                  {row.note ? <span className="cell-note">{row.note}</span> : null}
                </td>
                <td className="r" data-testid={`report-${row.id}`}>
                  <Num value={row.currentText} watch={`report:${row.id}`} />
                </td>
                <td className="r">{row.previousText}</td>
                <td className="r">{row.changeText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function readLogo() {
  const res = await fetch(logo);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Report() {
  const { state, data } = useStore();
  const [month, setMonth] = useState('2026-10');
  const model = useMemo(() => reportModel(data, state, month), [data, state, month]);

  const onExcel = () => {
    exportSheets({ filename: `PKNS-report-${month}`, banner: model.banner, sheets: model.sheets });
  };

  const onPdf = async () => {
    let logoDataUrl = null;
    try { logoDataUrl = await readLogo(); } catch { logoDataUrl = null; }
    buildReportPdf(model, { logoDataUrl }).save(`PKNS-report-${month}.pdf`);
  };

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Management report</h1>
          <p className="lead">The industry-standard set, filled from this system, and it still opens in Excel.</p>
        </div>
        <label className="month-select">
          Month
          <select data-testid="report-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {MONTHS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="stage-actions">
        <button type="button" className="btn" data-testid="export-excel" onClick={onExcel}>Export to Excel</button>
        <button type="button" className="btn" data-testid="export-pdf" onClick={onPdf}>Export to PDF</button>
      </div>
      <MeasureTable title="Portfolio and leasing" rows={model.block1} />
      <MeasureTable title="Marketing to tenancy" rows={model.block2} />
      <MeasureTable title="Digital reach" rows={model.block3} />
      <details className="definitions" open data-testid="definitions">
        <summary>Definitions</summary>
        <dl>
          {DEFINITIONS.map((item) => (
            <div key={item.id}>
              <dt>{item.name}</dt>
              <dd>{item.formula}</dd>
              <dd className="cell-note">{item.source}{item.note ? ` · ${item.note}` : ''}</dd>
            </div>
          ))}
        </dl>
        <p>{BENCHMARK_NOTE}</p>
      </details>
    </section>
  );
}

import { useMemo, useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { useStore } from '../store.jsx';
import Filters from '../components/Filters.jsx';
import Num from '../components/Num.jsx';
import Term from '../components/Term.jsx';
import { exportSheets } from '../components/ExportButton.jsx';
import { MONTHS } from '../data/config.js';
import { DEFINITIONS } from '../data/definitions.js';
import { reportModel } from '../data/reportModel.js';
import { liveEnquiries } from '../data/selectors.js';
import { medianDaysInZone, octoberMovements, zoneSnapshot } from '../data/zones.js';
import { num, rm } from '../format.js';
import { buildReportPdf } from '../reportPdf.js';

function MeasureTable({ title, rows }) {
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="empty-state">No measures match this search. Clear the search to see this section.</p>
      ) : (
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
            {rows.reduce((nodes, row, index) => {
              const snapshot = row.kind === 'snapshot';
              const trade = String(row.id).startsWith('trade-');
              const expiry = String(row.id).startsWith('expiry-');
              if (snapshot && !rows.slice(0, index).some((item) => item.kind === 'snapshot')) {
                nodes.push(<tr key="snapshot-head"><td colSpan={4}>Snapshot as at 31 Oct 2026</td></tr>);
              }
              if (expiry && !rows.slice(0, index).some((item) => String(item.id).startsWith('expiry-'))) {
                nodes.push(<tr key="expiry-head"><td colSpan={4}>Lease expiry profile</td></tr>);
              }
              if (trade && !rows.slice(0, index).some((item) => String(item.id).startsWith('trade-'))) {
                nodes.push(<tr key="trade-head"><td colSpan={4}>Retail trade mix</td></tr>);
              }
              const label = trade ? String(row.label).split('·').pop().trim() : row.label;
              nodes.push(
                <tr key={row.id} className={trade || expiry ? 'indent-row' : undefined}>
                  <td>
                    {row.term ? <Term id={row.term}>{label}</Term> : label}
                    {row.note ? <span className="cell-note">{row.note}</span> : null}
                  </td>
                  <td className="r" data-testid={`report-${row.id}`}>
                    <Num value={row.currentText} watch={`report:${row.id}`} />
                  </td>
                  <td className="r">{snapshot ? '' : row.previousText}</td>
                  <td className="r">{snapshot ? '' : row.changeText}</td>
                </tr>,
              );
              return nodes;
            }, [])}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function AudienceZones({ enquiries, state }) {
  const snap = zoneSnapshot(enquiries, state);
  const move = octoberMovements(enquiries);
  const medians = medianDaysInZone(enquiries.filter((enquiry) => !enquiry.hero));
  const zones = [
    ['Suspect', snap.suspect],
    ['Prospect', snap.prospect],
    ['Customer', snap.customer],
  ];
  return (
    <section data-testid="audience-zones">
      <h3 className="section-title">Audience zones</h3>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th className="r">Enquiries</th>
              <th className="r">Monthly rent</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(([label, row]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="r">{num(row.count)}</td>
                <td className="r">{rm(row.rent)}</td>
              </tr>
            ))}
            <tr>
              <td>Withdrawn</td>
              <td className="r">{num(snap.withdrawn.count)}</td>
              <td className="r">{num(snap.withdrawn.from.suspect)} from Suspect, {num(snap.withdrawn.from.prospect)} from Prospect</td>
            </tr>
            <tr>
              <td>Handed over</td>
              <td className="r">{num(snap.handed)}</td>
              <td className="r">{num(snap.ready)} ready</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="section-title">October movements</h3>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th className="r">October</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Enquiries received</td>
              <td className="r">{num(move.received)}</td>
            </tr>
            <tr>
              <td>Entered Prospect</td>
              <td className="r">{num(move.enteredProspect)}</td>
            </tr>
            <tr>
              <td>Became Customer</td>
              <td className="r">{num(move.becameCustomer)}</td>
            </tr>
            <tr>
              <td>Withdrawn</td>
              <td className="r">{num(move.withdrawn)}</td>
            </tr>
            <tr>
              <td>Median days, enquiry to Prospect</td>
              <td className="r">{move.medianToProspect ?? '–'}</td>
            </tr>
            <tr>
              <td>Median days, Prospect to Customer</td>
              <td className="r">{move.medianToCustomer ?? '–'}</td>
            </tr>
            <tr>
              <td>Median days in zone now</td>
              <td className="r">Suspect {medians.suspect ?? '–'}, Prospect {medians.prospect ?? '–'}, Customer {medians.customer ?? '–'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DigitalReach({ rows }) {
  const pages = [];
  for (const row of rows) {
    const parts = String(row.label).split(' · ');
    if (parts.length < 3) continue;
    const [page, platform, metric] = parts;
    let item = pages.find((entry) => entry.page === page && entry.platform === platform);
    if (!item) {
      item = { page, platform, key: `${page}-${platform}` };
      pages.push(item);
    }
    if (/Followers/.test(metric)) {
      item.followers = row.currentText;
      item.followersChange = row.changeText;
      item.followersId = row.id;
    }
    if (/Organic reach/.test(metric)) {
      item.reach = row.currentText;
      item.reachChange = row.changeText;
      item.reachId = row.id;
    }
  }
  const extras = rows.filter((row) => String(row.label).split(' · ').length < 3);
  return (
    <section>
      <h2 className="section-title">3. Digital reach</h2>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Platform</th>
              <th>Followers</th>
              <th>Change</th>
              <th>Organic reach</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((item) => (
              <tr key={item.key}>
                <td>{item.page}</td>
                <td>{item.platform}</td>
                <td className="r" data-testid={item.followersId ? `report-${item.followersId}` : undefined}>{item.followers}</td>
                <td className="r">{item.followersChange}</td>
                <td className="r" data-testid={item.reachId ? `report-${item.reachId}` : undefined}>{item.reach}</td>
                <td className="r">{item.reachChange}</td>
              </tr>
            ))}
            {extras.map((row) => (
              <tr key={row.id}>
                <td colSpan={5}>{row.label}</td>
                <td className="r" data-testid={`report-${row.id}`}>{row.currentText}</td>
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
  const [query, setQuery] = useState('');
  const model = useMemo(() => reportModel(data, state, month), [data, state, month]);
  const zoneRows = useMemo(() => liveEnquiries(data, state), [data, state]);
  const needle = query.trim().toLowerCase();
  const matchRows = (rows) => (needle ? rows.filter((row) => `${row.label || ''} ${row.note || ''}`.toLowerCase().includes(needle)) : rows);

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
      <div className="report-toolbar">
        <div>
          <h1 className="page-title">Management report</h1>
          <p className="lead">The industry-standard set, filled from this system, and it still opens in Excel.</p>
        </div>
        <div className="stage-actions">
          <button type="button" className="btn" data-testid="export-excel" onClick={onExcel}>Export to Excel</button>
          <button type="button" className="btn" data-testid="export-pdf" onClick={onPdf}>Export to PDF</button>
        </div>
      </div>
      <Filters
        query={query}
        onQuery={setQuery}
        fields={[]}
        value={{}}
        onClear={() => { setMonth('2026-10'); setQuery(''); }}
        extraChips={month === '2026-10' ? [] : [{
          key: 'month',
          label: `Period: ${MONTHS.find((item) => item.key === month)?.label || month}`,
          remove: () => setMonth('2026-10'),
        }]}
      >
        <label className="month-select">
          Month
          <select data-testid="report-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {MONTHS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </Filters>
      <article className="report-page">
        <img className="report-logo" src={logo} alt="PKNS" />
        <p className="report-month">{MONTHS.find((item) => item.key === month)?.label}</p>
        <MeasureTable title="1. Portfolio and leasing" rows={matchRows(model.block1)} />
        <MeasureTable title="2. Marketing to tenancy" rows={matchRows(model.block2)} />
        {month === '2026-10' && <AudienceZones enquiries={zoneRows} state={state} />}
        <DigitalReach rows={matchRows(model.block3)} />
      <details className="definitions" open data-testid="definitions">
        <summary>Definitions</summary>
        <dl>
          {DEFINITIONS.map((item) => (
            <div key={item.id}>
              <dt>{item.name}</dt>
              <dd>{item.formula}</dd>
              <dd className="cell-note">{item.source}{item.note ? `. ${item.note}` : ''}</dd>
            </div>
          ))}
        </dl>
      </details>
      </article>
    </section>
  );
}

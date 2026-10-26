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
import { liveEnquiries, periodWindow, portfolioRows } from '../data/selectors.js';
import { go } from '../router.js';
import { boardAudience, medianDaysInZone, octoberMovements } from '../data/zones.js';
import { medianFirstResponseHours, withinOneWorkingHourShare } from '../data/metrics.js';
import { hours, monthSelectLabel, num, pct, rm, snapshotLabel } from '../format.js';
import { buildReportPdf } from '../reportPdf.js';

function MeasureTable({ title, rows, asAt }) {
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
              if (row.kind === 'heading') {
                nodes.push(<tr key={row.id}><td colSpan={4}>{row.label}</td></tr>);
                return nodes;
              }
              const snapshot = row.kind === 'snapshot';
              const trade = String(row.id).startsWith('trade-');
              const expiry = String(row.id).startsWith('expiry-');
              if (snapshot && !rows.slice(0, index).some((item) => item.kind === 'snapshot')) {
                nodes.push(<tr key="snapshot-head"><td colSpan={4}>{snapshotLabel(asAt)}</td></tr>);
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

function EnquiryLink({ query }) {
  return (
    <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); go('enquiries', query); }}>View these enquiries</a>
  );
}

function AudienceZones({ enquiries, state }) {
  const board = boardAudience(enquiries, state);
  const span = periodWindow('2026-10', state.now);
  const moveBase = octoberMovements(enquiries);
  const october = enquiries.filter((enquiry) => String(enquiry.receivedAt || '').startsWith('2026-10'));
  const withdrawnRows = enquiries.filter((enquiry) => enquiry.stage === 'Lost' && String((enquiry.history || []).find((entry) => entry[0] === 'Lost')?.[1] || enquiry.receivedAt || '').startsWith('2026-10'));
  const reached = (enquiry) => ['Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed'].some((stage) => stage === enquiry.stage || (enquiry.history || []).some((entry) => entry[0] === stage));
  const beforeProspect = withdrawnRows.filter((enquiry) => !reached(enquiry)).length;
  const responseHours = medianFirstResponseHours(october);
  const paid = october.filter((enquiry) => enquiry.paid).length;
  const unpaidCampaign = october.filter((enquiry) => enquiry.paid === false && enquiry.campaign).length;
  const unlinked = october.filter((enquiry) => !enquiry.campaign).length;
  const move = {
    ...moveBase,
    paid,
    unpaidCampaign,
    unlinked,
    beforeProspect,
    fromProspect: withdrawnRows.length - beforeProspect,
    responseText: `${hours(responseHours).replace(' h', '')} working hours`,
    withinHour: pct(withinOneWorkingHourShare(october), 0),
  };
  const medians = medianDaysInZone(enquiries.filter((enquiry) => !enquiry.hero));
  const zones = [
    ['Suspect', board.suspect],
    ['Prospect', board.prospect],
    ['Customer, handover pending', board.pending],
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
              <td>Withdrawn in October</td>
              <td className="r">{num(board.withdrawn.count)}</td>
              <td className="r">{num(board.withdrawn.fromSuspect)} from Suspect, {num(board.withdrawn.fromProspect)} from Prospect</td>
            </tr>
            <tr>
              <td>Handed over</td>
              <td className="r">{num(board.handed)}</td>
              <td className="r">{num(board.handoversDue)} handovers due</td>
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
              <td className="r"><span className="cell-stack"><span>{num(move.received)} ({num(move.paid)} paid + {num(move.unpaidCampaign)} unpaid from campaigns + {num(move.unlinked)} not linked to a campaign)</span><EnquiryLink query={{ from: span.from, to: span.to, received: 'month' }} /></span></td>
            </tr>
            <tr>
              <td>Entered Prospect</td>
              <td className="r"><span className="cell-stack"><span>{num(move.enteredProspect)}</span><EnquiryLink query={{ when: 'prospect', from: span.from, to: span.to }} /></span></td>
            </tr>
            <tr>
              <td>Became Customer</td>
              <td className="r"><span className="cell-stack"><span>{num(move.becameCustomer)}</span><EnquiryLink query={{ when: 'customer', from: span.from, to: span.to }} /></span></td>
            </tr>
            <tr>
              <td>Withdrawn</td>
              <td className="r"><span className="cell-stack"><span>{num(move.withdrawn)} ({num(move.beforeProspect)} before Prospect, {num(move.fromProspect)} from Prospect)</span><EnquiryLink query={{ when: 'withdrawn', from: span.from, to: span.to }} /></span></td>
            </tr>
            <tr>
              <td>Median first response</td>
              <td className="r">{move.responseText}</td>
            </tr>
            <tr>
              <td>Within 1 working hour</td>
              <td className="r">{move.withinHour}</td>
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
  const portfolio = useMemo(() => portfolioRows(data, state, month).find((row) => row.total), [data, state, month]);
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
            {MONTHS.map((item) => <option key={item.key} value={item.key}>{monthSelectLabel(item.label, item.key, state.now)}</option>)}
          </select>
        </label>
      </Filters>
      <article className="report-page">
        <img className="report-logo" src={logo} alt="PKNS" />
        <p className="report-month">{monthSelectLabel(MONTHS.find((item) => item.key === month)?.label || month, month, state.now)}</p>
        <p data-testid="report-occupancy">Occupancy {pct(portfolio?.occupancy)}. Committed occupancy {pct(portfolio?.committedOccupancy)}. Occupancy counts tenants in place. Committed occupancy also counts leases signed but not started.</p>
        <MeasureTable title="1. Portfolio and leasing" rows={matchRows(model.block1)} asAt={state.now} />
        <MeasureTable title="2. Marketing to tenancy" rows={matchRows(model.block2)} asAt={state.now} />
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

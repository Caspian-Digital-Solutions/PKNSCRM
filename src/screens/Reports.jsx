import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { HBars } from '../components/Charts.jsx';
import { ChipSelect } from '../components/controls.jsx';
import { PageHead, linkTo } from '../components/bits.jsx';
import { SPEND_CATEGORIES, SOURCE_CHANNELS } from '../data/config.js';
import { exportSheets } from '../components/ExportButton.jsx';
import { exportReportPdf } from '../reportPdf.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct, rm } from '../format.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SCHEDULED = [
  { id: 'SCH-1', report: 'Monthly AMP Performance Report', recipients: 'Hisham Karim, Farah Idris', frequency: 'Monthly', nextRun: '2026-11-03' },
  { id: 'SCH-2', report: 'Asset report – Plaza Alam Sentral', recipients: 'Aina Rahman', frequency: 'Monthly', nextRun: '2026-11-03' },
  { id: 'SCH-3', report: 'Activation report pack', recipients: 'Danish Hakim', frequency: 'Weekly', nextRun: '2026-11-02' },
];

function monthLabel(ym) {
  const [year, month] = ym.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function packFor(assets, from, to, allActivations, spend, profiles, byAsset) {
  const ids = new Set(assets.map((asset) => asset.id));
  const acts = allActivations.filter((act) => ids.has(act.assetId) && act.endDate >= from && act.startDate <= to && (act.status === 'Completed' || act.status === 'Reported'));
  const money = spend.filter((line) => ids.has(line.assetId) && line.date >= from && line.date <= to);
  const fresh = profiles.filter((profile) => profile.firstSeen >= from && profile.firstSeen <= to && (profile.assetIds || []).some((id) => ids.has(id)));
  const stock = profiles.filter((profile) => profile.firstSeen <= to && (profile.assetIds || []).some((id) => ids.has(id)));
  const consented = stock.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
  return { acts, money, fresh, stock, consented, rows: byAsset.filter((row) => ids.has(row.id)) };
}

export default function Reports() {
  const { assets, scope, allActivations, spend, profiles, byAsset, route, data, qrCodes } = useAmp();
  const [month, setMonth] = useState('2026-10');
  const [chosen, setChosen] = useState(() => scope.assetIds.slice());
  const [assetId, setAssetId] = useState(scope.assetIds[0] || '');
  const selectable = assets.filter((asset) => scope.allowed.includes(asset.id));
  const selected = selectable.filter((asset) => chosen.includes(asset.id));
  const from = `${month}-01`;
  const to = `${month}-31`;
  const pack = useMemo(() => packFor(selected, from, to, allActivations, spend, profiles, byAsset), [selected, from, to, allActivations, spend, profiles, byAsset]);
  const title = `AMP Performance Report – ${monthLabel(month)}`;
  const subtitle = 'Beyond revenue: audience, activation and spend';
  const headline = [
    { id: 'spend', label: 'AMP spend', value: rm(pack.money.reduce((sum, line) => sum + line.amountRM, 0)) },
    { id: 'acts', label: 'Activations completed', value: num(pack.acts.length) },
    { id: 'attendance', label: 'Attendance', value: num(pack.acts.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0)) },
    { id: 'new', label: 'New profiles', value: num(pack.fresh.length) },
    { id: 'consent', label: 'Consent rate', value: pct(pack.stock.length ? pack.consented.length / pack.stock.length : null) },
  ];
  const categoryRows = SPEND_CATEGORIES.map((name) => ({ id: name, category: name, amount: pack.money.filter((line) => line.category === name).reduce((sum, line) => sum + line.amountRM, 0) }));
  const activationRows = pack.acts.map((act) => ({
    id: act.id,
    name: act.name,
    asset: assets.find((item) => item.id === act.assetId)?.shortCode,
    attendance: act.outcomes?.totalAttendance || 0,
    spend: pack.money.filter((line) => line.activationId === act.id).reduce((sum, line) => sum + line.amountRM, 0),
    cost: (act.outcomes?.totalAttendance ? pack.money.filter((line) => line.activationId === act.id).reduce((sum, line) => sum + line.amountRM, 0) / act.outcomes.totalAttendance : null),
    rating: act.outcomes?.avgRating,
  }));
  const mix = SOURCE_CHANNELS.map((name) => ({ id: name, source: name, count: pack.fresh.filter((profile) => profile.sourceChannelFirst === name).length }));
  const sentiment = {
    positive: pack.acts.reduce((sum, act) => sum + (act.outcomes?.positiveComments || 0), 0),
    neutral: pack.acts.reduce((sum, act) => sum + (act.outcomes?.neutralComments || 0), 0),
    negative: pack.acts.reduce((sum, act) => sum + (act.outcomes?.negativeComments || 0), 0),
  };
  const sections = () => [
    { heading: 'Headline numbers', columns: [{ label: 'Measure', key: 'label' }, { label: 'Value', key: 'value' }], rows: headline },
    { heading: 'Spend by category', columns: [{ label: 'Category', key: 'category' }, { label: 'Amount', key: 'amount', exportValue: (row) => row.amount }], rows: categoryRows },
    { heading: 'Spend by asset', columns: [{ label: 'Asset', key: 'asset' }, { label: 'Spend', key: 'ampSpend' }], rows: pack.rows },
    { heading: 'Activations completed', columns: [{ label: 'Activation', key: 'name' }, { label: 'Attendance', key: 'attendance' }, { label: 'Cost per attendee', key: 'cost' }], rows: activationRows },
    { heading: 'Database growth and consent', lines: [`New profiles ${num(pack.fresh.length)}`, `Database ${num(pack.stock.length)}`, `Consented ${num(pack.consented.length)} (${pct(pack.stock.length ? pack.consented.length / pack.stock.length : null)})`] },
    { heading: 'Audience mix', columns: [{ label: 'First source', key: 'source' }, { label: 'New profiles', key: 'count' }], rows: mix },
    { heading: 'Ratings and comment sentiment', lines: [`Positive ${num(sentiment.positive)}`, `Neutral ${num(sentiment.neutral)}`, `Negative ${num(sentiment.negative)}`] },
    { heading: 'Budget utilisation by asset', columns: [{ label: 'Asset', key: 'asset' }, { label: 'Utilisation', key: 'utilisation' }], rows: pack.rows },
    { heading: 'Capture performance', lines: [`Forms ${num((data.forms || []).length)}`, `QR scans ${num((qrCodes || []).reduce((sum, qr) => sum + (qr.scans || 0), 0))}`, `QR submissions ${num((qrCodes || []).reduce((sum, qr) => sum + (qr.submissions || 0), 0))}`] },
  ];
  const pdf = () => exportReportPdf({ filename: 'amp-performance-report.pdf', title, subtitle, sections: sections() });
  const excel = () => exportSheets({
    filename: 'amp-performance-report',
    sheets: [
      { name: 'Headline', columns: [{ label: 'Measure', key: 'label' }, { label: 'Value', key: 'value' }], rows: headline },
      { name: 'Spend', columns: [{ label: 'Category', key: 'category' }, { label: 'Amount', key: 'amount' }], rows: categoryRows },
      { name: 'Activations', columns: [{ label: 'Activation', key: 'name' }, { label: 'Attendance', key: 'attendance' }, { label: 'Cost per attendee', key: 'cost' }], rows: activationRows },
      { name: 'Assets', columns: [{ label: 'Asset', key: 'asset' }, { label: 'Spend', key: 'ampSpend' }, { label: 'Utilisation', key: 'utilisation' }], rows: pack.rows },
    ],
  });
  const asset = selectable.find((item) => item.id === assetId) || selectable[0];
  const assetPack = asset ? packFor([asset], scope.from, scope.to, allActivations, spend, profiles, byAsset) : null;

  return (
    <section>
      <PageHead title="Reports" lede="Monthly AMP management report, activation reports and asset reports." actions={<><button type="button" className="btn" onClick={pdf}>Export PDF</button><button type="button" className="btn btn-primary" onClick={excel}>Export Excel</button></>} />
      <h2>Monthly AMP Management Report</h2>
      <div className="report-layout">
      <form className="dialog-form" onSubmit={(event) => event.preventDefault()}>
        <label className="field">Month<input className="control" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <div className="screen-actions">
          <button type="button" className="btn" onClick={() => setChosen(selectable.map((item) => item.id))}>Select all</button>
          <button type="button" className="btn" onClick={() => setChosen([])}>Clear</button>
        </div>
        <ChipSelect ariaLabel="Assets" value={chosen} onChange={setChosen} options={selectable.map((item) => ({ id: item.id, label: item.name }))} />
      </form>
      <article className="report-sheet">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <DataTable columns={[{ key: 'label', label: 'Measure' }, { key: 'value', label: 'Value', align: 'right' }]} rows={headline} exportName="report-headline" />
        <ChartCard title="Spend by category" rows={categoryRows.map((row) => ({ name: row.category, value: row.amount }))} exportName="report-spend-category">
          <HBars money data={categoryRows.map((row) => ({ name: row.category, value: row.amount }))} />
        </ChartCard>
        <p className="fine">Generated from PKNS AMP Hub · {date(new Date().toISOString())}</p>
        <h2>Activations completed</h2>
        <DataTable columns={[{ key: 'name', label: 'Activation' }, { key: 'asset', label: 'Asset' }, { key: 'attendance', label: 'Attendance', align: 'right', format: num }, { key: 'cost', label: 'Cost per attendee', align: 'right', format: rm }]} rows={activationRows} exportName="report-activations" empty="No completed activations in this month." pageSizes={[25, 50, 100]} />
        <h2>Audience mix</h2>
        <DataTable columns={[{ key: 'source', label: 'First source' }, { key: 'count', label: 'New profiles', align: 'right', format: num }]} rows={mix} exportName="report-mix" />
        <p>Comment sentiment — positive {num(sentiment.positive)}, neutral {num(sentiment.neutral)}, negative {num(sentiment.negative)}.</p>
      </article>
      </div>
      <h2>Activation report</h2>
      <p>Open the Report tab on an activation to export that activation.</p>
      <DataTable
        columns={[{ key: 'name', label: 'Activation' }, { key: 'end', label: 'End', format: date }, { key: 'status', label: 'Status' }]}
        rows={pack.acts.slice(0, 12).map((act) => ({ id: act.id, name: act.name, end: act.endDate, status: act.status }))}
        exportName="activation-report-index"
        empty="No completed activations in this month."
        onRowClick={(row) => { window.location.hash = linkTo(`activation/${row.id}`, route.search); }}
      />
      <h2>Asset report</h2>
      <label>Asset
        <select className="control" value={asset?.id || ''} onChange={(event) => setAssetId(event.target.value)}>
          {selectable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {assetPack && (
        <article className="report-sheet">
          <h2>AMP Performance Report – {asset.name}</h2>
          <p>{subtitle}</p>
          <p>{date(scope.from)} – {date(scope.to)}</p>
          <p>Spend {rm(assetPack.money.reduce((sum, line) => sum + line.amountRM, 0))} · Attendance {num(assetPack.acts.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0))} · New profiles {num(assetPack.fresh.length)}</p>
          <button type="button" className="btn" onClick={() => exportReportPdf({ filename: `asset-${asset.shortCode}.pdf`, title: `AMP Performance Report – ${asset.name}`, subtitle, sections: [{ heading: 'Period', lines: [`${scope.from} to ${scope.to}`, `Spend ${rm(assetPack.money.reduce((sum, line) => sum + line.amountRM, 0))}`] }] })}>Export PDF</button>
          <button type="button" className="btn" onClick={() => exportSheets({ filename: `asset-${asset.shortCode}`, sheets: [{ name: 'Activations', columns: [{ label: 'Name', key: 'name' }, { label: 'Attendance', key: 'attendance' }], rows: assetPack.acts.map((act) => ({ name: act.name, attendance: act.outcomes?.totalAttendance || 0 })) }] })}>Export Excel</button>
        </article>
      )}
      <h2>Scheduled reports</h2>
      <DataTable
        columns={[
          { key: 'report', label: 'Report' },
          { key: 'recipients', label: 'Recipients' },
          { key: 'frequency', label: 'Frequency' },
          { key: 'nextRun', label: 'Next run', format: date },
        ]}
        rows={SCHEDULED}
        exportName="scheduled-reports"
      />
    </section>
  );
}

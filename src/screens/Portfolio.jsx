import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import Num from '../components/Num.jsx';
import { portfolioRows, reportBlocks, liveUnits } from '../data/selectors.js';
import { leasingKpis, medianDaysVacant, totalRow, withRatios } from '../data/metrics.js';
import { num, rm, rm2, pct, x } from '../format.js';

const flash = (key, format) => (value, row) => (
  <Num value={value} format={format} watch={`portfolio:${key}:${row?.id || 'total'}`} />
);

function marketingOf(rows) {
  return withRatios(totalRow(rows.map((row) => ({
    spend: row.spend || 0,
    impressions: 0,
    clicks: 0,
    enquiries: row.paidEnquiries || 0,
    viewings: row.viewings || 0,
    signed: row.signed || 0,
    firstYearValue: row.firstYearValue || 0,
  }))));
}

function assetName(value, row) {
  if (!row) return value ?? '';
  return (
    <span className="name-cell">
      <a href={`#/asset/${row.id}`} onClick={(e) => { e.preventDefault(); go('asset', row.id); }}>{row.name}</a>
      {row.statusText ? <span className="cell-note">{row.statusText}</span> : null}
    </span>
  );
}

function unitsCell(value, row) {
  if (!row) return <Num value={value} format={num} watch="portfolio:units:total" />;
  if (row.eventSpace) return `${num(row.spaces)} spaces`;
  return <Num value={value} format={num} watch={`portfolio:units:${row.id}`} />;
}

function occupancyCell(value, row) {
  if (!row) return <Num value={value} format={pct} watch="portfolio:occupancy:total" />;
  if (row.eventSpace) return 'n/a, priced per day';
  if (row.statusText === 'Under redevelopment') return 'n/a';
  return <Num value={value} format={pct} watch={`portfolio:occupancy:${row.id}`} />;
}

export default function Portfolio() {
  const { state, data } = useStore();
  const [month, setMonth] = useState('2026-10');
  const rows = useMemo(() => portfolioRows(data, state, month), [data, state, month]);
  const report = useMemo(() => reportBlocks(data, state, month), [data, state, month]);
  const units = useMemo(() => liveUnits(data, state), [data, state]);
  const body = rows.filter((row) => !row.total);
  const totals = rows.find((row) => row.total);
  const block1 = report.block1;
  const notes = body.filter((row) => row.note);

  const subsetUnits = (filtered) => {
    const ids = new Set(filtered.filter((row) => !row.eventSpace).map((row) => row.id));
    return units.filter((unit) => ids.has(unit.asset));
  };

  const columns = useMemo(() => [
    { key: 'name', label: 'Asset', format: assetName },
    { key: 'type', label: 'Type', filter: 'select' },
    {
      key: 'area',
      label: 'Location',
      filter: 'select',
      format: (value, row) => (row ? row.location : value || ''),
    },
    { key: 'entity', label: 'Managing entity' },
    {
      key: 'grouping',
      label: 'Grouping',
      format: (value, row) => {
        if (!row || !value) return value || '';
        const campaign = data.campaigns.find((item) => item.short === value);
        if (!campaign) return value;
        return <a href={`#/campaign/${campaign.id}`} onClick={(e) => { e.preventDefault(); go('campaign', campaign.id); }}>{value}</a>;
      },
    },
    { key: 'units', label: 'Units', align: 'right', total: 'sum', format: unitsCell },
    { key: 'occupied', label: 'Occupied', align: 'right', total: 'sum', format: flash('occupied', num) },
    { key: 'reserved', label: 'Reserved', align: 'right', total: 'sum', format: flash('reserved', num) },
    { key: 'vacant', label: 'Vacant', align: 'right', total: 'sum', format: flash('vacant', num) },
    { key: 'redev', label: 'Under redevelopment', align: 'right', total: 'sum', format: flash('redev', num) },
    {
      key: 'occupancy',
      label: 'Occupancy %',
      term: 'occupancy',
      align: 'right',
      format: occupancyCell,
      total: (filtered) => {
        const counted = filtered.filter((row) => !row.eventSpace);
        const unitCount = counted.reduce((sum, row) => sum + (row.units || 0), 0);
        const redev = counted.reduce((sum, row) => sum + (row.redev || 0), 0);
        const occupied = counted.reduce((sum, row) => sum + (row.occupied || 0), 0);
        const lettable = unitCount - redev;
        return lettable ? occupied / lettable : null;
      },
    },
    {
      key: 'medianDaysVacant',
      label: 'Median days vacant',
      term: 'days-vacant',
      align: 'right',
      format: flash('medianDaysVacant', num),
      total: (filtered) => medianDaysVacant(subsetUnits(filtered), state.heroStage),
    },
    { key: 'paidEnquiries', label: 'Paid enquiries', align: 'right', total: 'sum', format: flash('paidEnquiries', num) },
    { key: 'openPipeline', label: 'Open in pipeline', align: 'right', total: 'sum', format: flash('openPipeline', num) },
    { key: 'spend', label: 'Spend', align: 'right', total: 'sum', format: flash('spend', rm) },
    {
      key: 'cpl',
      label: 'CPL',
      term: 'cpl',
      align: 'right',
      format: flash('cpl', rm2),
      total: (filtered) => marketingOf(filtered).cpl,
    },
    { key: 'signed', label: 'Signed', align: 'right', total: 'sum', format: flash('signed', num) },
    { key: 'firstYearValue', label: 'First-year rent', align: 'right', total: 'sum', format: flash('firstYearValue', rm) },
    {
      key: 'roas',
      label: 'ROAS',
      term: 'roas',
      align: 'right',
      format: flash('roas', x),
      total: (filtered) => marketingOf(filtered).roas,
    },
    {
      key: 'rentExpiringNext12',
      label: 'Rent expiring next 12 months',
      align: 'right',
      format: flash('rentExpiringNext12', pct),
      total: (filtered) => {
        const subset = subsetUnits(filtered);
        const leased = subset.some((unit) => unit.status === 'Occupied' && unit.leaseExpiry && unit.rent);
        return leased ? leasingKpis(subset, state.heroStage).rentNext12 : null;
      },
    },
  ], [data.campaigns, state.heroStage, units]);

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Portfolio overview</h1>
          <p className="lead">One view across every PKNS asset: what is empty, how long it has been empty, and what it cost to fill.</p>
        </div>
        <label className="month-select">
          Month
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="kpi-row">
        <Kpi label="Assets" value={totals.assets} format={num} testId="kpi-assets" />
        <Kpi label="Units" value={totals.units} format={num} sub={`${num(totals.lettable)} lettable`} testId="kpi-units" />
        <Kpi label="Occupied" value={totals.occupied} format={num} testId="kpi-occupied" />
        <Kpi label="Reserved" value={totals.reserved} format={num} testId="kpi-reserved" />
        <Kpi label="Vacant" value={totals.vacant} format={num} testId="kpi-vacant" />
        <Kpi label="Under redevelopment" value={totals.redev} format={num} testId="kpi-redev" />
        <Kpi label="Occupancy" term="occupancy" value={totals.occupancy} format={pct} testId="kpi-occupancy" />
        <Kpi label="Paid enquiries" value={totals.paidEnquiries} format={num} testId="kpi-enquiries" />
        <Kpi label="Ad spend" value={totals.spend} format={rm} testId="kpi-spend" />
        <Kpi label="CPL" term="cpl" value={totals.cpl} format={rm2} testId="kpi-cpl" />
        <Kpi label="ROAS" term="roas" value={totals.roas} format={x} testId="kpi-roas" />
        <Kpi label="First-year rent" value={totals.firstYearValue} format={rm} testId="kpi-fyv" />
        <Kpi label="New leases" term="new-leases" value={block1.newLeases.current} format={num} testId="kpi-new-leases" />
        <Kpi
          label="Renewal rate"
          term="renewal-rate"
          value={block1.renewalRate.current}
          format={pct}
          sub={`${num(block1.renewed.current)} of ${num(block1.expiring.current)}`}
          testId="kpi-renewal"
        />
      </div>
      <DataTable columns={columns} rows={body} totals exportName={`portfolio-${month}`} />
      {notes.map((row) => (
        <p key={row.id} className="footnote">{row.name}: {row.note}</p>
      ))}
      {totals.eventSpaces > 0 && (
        <p className="footnote">Event spaces: {num(totals.eventSpaces)} (priced per day; not in occupancy)</p>
      )}
    </section>
  );
}

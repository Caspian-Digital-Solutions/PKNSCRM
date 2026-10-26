import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import { assetMark, enquiryUnitLabel } from '../labels.js';
import DataTable from '../components/DataTable.jsx';
import Filters from '../components/Filters.jsx';
import Kpi from '../components/Kpi.jsx';
import Num from '../components/Num.jsx';
import Sparkline from '../components/Sparkline.jsx';
import { portfolioRows, reportBlocks, liveUnits, liveEnquiries, campaignRows, periodWindow, comparisonWindow, clockOf } from '../data/selectors.js';
import { leasingKpis, medianDaysVacant, totalRow, withRatios } from '../data/metrics.js';
import { delta, dayMonth, num, rm, rm2, pct, x } from '../format.js';

const DEFAULT_COLUMNS = ['name', 'units', 'occupied', 'vacant', 'occupancy', 'medianDaysVacant', 'paidEnquiries', 'spend', 'cpl', 'signed', 'roas'];

function spanLabel(range) {
  if (!range) return '';
  const [ad, am] = dayMonth(range.from).split(' ');
  const [bd, bm] = dayMonth(range.to).split(' ');
  return am === bm ? `${ad}–${bd} ${bm}` : `${ad} ${am}–${bd} ${bm}`;
}

function changeLine(current, previous, format, label) {
  if (previous == null || !label) return null;
  if (format === 'pct') return `${delta(current, previous, format)} vs ${label}`;
  const shown = format === 'rm' ? rm(previous) : format === 'rm2' ? rm2(previous) : num(previous);
  return `vs ${shown} in ${label}`;
}

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
  const letters = assetMark(row);
  return (
    <span className="name-cell asset-name">
      <span className="asset-thumb" aria-hidden="true">{letters}</span>
      <span>
        <a href={`#/asset/${row.id}`} onClick={(e) => { e.preventDefault(); go('asset', row.id); }}>{row.name}</a>
        <span className="cell-note">{row.type}</span>
        {row.statusText ? <span className="cell-note">{row.statusText}</span> : null}
      </span>
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
  const [query, setQuery] = useState('');
  const [facet, setFacet] = useState({ type: '', location: '', campaign: '' });
  const [shownCols, setShownCols] = useState(DEFAULT_COLUMNS);
  const [colsOpen, setColsOpen] = useState(false);
  const rows = useMemo(() => portfolioRows(data, state, month), [data, state, month]);
  const now = clockOf(state);
  const range = periodWindow(month, now);
  const compare = comparisonWindow(month, now);
  const prevLabel = spanLabel(compare);
  const prevTotals = useMemo(() => {
    if (!compare) return null;
    const rows = data.campaigns.flatMap((campaign) => campaignRows(data, state, campaign.id, compare));
    const total = totalRow(rows);
    return { paidEnquiries: total.enquiries, spend: total.spend };
  }, [data, state, compare]);
  const series = useMemo(() => data.months.map((item) => {
    const total = portfolioRows(data, state, item.key).find((row) => row.total);
    return { occupancy: total?.occupancy, enquiries: total?.paidEnquiries, spend: total?.spend, signed: total?.signed };
  }), [data, state]);
  const occSeries = useMemo(
    () => data.months.map((item) => reportBlocks(data, state, item.key).block1.occupancy.current),
    [data, state],
  );
  const enquiries = useMemo(() => liveEnquiries(data, state), [data, state]);
  const report = useMemo(() => reportBlocks(data, state, month), [data, state, month]);
  const units = useMemo(() => liveUnits(data, state), [data, state]);
  const body = rows.filter((row) => !row.total);
  const totals = rows.find((row) => row.total);
  const options = (key) => [...new Set(body.map((row) => row[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  const narrowed = body.filter((row) => {
    if (facet.type && row.type !== facet.type) return false;
    if (facet.location && row.location !== facet.location) return false;
    if (facet.campaign && row.grouping !== facet.campaign) return false;
    if (query.trim()) {
      const blob = `${row.name || ''} ${row.short || ''} ${row.type || ''} ${row.location || ''} ${row.grouping || ''}`.toLowerCase();
      if (!blob.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });
  const assetFiltered = Boolean(query.trim() || facet.type || facet.location || facet.campaign);
  const marketing = assetFiltered ? marketingOf(narrowed) : null;
  const unitSum = (key) => narrowed.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  const lettable = assetFiltered ? unitSum('units') - unitSum('redev') : totals.lettable;
  const viewTotals = assetFiltered ? {
    ...totals,
    assets: narrowed.length,
    units: unitSum('units'),
    occupied: unitSum('occupied'),
    let: unitSum('let'),
    reserved: unitSum('reserved'),
    vacant: unitSum('vacant'),
    redev: unitSum('redev'),
    occupancy: lettable ? unitSum('occupied') / lettable : null,
    committedOccupancy: lettable ? (unitSum('occupied') + unitSum('let')) / lettable : null,
    lettable,
    paidEnquiries: marketing.enquiries,
    spend: marketing.spend,
    cpl: marketing.cpl,
    signed: marketing.signed,
    firstYearValue: marketing.firstYearValue,
    roas: marketing.roas,
  } : totals;
  const block1 = report.block1;
  const notes = body.filter((row) => row.note);

  const subsetUnits = (filtered) => {
    const ids = new Set(filtered.filter((row) => !row.eventSpace).map((row) => row.id));
    return units.filter((unit) => ids.has(unit.asset));
  };

  const columns = useMemo(() => [
    { key: 'name', label: 'Asset', format: assetName },
    { key: 'type', label: 'Type' },
    {
      key: 'area',
      label: 'Location',
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
        return <a href={`#/campaign/${campaign.id}`} onClick={(e) => { e.preventDefault(); go('campaign', campaign.id, { period: month }); }}>{value}</a>;
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
      label: 'Days vacant (median)',
      head: <span className="th-stack">Days vacant <span>(median)</span></span>,
      term: 'days-vacant',
      align: 'right',
      format: flash('medianDaysVacant', num),
      total: (filtered) => medianDaysVacant(subsetUnits(filtered), enquiries, state.now),
    },
    {
      key: 'paidEnquiries',
      label: 'Paid enquiries',
      align: 'right',
      total: 'sum',
      format: (value, row) => (
        <span className="cell-stack">
          {flash('paidEnquiries', num)(value, row)}
          <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); event.stopPropagation(); go('enquiries', { asset: row?.total ? '' : (row?.id || ''), paid: 'paid', from: range.from, to: range.to, received: 'month' }); }}>View these enquiries</a>
        </span>
      ),
    },
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
        return leased ? leasingKpis(subset, enquiries, state.now).rentNext12 : null;
      },
    },
  ], [data.campaigns, state.now, units, enquiries, month]);

  const visibleColumns = columns.filter((column) => shownCols.includes(column.key));
  const dueToday = enquiries.filter((enquiry) => enquiry.nextFollowUp === now.slice(0, 10));
  const awaitingList = enquiries.filter((enquiry) => !enquiry.firstResponseAt && enquiry.stage !== 'Lost' && enquiry.stage !== 'Signed');
  const newCount = enquiries.filter((enquiry) => enquiry.stage === 'New').length;
  const november = units.filter((unit) => unit.status === 'Occupied' && String(unit.leaseExpiry || '').startsWith('2026-11'));
  const novemberRent = november.reduce((sum, unit) => sum + (Number(unit.rent) || 0), 0);
  const topCampaign = data.campaigns.map((campaign) => {
    const row = totalRow(campaignRows(data, state, campaign.id, range));
    return { id: campaign.id, name: campaign.short, enquiries: row.enquiries };
  }).sort((a, b) => b.enquiries - a.enquiries)[0];

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Portfolio overview</h1>
          <p className="lead">One view across every PKNS asset: what is empty, how long it has been empty, and what it cost to fill.</p>
        </div>
      </div>
      <Filters
        query={query}
        onQuery={setQuery}
        fields={['type', 'location', 'campaign']}
        value={facet}
        onChange={(next) => setFacet({ type: next.type || '', location: next.location || '', campaign: next.campaign || '' })}
        types={options('type')}
        locations={options('location')}
        campaigns={options('grouping').map((item) => ({ id: item, name: item }))}
        onClear={() => setMonth('2026-10')}
        extraChips={month === '2026-10' ? [] : [{
          key: 'month',
          label: `Period: ${data.months.find((item) => item.key === month)?.label || month}`,
          remove: () => setMonth('2026-10'),
        }]}
      >
        <label className="month-select">
          Month
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((item) => {
              const end = now.slice(0, 10);
              const label = item.key === end.slice(0, 7) && end < `${item.key}-31` ? `${item.label} (to ${dayMonth(end)})` : item.label;
              return <option key={item.key} value={item.key}>{label}</option>;
            })}
          </select>
        </label>
      </Filters>
      <div className="overview-layout">
      <div className="kpi-row">
        <Kpi label="Assets" value={viewTotals.assets} format={num} testId="kpi-assets" />
        <Kpi label="Units" value={viewTotals.units} format={num} sub={`${num(viewTotals.lettable)} lettable`} testId="kpi-units" />
        <Kpi label="Occupied" value={viewTotals.occupied} format={num} testId="kpi-occupied" />
        <Kpi label="Let" value={viewTotals.let} format={num} sub="Lease not started" testId="kpi-let" />
        <Kpi label="Reserved" value={viewTotals.reserved} format={num} testId="kpi-reserved" />
        <Kpi label="Vacant" value={viewTotals.vacant} format={num} testId="kpi-vacant" />
        <Kpi label="Under redevelopment" value={viewTotals.redev} format={num} testId="kpi-redev" />
        <Kpi label="Occupancy" term="occupancy" value={viewTotals.occupancy} format={pct} sub={<span className="kpi-extra">{assetFiltered ? 'Filtered assets' : changeLine(block1.occupancy.current, block1.occupancy.previous, 'pct', prevLabel)}<Sparkline values={occSeries} /></span>} testId="kpi-occupancy" />
        <Kpi label="Committed occupancy" term="committed-occupancy" value={viewTotals.committedOccupancy ?? totals.committedOccupancy} format={pct} sub="Occupied plus let" testId="kpi-committed" />
        <Kpi label="Paid enquiries" value={viewTotals.paidEnquiries} format={num} sub={<span className="kpi-extra">{assetFiltered ? 'Filtered assets' : changeLine(totals.paidEnquiries, prevTotals?.paidEnquiries, 'num', prevLabel)}<a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); go('enquiries', { paid: 'paid', from: range.from, to: range.to, received: 'month' }); }}>View these enquiries</a><Sparkline values={series.map((item) => item.enquiries)} /></span>} testId="kpi-enquiries" />
        <Kpi label="Ad spend" value={viewTotals.spend} format={rm} sub={<span className="kpi-extra">{assetFiltered ? 'Filtered assets' : changeLine(totals.spend, prevTotals?.spend, 'rm', prevLabel)}<Sparkline values={series.map((item) => item.spend)} /></span>} testId="kpi-spend" />
        <Kpi label="CPL" term="cpl" value={viewTotals.cpl} format={rm2} testId="kpi-cpl" />
        <Kpi label="ROAS" term="roas" value={viewTotals.roas} format={x} testId="kpi-roas" />
        <Kpi label="First-year rent" value={viewTotals.firstYearValue} format={rm} testId="kpi-fyv" />
        <Kpi label="New leases" term="new-leases" value={assetFiltered ? viewTotals.signed : block1.newLeases.current} format={num} sub={<span className="kpi-extra"><Sparkline values={series.map((item) => item.signed)} /></span>} testId="kpi-new-leases" />
        <Kpi
          label="Renewal rate"
          term="renewal-rate"
          value={block1.renewalRate.current}
          format={pct}
          sub={`${num(block1.renewed.current)} of ${num(block1.expiring.current)}`}
          testId="kpi-renewal"
        />
      </div>
      <aside className="today-panel">
        <h2 className="section-title">Today</h2>
        {state.role === 'leasing' && (
          <ul className="today-list">
            <li>{num(dueToday.length)} follow-ups due today</li>
            {dueToday.slice(0, 5).map((enquiry) => (
              <li key={enquiry.id}>
                <a href={`#/enquiry/${enquiry.id}`} onClick={(event) => { event.preventDefault(); go('enquiry', enquiry.id); }}>
                  {enquiry.business}{enquiry.lot ? `, ${enquiryUnitLabel(enquiry, units)}` : ''}
                </a>
              </li>
            ))}
            <li><a href="#/pipeline" onClick={(event) => { event.preventDefault(); go('pipeline', { view: 'awaiting' }); }}>{num(newCount)} new enquiries</a></li>
          </ul>
        )}
        {state.role === 'management' && (
          <ul className="today-list">
            <li>{num(november.length)} leases expiring in November, {rm(novemberRent)} a month</li>
            <li>
              <p className="today-sub">Awaiting first response</p>
              <ul className="today-list">
                {awaitingList.slice(0, 5).map((enquiry) => (
                  <li key={enquiry.id}>
                    <a href={`#/enquiry/${enquiry.id}`} onClick={(event) => { event.preventDefault(); go('enquiry', enquiry.id); }}>
                      {enquiry.business}{enquiry.lot ? `, ${enquiryUnitLabel(enquiry, units)}` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        )}
        {state.role === 'marketing' && topCampaign && (
          <p><a href={`#/campaign/${topCampaign.id}`} onClick={(event) => { event.preventDefault(); go('campaign', topCampaign.id); }}>{topCampaign.name}: {num(topCampaign.enquiries)} paid enquiries</a></p>
        )}
      </aside>
      </div>
      {assetFiltered && narrowed.length === 0 && (
        <p className="empty-state">No assets match these filters. Clear filters to see all {num(body.length)}.</p>
      )}
      <DataTable
        className="portfolio-fit"
        columns={visibleColumns}
        rows={narrowed}
        totals
        exportName={`portfolio-${month}`}
        tools={(
          <div className="table-toolbar">
            <button type="button" className="btn" aria-expanded={colsOpen} onClick={() => setColsOpen((open) => !open)}>Columns</button>
            {colsOpen && (
              <div className="col-pop" role="group" aria-label="Columns">
                {columns.map((column) => (
                  <label key={column.key}>
                    <input
                      type="checkbox"
                      checked={shownCols.includes(column.key)}
                      onChange={() => setShownCols((current) => (current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key]))}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      />
      {notes.map((row) => (
        <p key={row.id} className="footnote">{row.name}: {row.note}</p>
      ))}
      {totals.eventSpaces > 0 && (
        <p className="footnote">Event spaces: {num(totals.eventSpaces)} (priced per day; not in occupancy)</p>
      )}
    </section>
  );
}

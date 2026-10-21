import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import Filters, { RANGE_PRESETS } from '../components/Filters.jsx';
import Kpi from '../components/Kpi.jsx';
import Num from '../components/Num.jsx';
import Term from '../components/Term.jsx';
import SourceIcon from '../components/SourceIcon.jsx';
import {
  campaignRows, campaignWeeks, funnelSteps, assetMarketing, unpaidInRange, filteredEnquiries, liveAssets, marketingSummary,
} from '../data/selectors.js';
import { totalRow } from '../data/metrics.js';
import { num, rm, rm2, pct, x, date, dayMonth, ratio } from '../format.js';

const CHANNEL_TABLE_NAMES = {
  'Facebook lead ads': 'Facebook lead ads',
  'Instagram ads': 'Instagram ads',
  'Google Ads (Search)': 'Google Ads',
  'Boosted posts (FB/IG)': 'Boosted posts',
};

const flash = (table, key, format) => (value, row) => (
  <Num value={value} format={format} watch={`${table}:${key}:${row?.channel || row?.id || 'total'}`} />
);

function weekLabel(week) {
  const start = dayMonth(week.first);
  const end = dayMonth(week.last);
  return start === end ? start : `${start} – ${end}`;
}

function managingArea(campaign, assets, officers) {
  const ids = [...new Set(Object.keys(campaign.assets).map((id) => assets.find((asset) => asset.id === id)?.officer).filter(Boolean))];
  if (ids.length === 1) return officers[ids[0]]?.area || '–';
  return ids.map((id) => officers[id]?.area).filter(Boolean).join('; ') || '–';
}

function Funnel({ steps }) {
  const max = Math.max(...steps.map((step) => step.value), 1);
  return (
    <div className="funnel" data-testid="funnel">
      {steps.map((step) => (
        <div key={step.id} className="funnel-step">
          <div className="funnel-meta">
            <span>{step.label}</span>
            {step.rate != null ? <Num value={step.rate} format={pct} watch={`funnel-rate:${step.id}`} /> : <span />}
          </div>
          <div className="funnel-track">
            <div className="funnel-bar" style={{ width: `${Math.max(12, (step.value / max) * 100)}%` }}>
              <Num value={step.value} format={num} watch={`funnel:${step.id}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Campaign({ params }) {
  const { state, data } = useStore();
  const requested = params?.[0] || 'sa';
  const campaign = data.campaigns.find((item) => item.id === requested) || data.campaigns.find((item) => item.id === 'sa');
  const [range, setRange] = useState(() => ({ preset: 'full', from: campaign.start, to: campaign.end }));

  useEffect(() => {
    setRange((cur) => (cur.preset === 'full' ? { preset: 'full', from: campaign.start, to: campaign.end } : cur));
  }, [campaign.id, campaign.start, campaign.end]);

  const presets = useMemo(() => ([
    { id: 'full', label: 'Full campaign period', from: campaign.start, to: campaign.end },
    ...RANGE_PRESETS,
  ]), [campaign.start, campaign.end]);

  const rows = useMemo(
    () => campaignRows(data, state, campaign.id, { from: range.from, to: range.to }),
    [data, state, campaign.id, range.from, range.to],
  );
  const totals = useMemo(() => totalRow(rows), [rows]);
  const steps = useMemo(() => funnelSteps(totals), [totals]);
  const weeks = useMemo(
    () => campaignWeeks(data, state, campaign.id, { from: range.from, to: range.to }).map((week) => ({ ...week, label: weekLabel(week) })),
    [data, state, campaign.id, range.from, range.to],
  );
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const assetRows = useMemo(() => Object.keys(campaign.assets).map((id) => {
    const asset = assets.find((item) => item.id === id);
    const slice = assetMarketing(data, state, id, { from: range.from, to: range.to }).byCampaign.find((item) => item.id === campaign.id);
    return {
      id,
      name: asset?.name || id,
      spend: slice?.spend || 0,
      enquiries: slice?.enquiries || 0,
      viewings: slice?.viewings || 0,
      signed: slice?.signed || 0,
      firstYearValue: slice?.firstYearValue || 0,
      cpl: slice?.cpl ?? null,
      roas: slice?.roas ?? null,
    };
  }), [assets, campaign, data, state, range.from, range.to]);
  const unpaid = useMemo(() => unpaidInRange(campaign, { from: range.from, to: range.to }), [campaign, range.from, range.to]);
  const ownedToPaid = useMemo(
    () => marketingSummary(data, state, { campaign: campaign.id, from: range.from, to: range.to }).ownedToPaid,
    [data, state, campaign.id, range.from, range.to],
  );
  const recent = useMemo(() => filteredEnquiries(data, state, { campaign: campaign.id })
    .slice()
    .sort((a, b) => {
      if (a.hero && !b.hero) return -1;
      if (b.hero && !a.hero) return 1;
      return (b.receivedAt || '').localeCompare(a.receivedAt || '');
    })
    .slice(0, 8), [data, state, campaign.id]);

  const channelColumns = [
    { key: 'name', label: 'Channel', width: '10%' },
    { key: 'spend', label: 'Spend', width: '8%', align: 'right', total: 'sum', format: flash('channel', 'spend', rm) },
    { key: 'impressions', label: 'Impressions', width: '10%', align: 'right', total: 'sum', format: flash('channel', 'impressions', num) },
    { key: 'clicks', label: 'Clicks', width: '7%', align: 'right', total: 'sum', format: flash('channel', 'clicks', num) },
    { key: 'ctr', label: 'CTR', width: '5.5%', align: 'right', format: flash('channel', 'ctr', pct), total: (list) => totalRow(list).ctr },
    { key: 'enquiries', label: 'Paid enquiries', width: '8%', align: 'right', total: 'sum', format: flash('channel', 'enquiries', num) },
    { key: 'cpl', label: 'CPL', width: '7.5%', term: 'cpl', align: 'right', format: flash('channel', 'cpl', rm2), total: (list) => totalRow(list).cpl },
    { key: 'viewings', label: 'Viewings', width: '6.5%', align: 'right', total: 'sum', format: flash('channel', 'viewings', num) },
    { key: 'costPerViewing', label: 'Cost per viewing', width: '8%', term: 'cost-per-viewing', align: 'right', format: flash('channel', 'costPerViewing', rm2), total: (list) => totalRow(list).costPerViewing },
    { key: 'signed', label: 'Signed', width: '6.5%', align: 'right', total: 'sum', format: flash('channel', 'signed', num) },
    { key: 'costPerSigned', label: 'Cost per signed tenant', width: '8.5%', term: 'cost-per-signed', align: 'right', format: flash('channel', 'costPerSigned', rm2), total: (list) => totalRow(list).costPerSigned },
    { key: 'firstYearValue', label: 'First-year rental value', width: '8%', align: 'right', total: 'sum', format: flash('channel', 'firstYearValue', rm) },
    { key: 'roas', label: 'ROAS', width: '6.5%', term: 'roas', align: 'right', format: flash('channel', 'roas', x), total: (list) => totalRow(list).roas },
  ];

  const assetColumns = [
    {
      key: 'name',
      label: 'Asset',
      format: (value, row) => (row
        ? <a href={`#/asset/${row.id}`} onClick={(e) => { e.preventDefault(); go('asset', row.id); }}>{value}</a>
        : value),
    },
    { key: 'spend', label: 'Spend', align: 'right', total: 'sum', format: flash('asset', 'spend', rm) },
    { key: 'enquiries', label: 'Paid enquiries', align: 'right', total: 'sum', format: flash('asset', 'enquiries', num) },
    { key: 'viewings', label: 'Viewings', align: 'right', total: 'sum', format: flash('asset', 'viewings', num) },
    { key: 'signed', label: 'Signed', align: 'right', total: 'sum', format: flash('asset', 'signed', num) },
    { key: 'firstYearValue', label: 'First-year value', align: 'right', total: 'sum', format: flash('asset', 'firstYearValue', rm) },
    { key: 'cpl', label: 'CPL', term: 'cpl', align: 'right', format: flash('asset', 'cpl', rm2), total: (list) => totalRow(list).cpl },
    { key: 'roas', label: 'ROAS', term: 'roas', align: 'right', format: flash('asset', 'roas', x), total: (list) => totalRow(list).roas },
  ];

  const unpaidRows = ['Website form', 'Walk-in', 'Referral']
    .filter((source) => Object.prototype.hasOwnProperty.call(unpaid.bySource, source))
    .map((source) => ({ id: source, source, enquiries: unpaid.bySource[source] }));

  return (
    <section>
      <h1 className="page-title">Campaigns</h1>
      <p className="lead">This is the question management asks: which ringgit produced a tenant.</p>
      <div className="tabs" role="tablist" aria-label="Campaigns">
        {data.campaigns.map((item) => (
          <a
            key={item.id}
            href={`#/campaign/${item.id}`}
            role="tab"
            aria-selected={item.id === campaign.id}
            className={item.id === campaign.id ? 'on' : ''}
            onClick={(e) => { e.preventDefault(); go('campaign', item.id); }}
          >
            {item.short}
          </a>
        ))}
      </div>
      <Filters fields={['range']} value={range} onChange={setRange} rangePresets={presets} />
      <header className="campaign-head">
        <h2>{campaign.name}</h2>
        <p>
          {date(range.from)} – {date(range.to)}
          {range.preset !== 'full' ? <span className="muted"> · Campaign period {date(campaign.start)} – {date(campaign.end)}</span> : null}
        </p>
        <p>
          Assets:{' '}
          {Object.keys(campaign.assets).map((id, index) => {
            const asset = assets.find((item) => item.id === id);
            return (
              <span key={id}>
                {index > 0 ? ', ' : ''}
                <a href={`#/asset/${id}`} onClick={(e) => { e.preventDefault(); go('asset', id); }}>{asset?.name || id}</a>
              </span>
            );
          })}
        </p>
        <p>Managing area: {managingArea(campaign, assets, data.officers)}</p>
      </header>
      <div className="kpi-row">
        <Kpi label="Spend" value={totals.spend} format={rm} testId="campaign-spend" />
        <Kpi label="Paid enquiries" value={totals.enquiries} format={num} testId="campaign-enquiries" />
        <Kpi label="Viewings" value={totals.viewings} format={num} testId="campaign-viewings" />
        <Kpi label="Signed" value={totals.signed} format={num} testId="campaign-signed" />
        <Kpi label="CPL" term="cpl" value={totals.cpl} format={rm2} testId="campaign-cpl" />
        <Kpi label="Cost per viewing" term="cost-per-viewing" value={totals.costPerViewing} format={rm2} testId="campaign-cpv" />
        <Kpi label="Cost per signed tenant" term="cost-per-signed" value={totals.costPerSigned} format={rm2} testId="campaign-cps" />
        <Kpi label="First-year rental value" value={totals.firstYearValue} format={rm} testId="campaign-fyv" />
        <Kpi label="ROAS" term="roas" value={totals.roas} format={x} testId="campaign-roas" />
      </div>
      <h2 className="section-title">Funnel</h2>
      <Funnel steps={steps} />
      <h2 className="section-title">Channels</h2>
      <DataTable
        className="channel-fit"
        columns={channelColumns}
        rows={rows.map((row) => ({ ...row, name: CHANNEL_TABLE_NAMES[row.name] || row.name }))}
        totals
        exportName={`campaign-${campaign.id}-channels`}
      />
      <h2 className="section-title">Weekly spend and paid enquiries</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={2} vertical={false} />
            <XAxis dataKey="label" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis yAxisId="spend" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <YAxis yAxisId="enquiries" orientation="right" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <Tooltip
              formatter={(value, name) => (name === 'Spend (RM)' ? rm(value) : num(value))}
              contentStyle={{ fontSize: 16, color: 'var(--ink)' }}
              labelStyle={{ fontSize: 16, color: 'var(--ink)' }}
            />
            <Legend wrapperStyle={{ fontSize: 14, color: 'var(--ink)' }} />
            <Bar yAxisId="spend" dataKey="spend" name="Spend (RM)" fill="var(--s2)" maxBarSize={28} />
            <Line yAxisId="enquiries" dataKey="enquiries" name="Paid enquiries" stroke="var(--s1)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <h2 className="section-title">By asset</h2>
      <DataTable columns={assetColumns} rows={assetRows} totals exportName={`campaign-${campaign.id}-assets`} />
      <h2 className="section-title">Unpaid enquiries</h2>
      <p className="lead">Shown separately. Unpaid enquiries are not included in CPL or ROAS.</p>
      <DataTable
        columns={[
          { key: 'source', label: 'Source' },
          { key: 'enquiries', label: 'Enquiries', align: 'right', total: 'sum', format: flash('unpaid', 'enquiries', num) },
        ]}
        rows={unpaidRows}
        totals
        exportName={`campaign-${campaign.id}-unpaid`}
      />
      <p className="footnote" data-testid="owned-to-paid">
        <Term id="owned-to-paid">Owned-to-paid ratio</Term>: <Num value={ownedToPaid} format={ratio} />
      </p>
      <h2 className="section-title">Recent enquiries</h2>
      <ul className="recent" data-testid="recent-enquiries">
        {recent.map((enquiry) => {
          const asset = assets.find((item) => item.id === enquiry.asset);
          return (
            <li key={enquiry.id}>
              <a href={`#/enquiry/${enquiry.id}`} onClick={(e) => { e.preventDefault(); go('enquiry', enquiry.id); }}>
                <SourceIcon source={enquiry.source} />
                <span>
                  <strong>{enquiry.business}</strong>
                  <span className="cell-note">
                    {enquiry.source || '–'}
                    {campaign.short ? ` · ${campaign.short}` : ''}
                    {asset ? ` · ${asset.short}` : ''}
                    {enquiry.lot ? ` · ${enquiry.lot}` : ''}
                    {' · '}{enquiry.stage}
                    {' · '}{date(enquiry.receivedAt)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
        {recent.length === 0 && <li>No enquiries for this campaign.</li>}
      </ul>
    </section>
  );
}

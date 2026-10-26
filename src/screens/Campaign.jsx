import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { useStore } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go, useRoute } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import Filters, { RANGE_PRESETS } from '../components/Filters.jsx';
import Kpi from '../components/Kpi.jsx';
import Num from '../components/Num.jsx';
import Term from '../components/Term.jsx';
import SourceIcon from '../components/SourceIcon.jsx';
import {
  campaignRows, campaignWeeks, assetMarketing, unpaidInRange, filteredEnquiries, liveAssets, marketingSummary,
} from '../data/selectors.js';
import { CHANNELS } from '../data/config.js';
import { displaySource, enquiryUnitLabel } from '../labels.js';
import { dateTime } from '../format.js';
import { totalRow } from '../data/metrics.js';
import { num, rm, rm2, pct, x, date, dayMonth, ratio } from '../format.js';
import { lastDayOf } from '../data/generate.js';

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

function managingArea(campaign, assets) {
  const locations = [...new Set(Object.keys(campaign.assets).map((id) => assets.find((asset) => asset.id === id)?.location).filter(Boolean))];
  const distinct = locations.filter((location) => !locations.some((other) => other !== location && other.endsWith(location)));
  return distinct.join(', ') || '–';
}

function officerNames(campaign, assets, officers) {
  const ids = [...new Set(Object.keys(campaign.assets).map((id) => assets.find((asset) => asset.id === id)?.officer).filter(Boolean))];
  return ids.map((id) => officers[id]?.name).filter(Boolean).join(', ') || '–';
}

function JourneyRail({ totals, listQuery }) {
  const steps = [
    { id: 'spend', label: 'Spend', value: totals.spend, format: rm },
    { id: 'impressions', label: 'Impressions', value: totals.impressions, format: num },
    { id: 'clicks', label: 'Clicks', value: totals.clicks, format: num },
    { id: 'enquiries', label: 'Paid enquiries', value: totals.enquiries, format: num },
    { id: 'viewings', label: 'Viewings', value: totals.viewings, format: num },
    { id: 'signed', label: 'Signed', value: totals.signed, format: num },
    { id: 'fyv', label: 'First-year rent', value: totals.firstYearValue, format: rm },
  ];
  return (
    <ol className="journey campaign-rail" data-testid="funnel">
      {steps.map((step, index) => {
        const prev = steps[index - 1];
        const rate = prev && prev.id !== 'spend' && step.id !== 'fyv' && prev.value ? step.value / prev.value : null;
        return (
          <li key={step.id} className="reached">
            <span className="journey-label">{step.label}</span>
            <span className="journey-value" data-testid={step.id === 'enquiries' ? 'campaign-enquiries' : step.id === 'viewings' ? 'campaign-viewings' : step.id === 'signed' ? 'campaign-signed' : undefined}><Num value={step.value} format={step.format} watch={`funnel:${step.id}`} /></span>
            {rate != null && <span className="journey-gap">{step.id === 'clicks' ? 'CTR' : step.id === 'enquiries' ? 'Click to enquiry' : step.id === 'viewings' ? 'Enquiry to viewing' : step.id === 'signed' ? 'Viewing to signed' : 'Conversion'} <Num value={rate} format={pct} watch={`funnel-rate:${step.id}`} /></span>}
            {step.id === 'fyv' && <span className="journey-roas">ROAS <Num value={totals.roas} format={x} watch="funnel:roas" /></span>}
            {step.id === 'enquiries' && <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); go('enquiries', { ...listQuery, paid: 'paid' }); }}>View these enquiries</a>}
            {step.id === 'viewings' && <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); go('enquiries', { ...listQuery, paid: 'paid', when: 'viewing' }); }}>View these enquiries</a>}
            {step.id === 'signed' && <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); go('enquiries', { ...listQuery, paid: 'paid', when: 'signed', outcome: 'signed' }); }}>View these enquiries</a>}
          </li>
        );
      })}
    </ol>
  );
}

const CHANNEL_SOURCE = {
  'Facebook lead ads': 'Facebook Lead Ad',
  'Instagram ads': 'Instagram',
  'Google Ads': 'Google Ads',
  'Boosted posts': 'Boosted post',
};

export default function Campaign({ params }) {
  const { state, data } = useStore();
  const ui = useUi();
  const requested = params?.[0] || 'sa';
  const campaign = data.campaigns.find((item) => item.id === requested) || data.campaigns.find((item) => item.id === 'sa');
  const route = useRoute();
  const [query, setQuery] = useState('');
  const clockDay = String(state.now || '').slice(0, 10);
  const fullTo = campaign.end < clockDay ? campaign.end : clockDay;
  const presets = useMemo(() => {
    const months = ['2026-10', '2026-09', '2026-08', '2026-07']
      .filter((key) => key >= campaign.start.slice(0, 7) && key <= campaign.end.slice(0, 7))
      .map((key) => {
        const end = key === clockDay.slice(0, 7) && clockDay < lastDayOf(key) ? clockDay : lastDayOf(key);
        const names = { '2026-10': 'October', '2026-09': 'September', '2026-08': 'August', '2026-07': 'July' };
        return { id: key, label: names[key], from: `${key}-01`, to: end };
      });
    return [{ id: 'full', label: 'Full campaign', from: campaign.start, to: fullTo }, ...months];
  }, [campaign.start, campaign.end, clockDay, fullTo]);
  const [filters, setFilters] = useState(() => {
    const preset = presets.find((item) => item.id === route.search.period) || presets[0];
    return { preset: preset.id, from: preset.from, to: preset.to, asset: '', channel: '' };
  });

  useEffect(() => {
    const preset = presets.find((item) => item.id === (route.search.period || filters.preset)) || presets[0];
    setFilters((cur) => {
      const assetOk = !cur.asset || Object.prototype.hasOwnProperty.call(campaign.assets, cur.asset);
      const next = route.search.period ? preset : (presets.find((item) => item.id === cur.preset) || preset);
      return { ...cur, asset: assetOk ? cur.asset : '', preset: next.id, from: next.from, to: next.to };
    });
  }, [campaign.id, campaign.assets, route.search.period, presets]);

  const rows = useMemo(
    () => campaignRows(data, state, campaign.id, {
      from: filters.from,
      to: filters.to,
      ...(filters.asset ? { assetId: filters.asset } : {}),
      ...(filters.channel ? { channels: [filters.channel] } : {}),
    }),
    [data, state, campaign.id, filters.from, filters.to, filters.asset, filters.channel],
  );
  const namedRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    const matched = rows.filter((row) => (CHANNEL_TABLE_NAMES[row.name] || row.name).toLowerCase().includes(needle));
    return matched.length ? matched : rows;
  }, [rows, query]);
  const totals = useMemo(() => totalRow(namedRows), [namedRows]);
  const weeks = useMemo(
    () => campaignWeeks(data, state, campaign.id, { from: filters.from, to: filters.to }).map((week) => ({ ...week, label: weekLabel(week) })),
    [data, state, campaign.id, filters.from, filters.to],
  );
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const assetRows = useMemo(() => Object.keys(campaign.assets).map((id) => {
    const asset = assets.find((item) => item.id === id);
    const slice = assetMarketing(data, state, id, { from: filters.from, to: filters.to }).byCampaign.find((item) => item.id === campaign.id);
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
  }), [assets, campaign, data, state, filters.from, filters.to]);
  const shownAssets = assetRows.filter((row) => {
    if (filters.asset && row.id !== filters.asset) return false;
    const needle = query.trim().toLowerCase();
    const channelSearch = needle && namedRows.length !== rows.length;
    if (needle && !channelSearch && !row.name.toLowerCase().includes(needle)) return false;
    return true;
  });
  const campaignAssets = Object.keys(campaign.assets).map((id) => ({
    id,
    name: assets.find((item) => item.id === id)?.name || id,
  }));
  const unpaid = useMemo(
    () => unpaidInRange(campaign, { from: filters.from, to: filters.to }, filters.asset || null),
    [campaign, filters.from, filters.to, filters.asset],
  );
  const ownedToPaid = useMemo(
    () => marketingSummary(data, state, { campaign: campaign.id, from: filters.from, to: filters.to }).ownedToPaid,
    [data, state, campaign.id, filters.from, filters.to],
  );
  const recent = useMemo(() => {
    const channelSource = CHANNELS.find((item) => item.id === filters.channel)?.source || '';
    const needle = query.trim().toLowerCase();
    return filteredEnquiries(data, state, { campaign: campaign.id })
      .filter((enquiry) => {
        if (filters.asset && enquiry.asset !== filters.asset) return false;
        if (channelSource && enquiry.source !== channelSource) return false;
        if (!needle) return true;
        return `${enquiry.business || ''} ${enquiry.lot || ''} ${enquiry.source || ''} ${enquiry.stage || ''} ${enquiry.id || ''}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (a.hero && !b.hero) return -1;
        if (b.hero && !a.hero) return 1;
        return (b.receivedAt || '').localeCompare(a.receivedAt || '');
      })
      .slice(0, 8);
  }, [data, state, campaign.id, filters.asset, filters.channel, query]);

  const channelColumns = [
    {
      key: 'name',
      label: 'Channel',
      format: (value) => (
        <span className="source-line">
          <SourceIcon source={CHANNEL_SOURCE[value]} />
          <span>{value}</span>
        </span>
      ),
    },
    { key: 'spend', label: 'Spend', align: 'right', total: 'sum', format: flash('channel', 'spend', rm) },
    { key: 'impressions', label: 'Impressions', align: 'right', total: 'sum', format: flash('channel', 'impressions', num) },
    { key: 'clicks', label: 'Clicks', align: 'right', total: 'sum', format: flash('channel', 'clicks', num) },
    { key: 'ctr', label: 'CTR', align: 'right', format: flash('channel', 'ctr', pct), total: (list) => totalRow(list).ctr },
    { key: 'enquiries', label: 'Enquiries', head: <span title="Paid enquiries">Enquiries</span>, align: 'right', total: 'sum', format: (value, row) => (
      <span className="cell-stack">
        {flash('channel', 'enquiries', num)(value, row)}
        {row?.channel && <a className="view-link" href="#/enquiries" onClick={(event) => { event.preventDefault(); event.stopPropagation(); go('enquiries', { campaign: campaign.id, source: CHANNEL_SOURCE[CHANNEL_TABLE_NAMES[row.name] || row.name] || '', paid: 'paid', from: filters.from, to: filters.to }); }}>View these enquiries</a>}
      </span>
    ) },
    { key: 'cpl', label: 'CPL', term: 'cpl', align: 'right', format: flash('channel', 'cpl', rm2), total: (list) => totalRow(list).cpl },
    { key: 'viewings', label: 'Viewings', align: 'right', total: 'sum', format: flash('channel', 'viewings', num) },
    { key: 'costPerViewing', label: 'Cost / viewing', head: <span title="Cost per viewing">Cost / viewing</span>, term: 'cost-per-viewing', align: 'right', format: flash('channel', 'costPerViewing', rm2), total: (list) => totalRow(list).costPerViewing },
    { key: 'signed', label: 'Signed', align: 'right', total: 'sum', format: flash('channel', 'signed', num) },
    { key: 'costPerSigned', label: 'Cost / signed', head: <span title="Cost per signed tenant">Cost / signed</span>, term: 'cost-per-signed', align: 'right', format: flash('channel', 'costPerSigned', rm2), total: (list) => totalRow(list).costPerSigned },
    { key: 'firstYearValue', label: 'First-year rent', head: <span title="First-year rental value">First-year rent</span>, align: 'right', total: 'sum', format: flash('channel', 'firstYearValue', rm) },
    { key: 'roas', label: 'ROAS', term: 'roas', align: 'right', format: flash('channel', 'roas', x), total: (list) => totalRow(list).roas },
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
      <Filters
        query={query}
        onQuery={setQuery}
        fields={['asset', 'channel', 'range']}
        value={filters}
        onChange={setFilters}
        assets={campaignAssets}
        channels={CHANNELS}
        rangePresets={presets}
        periodDefault="full"
      />
      <header className="campaign-head">
        <h1 className="page-title">{campaign.name}</h1>
        <p data-testid="campaign-period">
          {filters.preset === 'full' ? `${dayMonth(campaign.start)} – ${dayMonth(fullTo)} ${fullTo.slice(0, 4)} (to date)` : `${date(filters.from)} to ${date(filters.to)}`}
        </p>
        <p className="campaign-meta">
          {Object.keys(campaign.assets).map((id, index) => {
            const asset = assets.find((item) => item.id === id);
            return (
              <span key={id}>
                {index > 0 ? ', ' : ''}
                <a href={`#/asset/${id}`} onClick={(e) => { e.preventDefault(); go('asset', id); }}>{asset?.name || id}</a>
              </span>
            );
          })}
          {' · '}
          {managingArea(campaign, assets)}
          {' · Officer: '}
          {officerNames(campaign, assets, data.officers)}
        </p>
      </header>
      <div className="kpi-row">
        <Kpi label="CPL" term="cpl" value={totals.cpl} format={rm2} testId="campaign-cpl" />
        <Kpi label="Cost per viewing" term="cost-per-viewing" value={totals.costPerViewing} format={rm2} testId="campaign-cpv" />
        <Kpi label="Cost per signed tenant" term="cost-per-signed" value={totals.costPerSigned} format={rm2} testId="campaign-cps" />
        <Kpi label="ROAS" term="roas" value={totals.roas} format={x} testId="campaign-roas" />
      </div>
      <h2 className="section-title">Journey</h2>
      <JourneyRail totals={totals} listQuery={{ campaign: campaign.id, asset: filters.asset, from: filters.from, to: filters.to, received: filters.preset === 'full' ? 'campaign' : 'month' }} />
      <h2 className="section-title">Channels</h2>
      {namedRows.length === 0 ? (
        <p className="empty-state">No channels match these filters. Clear filters to see the full campaign.</p>
      ) : (
        <DataTable
          className="channel-fit"
          columns={channelColumns}
          rows={namedRows.map((row) => ({ ...row, name: CHANNEL_TABLE_NAMES[row.name] || row.name }))}
          totals
          exportName={`campaign-${campaign.id}-channels`}
        />
      )}
      <h2 className="section-title">Weekly spend and paid enquiries</h2>
      {(filters.asset || filters.channel) && (
        <p className="footnote">This weekly chart is the whole campaign. Asset and channel filters apply to the figures and the channel table above.</p>
      )}
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={2} vertical={false} />
            <XAxis dataKey="label" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis yAxisId="spend" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <YAxis yAxisId="enquiries" orientation="right" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <Tooltip
              separator=" "
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="chart-tip">
                    <p>{label}</p>
                    {payload.map((item) => <p key={item.dataKey}>{item.name} {item.name === 'Spend (RM)' ? rm(item.value) : num(item.value)}</p>)}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 14, color: 'var(--ink)' }} />
            <Bar yAxisId="spend" dataKey="spend" name="Spend (RM)" fill="var(--s1)" maxBarSize={28} />
            <Line yAxisId="enquiries" dataKey="enquiries" name="Paid enquiries" stroke="var(--s3)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            {state.heroStage === 'Signed' && campaign.id === 'sa' && weeks.length > 0 && (
                <ReferenceLine
                  yAxisId="enquiries"
                  x={weeks[weeks.length - 1].label}
                  stroke="var(--crest)"
                  strokeWidth={2}
                  label={({ viewBox }) => {
                    const x = (viewBox?.x ?? 0) - 136;
                    const y = 8;
                    return (
                      <g>
                        <rect x={x} y={y} width="128" height="20" rx="8" fill="#ffffff" stroke="#E2E5EA" />
                        <text x={x + 8} y={y + 14} fill="#231F20" fontSize="14" fontFamily="Inter, sans-serif">Suite 4-07 signed</text>
                      </g>
                    );
                  }}
                />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <h2 className="section-title">By asset</h2>
      {filters.channel ? (
        <p className="footnote">Asset rows stay for the whole asset. They are not split by channel, so the channel filter applies to the figures above.</p>
      ) : shownAssets.length === 0 ? (
        <p className="empty-state">No assets match these filters. Clear filters to see every asset in this campaign.</p>
      ) : (
        <DataTable columns={assetColumns} rows={shownAssets} totals exportName={`campaign-${campaign.id}-assets`} />
      )}
      <h2 className="section-title">Unpaid enquiries</h2>
      {filters.channel ? <p className="footnote">Unpaid enquiries are not split by paid channel.</p> : null}
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
      <p className="ratio-row" data-testid="owned-to-paid">
        <Term id="owned-to-paid">Owned-to-paid ratio</Term>
        <Num value={ownedToPaid} format={ratio} />
      </p>
      <h2 className="section-title">Recent enquiries</h2>
      <ul className="recent" data-testid="recent-enquiries">
        {recent.map((enquiry) => (
            <li key={enquiry.id} className="list-row">
              <a href={`#/enquiry/${enquiry.id}`} onClick={(e) => { e.preventDefault(); ui.openRecord(enquiry.id); }}>
                <SourceIcon source={enquiry.source} />
                <span>
                  <strong>{enquiry.business}</strong>
                  <span className="cell-note">{displaySource(enquiry.source)}</span>
                </span>
                <span className="lot-chip">{enquiryUnitLabel(enquiry, data.units)}</span>
                <span className="stage-pill">{enquiry.stage}</span>
                <span>{dateTime(enquiry.receivedAt)}</span>
              </a>
            </li>
        ))}
        {recent.length === 0 && <li className="empty-state">No enquiries match these filters. Clear filters to see this campaign.</li>}
      </ul>
    </section>
  );
}

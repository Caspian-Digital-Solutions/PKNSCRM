import { useMemo, useState } from 'react';
import SourceIcon from '../components/SourceIcon.jsx';
import Sparkline from '../components/Sparkline.jsx';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList } from 'recharts';
import { useStore } from '../store.jsx';
import DataTable from '../components/DataTable.jsx';
import Filters from '../components/Filters.jsx';
import Kpi from '../components/Kpi.jsx';
import Num from '../components/Num.jsx';
import SampleHeatmap from '../components/SampleHeatmap.jsx';
import { campaignRows, liveAssets, marketingSummary } from '../data/selectors.js';
import { totalRow } from '../data/metrics.js';
import { CHANNELS } from '../data/config.js';
import { num, rm, rm2, pct, x, dayMonth, pctPlain, signedChange } from '../format.js';

const flash = (key, format) => (value, row) => (
  <Num value={value} format={format} watch={`marketing:${key}:${row?.id || row?.channel || row?.name || 'total'}`} />
);

export default function Marketing() {
  const { state, data } = useStore();
  const [tab, setTab] = useState('overview');
  const [postsAsTable, setPostsAsTable] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    asset: '',
    campaign: '',
    channel: '',
    preset: '2026-10',
    from: '2026-10-01',
    to: '2026-10-31',
  });
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const summary = useMemo(() => marketingSummary(data, state, {
    asset: filters.asset,
    campaign: filters.campaign,
    channel: filters.channel,
    from: filters.from,
    to: filters.to,
  }), [data, state, filters.asset, filters.campaign, filters.channel, filters.from, filters.to]);

  const daily = summary.website.days.map((day, index) => ({
    label: dayMonth(day),
    sessions: summary.website.dailySessions[index],
  }));

  const organicColumns = [
    { key: 'page', label: 'Page' },
    { key: 'platform', label: 'Platform' },
    {
      key: 'followers',
      label: 'Followers',
      align: 'right',
      format: (value, row) => (
        <span data-testid={row?.id === 'pkns-fb' || row?.id === 'pkns-ig' ? `followers-${row.id}` : undefined}>
          <Num value={value} format={num} watch={`followers:${row?.id}`} />
        </span>
      ),
    },
    { key: 'followerChange', label: 'Follower change', align: 'right', format: (value) => signedChange(value, num) },
    { key: 'reach', label: 'Organic reach', align: 'right', format: flash('reach', num) },
    { key: 'engagements', label: 'Engagements', align: 'right', format: flash('engagements', num) },
    { key: 'er', label: 'Engagement rate', align: 'right', format: (value) => pctPlain(value) },
  ];

  const paidColumns = [
    { key: 'name', label: 'Channel' },
    { key: 'spend', label: 'Spend', align: 'right', total: 'sum', format: flash('paid-spend', rm) },
    { key: 'impressions', label: 'Impressions', align: 'right', total: 'sum', format: flash('paid-impressions', num) },
    { key: 'clicks', label: 'Clicks', align: 'right', total: 'sum', format: flash('paid-clicks', num) },
    { key: 'enquiries', label: 'Paid enquiries', align: 'right', total: 'sum', format: flash('paid-enquiries', num) },
    {
      key: 'cpl',
      label: 'CPL',
      align: 'right',
      format: flash('paid-cpl', rm2),
      total: (list) => {
        const spend = list.reduce((sum, row) => sum + (Number(row.spend) || 0), 0);
        const enquiries = list.reduce((sum, row) => sum + (Number(row.enquiries) || 0), 0);
        return enquiries ? spend / enquiries : null;
      },
    },
  ];

  const postColumns = [
    { key: 'caption', label: 'Caption' },
    { key: 'channel', label: 'Channel' },
    { key: 'type', label: 'Type' },
    { key: 'reach', label: 'Reach', align: 'right', format: (value) => num(value) },
    { key: 'engagements', label: 'Engagements', align: 'right', format: (value) => num(value) },
    { key: 'clicks', label: 'Link clicks', align: 'right', format: (value) => num(value) },
    { key: 'boosted', label: 'Boosted spend', align: 'right', format: (value) => rm(value) },
  ];

  const pageColumns = [
    { key: 'name', label: 'Page' },
    { key: 'sessions', label: 'Sessions', align: 'right', format: (value) => num(value) },
  ];

  const googleColumns = [
    { key: 'short', label: 'Campaign' },
    { key: 'spend', label: 'Spend', align: 'right', format: (value) => rm(value) },
    { key: 'impressions', label: 'Impressions', align: 'right', format: (value) => num(value) },
    { key: 'clicks', label: 'Clicks', align: 'right', format: (value) => num(value) },
    { key: 'ctr', label: 'CTR', align: 'right', format: (value) => pct(value) },
    { key: 'cpc', label: 'CPC', align: 'right', format: (value) => rm2(value) },
    { key: 'conversions', label: 'Conversions', align: 'right', format: (value) => num(value) },
    { key: 'costPerConversion', label: 'Cost per conversion', align: 'right', format: (value) => rm2(value) },
  ];

  const campaignTable = useMemo(() => data.campaigns.map((campaign) => {
    const totals = totalRow(campaignRows(data, state, campaign.id, {
      from: filters.from,
      to: filters.to,
      ...(filters.asset ? { assetId: filters.asset } : {}),
      ...(filters.channel ? { channels: [filters.channel] } : {}),
    }));
    return { id: campaign.id, name: campaign.short, spend: totals.spend, enquiries: totals.enquiries, signed: totals.signed, roas: totals.roas };
  }), [data, state, filters.asset, filters.channel, filters.from, filters.to]);
  const paid = summary.paid;
  const google = summary.google;
  const matches = (...parts) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return parts.join(' ').toLowerCase().includes(needle);
  };
  const socialRows = summary.social.filter((row) => matches(row.page, row.platform));
  const pageRows = summary.website.topPages.filter((row) => matches(row.name));
  const postRows = summary.topPosts.filter((row) => matches(row.caption, row.type, row.channel));
  const paidRows = summary.paidSocial.filter((row) => matches(row.name));
  const googleRows = google.campaigns.filter((row) => matches(row.short, row.name));

  return (
    <section>
      <h1 className="page-title">Marketing dashboard</h1>
      <p className="lead">Your whole digital footprint in one place, and content decisions based on enquiries, not on likes.</p>
      <Filters
        query={query}
        onQuery={setQuery}
        value={filters}
        onChange={setFilters}
        assets={assets}
        campaigns={data.campaigns}
        channels={CHANNELS}
        fields={['asset', 'campaign', 'channel', 'range']}
        periodDefault="2026-10"
      />

      <div className="tabs" role="tablist" aria-label="Marketing">
        {[['overview', 'Overview'], ['website', 'Website'], ['social', 'Social'], ['google', 'Google Ads']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
      <>
      <h2 className="section-title">Spend against results</h2>
      <div className="kpi-row">
        <Kpi label="Spend" value={paid.spend} format={rm} testId="mkt-spend" />
        <Kpi label="Impressions" value={paid.impressions} format={num} testId="mkt-impressions" />
        <Kpi label="Clicks" value={paid.clicks} format={num} testId="mkt-clicks" />
        <Kpi label="Paid enquiries" value={paid.enquiries} format={num} testId="mkt-enquiries" />
        <Kpi label="CPL" term="cpl" value={paid.cpl} format={rm2} testId="mkt-cpl" />
        <Kpi label="Viewings" value={paid.viewings} format={num} testId="mkt-viewings" />
        <Kpi label="Signed" value={paid.signed} format={num} testId="mkt-signed" />
        <Kpi label="Cost per signed tenant" term="cost-per-signed" value={paid.costPerSigned} format={rm2} testId="mkt-cps" />
        <Kpi label="ROAS" term="roas" value={paid.roas} format={x} testId="mkt-roas" />
      </div>
      <div className="panel-grid">
        <div>
          <h2 className="section-title">Spend by channel</h2>
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byChannel} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 14, fill: 'var(--ink-2)' }} />
                <YAxis tick={{ fontSize: 14, fill: 'var(--muted)' }} tickFormatter={(value) => num(value)} />
                <Tooltip formatter={(value) => rm(value)} />
                <Bar dataKey="spend" name="Spend" fill="var(--s1)" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2 className="section-title">Paid enquiries by channel</h2>
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byChannel} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 14, fill: 'var(--ink-2)' }} />
                <YAxis tick={{ fontSize: 14, fill: 'var(--muted)' }} tickFormatter={(value) => num(value)} />
                <Tooltip formatter={(value) => num(value)} />
                <Bar dataKey="enquiries" name="Paid enquiries" fill="var(--s2)" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <h2 className="section-title">Campaigns</h2>
      <DataTable
        columns={[
          { key: 'name', label: 'Campaign' },
          { key: 'spend', label: 'Spend', align: 'right', format: (value) => rm(value) },
          { key: 'enquiries', label: 'Paid enquiries', align: 'right', format: (value) => num(value) },
          { key: 'signed', label: 'Signed', align: 'right', format: (value) => num(value) },
          { key: 'roas', label: 'ROAS', align: 'right', format: (value) => x(value) },
        ]}
        rows={campaignTable}
        exportName="marketing-campaigns"
      />
      </>
      )}

      {tab === 'website' && (
      <>
      <h2 className="section-title">Website</h2>
      {summary.website.filteredLabel ? <p className="footnote" data-testid="website-scope">{summary.website.filteredLabel}</p> : null}
      <div className="kpi-row">
        <Kpi label="Sessions" value={summary.website.sessions} format={num} testId="web-sessions" />
        <Kpi label="Users" value={summary.website.users} format={num} testId="web-users" />
      </div>
      <div className="panel-grid">
        <div>
          <h3 className="section-title">Traffic sources</h3>
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.website.sources} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeWidth={2} horizontal={false} />
                <XAxis type="number" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
                <YAxis type="category" dataKey="name" width={130} stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} />
                <Tooltip formatter={(value) => num(value)} contentStyle={{ fontSize: 16, color: 'var(--ink)' }} />
                <Bar dataKey="sessions" name="Sessions" fill="var(--s2)" barSize={16}>
                  <LabelList
                    dataKey="sessions"
                    position="right"
                    formatter={(value) => `${num(value)} · ${pct((Number(value) || 0) / (summary.website.sessions || 1))}`}
                    style={{ fontSize: 14, fill: '#4B4F56', fontFamily: 'Inter, sans-serif' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <h3 className="section-title">Daily sessions</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeWidth={2} vertical={false} />
                <XAxis dataKey="label" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} interval={daily.length > 16 ? 4 : 0} angle={-30} textAnchor="end" height={70} />
                <YAxis stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
                <Tooltip formatter={(value) => num(value)} contentStyle={{ fontSize: 16, color: 'var(--ink)' }} />
                <Line dataKey="sessions" name="Sessions" stroke="var(--s1)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="section-title">Sample heatmap</h3>
          <SampleHeatmap />
        </div>
      </div>
      <h3 className="section-title">Top pages</h3>
      {query.trim() && pageRows.length === 0 && <p className="empty-state">No pages match this search. Clear filters to see the pages for this period.</p>}
      <DataTable columns={pageColumns} rows={pageRows} exportName="website-top-pages" />

      </>
      )}

      {tab === 'social' && (
      <>
      <h2 className="section-title">Facebook and Instagram</h2>
      <h3 className="section-title">Organic</h3>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Platform</th>
              <th>Followers</th>
              <th>Change</th>
              <th>Organic reach</th>
              <th>Engagements</th>
              <th>Engagement rate</th>
            </tr>
          </thead>
          <tbody>
            {socialRows.map((row) => (
              <tr key={row.id}>
                <td>{row.page}</td>
                <td>{row.platform}</td>
                <td data-testid={row.id === 'pkns-fb' || row.id === 'pkns-ig' ? `followers-${row.id}` : undefined}>
                  <Num value={row.followers} format={num} watch={`followers:${row.id}`} />
                </td>
                <td>{row.followerChange == null ? '–' : signedChange(row.followerChange, num)}</td>
                <td>{num(row.reach)}</td>
                <td>{num(row.engagements)}</td>
                <td>{pctPlain(row.er)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="section-title">Paid</h3>
      <p className="footnote">Paid social is separate from organic. The two are not added together.</p>
      {query.trim() && socialRows.length === 0 && paidRows.length === 0 && <p className="empty-state">No social rows match this search. Clear filters to see every page and channel.</p>}
      <DataTable columns={paidColumns} rows={paidRows} totals exportName="paid-social" />
      <h3 className="section-title">Top posts</h3>
      <button type="button" className="btn" onClick={() => setPostsAsTable((on) => !on)}>{postsAsTable ? 'View as cards' : 'View as table'}</button>
      {postsAsTable ? (
        <DataTable columns={postColumns} rows={postRows} exportName="top-posts" />
      ) : (
        <div className="post-grid">
          {postRows.map((post) => (
            <article key={post.caption} className="post-card">
              <div className="ad-image" aria-hidden="true" />
              <span className="stage-pill">{post.type}</span>
              <p>{post.caption}</p>
              <div className="metric-grid">
                <span>Reach {num(post.reach)}</span>
                <span>Engagements {num(post.engagements)}</span>
                <span>Clicks {num(post.clicks)}</span>
                <span>Boosted {rm(post.boosted)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      </>
      )}

      {tab === 'google' && (
      <>
      <h2 className="section-title">Google Ads</h2>
      <div className="kpi-row">
        <Kpi label="Spend" value={google.spend} format={rm} testId="google-spend" />
        <Kpi label="Impressions" value={google.impressions} format={num} testId="google-impressions" />
        <Kpi label="Clicks" value={google.clicks} format={num} testId="google-clicks" />
        <Kpi label="CTR" value={google.ctr} format={pct} testId="google-ctr" />
        <Kpi label="CPC" value={google.cpc} format={rm2} testId="google-cpc" />
        <Kpi label="Conversions" value={google.conversions} format={num} testId="google-conversions" />
        <Kpi label="Cost per conversion" value={google.costPerConversion} format={rm2} testId="google-cpcv" />
      </div>
      {query.trim() && googleRows.length === 0 && <p className="empty-state">No Google Ads campaigns match this search. Clear filters to see them all.</p>}
      <DataTable columns={googleColumns} rows={googleRows} exportName="google-ads" />
      </>
      )}
    </section>
  );
}

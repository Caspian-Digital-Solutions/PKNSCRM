import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { TrendChart } from '../components/Charts.jsx';
import { PageHead, SampleBadge, SearchBox } from '../components/bits.jsx';
import { DIGITAL_CHANNELS, INTEGRATIONS } from '../data/config.js';
import { adsIn, digitalRows, postsIn } from '../data/selectors.js';
import { engagementRate } from '../data/metrics.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct, rm } from '../format.js';

const CONNECTORS = ['meta', 'ga', 'ads', 'heat', 'tiktok'];
const ACCOUNTS = {
  meta: { account: 'PKNS AMP – Meta Business', sync: '28 Oct 2026, 08:10' },
  ga: { account: 'pkns.gov.my – GA4', sync: '28 Oct 2026, 08:10' },
  ads: { account: 'PKNS AMP – Google Ads', sync: '28 Oct 2026, 08:10' },
  heat: { account: 'pkns.gov.my heatmap', sync: '28 Oct 2026, 08:10' },
  tiktok: { account: 'PKNS AMP – TikTok', sync: '28 Oct 2026, 08:10' },
};

export default function Channels() {
  const { data, scope, assets } = useAmp();
  const [query, setQuery] = useState('');
  const [postQuery, setPostQuery] = useState('');
  const assetName = (id) => assets.find((asset) => asset.id === id)?.shortCode || id;
  const rows = useMemo(() => digitalRows(data, scope), [data, scope]);
  const months = useMemo(() => [...new Set(rows.map((row) => row.month))].sort(), [rows]);
  const monthly = useMemo(() => months.map((month) => {
    const point = { month };
    DIGITAL_CHANNELS.forEach((channel) => {
      point[channel] = rows.filter((row) => row.month === month && row.channel === channel).reduce((sum, row) => sum + row.reach, 0);
    });
    return point;
  }), [months, rows]);
  const tableRows = useMemo(() => {
    const list = [];
    months.forEach((month) => {
      DIGITAL_CHANNELS.forEach((channel) => {
        const slice = rows.filter((row) => row.month === month && row.channel === channel);
        const reach = slice.reduce((sum, row) => sum + row.reach, 0);
        const engagements = slice.reduce((sum, row) => sum + row.engagements, 0);
        list.push({
          id: `${month}-${channel}`,
          month,
          channel,
          reach,
          impressions: slice.reduce((sum, row) => sum + row.impressions, 0),
          engagements,
          rate: engagementRate(engagements, reach),
          clicks: slice.reduce((sum, row) => sum + row.clicks, 0),
          spendRM: slice.reduce((sum, row) => sum + row.spendRM, 0),
          formSubmissions: slice.reduce((sum, row) => sum + row.formSubmissions, 0),
          followersGained: slice.reduce((sum, row) => sum + row.followersGained, 0),
        });
      });
    });
    const q = query.trim().toLowerCase();
    return q ? list.filter((row) => `${row.month} ${row.channel}`.toLowerCase().includes(q)) : list;
  }, [months, rows, query]);
  const posts = useMemo(() => {
    const q = postQuery.trim().toLowerCase();
    return postsIn(data, scope)
      .map((post) => ({ ...post, asset: assetName(post.assetId), boostedLabel: post.boosted ? 'Y' : 'N' }))
      .filter((post) => !q || `${post.caption} ${post.channel} ${post.asset}`.toLowerCase().includes(q));
  }, [data, scope, postQuery, assets]);
  const ads = useMemo(() => adsIn(data, scope).map((row) => ({
    ...row,
    asset: assetName(row.assetId),
    cost: row.conversions ? row.spendRM / row.conversions : null,
  })), [data, scope, assets]);
  const pages = data.webPages || [];
  const connectors = INTEGRATIONS.filter((item) => CONNECTORS.includes(item.id));

  return (
    <section>
      <PageHead title="Digital Channels" lede="Read-only performance. PKNS keeps its own media and social agencies." />
      <div className="card-grid">
        {connectors.map((item) => (
          <article key={item.id} className="info-card">
            <div className="screen-actions"><SampleBadge /></div>
            <h2>{item.name}</h2>
            <p>Status: {item.status === 'Sample data' ? 'Not connected' : item.status}</p>
            <p>Access type: {item.access}</p>
            <p>Account: {ACCOUNTS[item.id]?.account}</p>
            <p>Last sync: {ACCOUNTS[item.id]?.sync}</p>
          </article>
        ))}
      </div>
      <p className="note">PKNS retains its own media and social agencies. The AMP Hub reads performance data only and does not manage campaigns.</p>
      <h2>Reach by channel</h2>
      <TrendChart data={monthly} lines={DIGITAL_CHANNELS.map((channel) => ({ key: channel, name: channel }))} />
      <div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search month or channel" /></div>
      <DataTable
        columns={[
          { key: 'month', label: 'Month' },
          { key: 'channel', label: 'Channel' },
          { key: 'reach', label: 'Reach', align: 'right', format: num },
          { key: 'impressions', label: 'Impressions', align: 'right', format: num },
          { key: 'engagements', label: 'Engagements', align: 'right', format: num },
          { key: 'rate', label: 'Engagement rate', align: 'right', format: pct },
          { key: 'clicks', label: 'Clicks', align: 'right', format: num },
          { key: 'spendRM', label: 'Spend', align: 'right', format: rm },
          { key: 'formSubmissions', label: 'Form submissions', align: 'right', format: num },
          { key: 'followersGained', label: 'Followers gained', align: 'right', format: num },
        ]}
        rows={tableRows}
        exportName="digital-channels"
        pageSizes={[25, 50, 100]}
        empty="No digital rows in this filter."
      />
      <h2>Post performance</h2>
      <div className="table-toolbar"><SearchBox value={postQuery} onChange={setPostQuery} placeholder="Search posts" /></div>
      <DataTable
        columns={[
          { key: 'date', label: 'Date', format: date },
          { key: 'channel', label: 'Channel' },
          { key: 'asset', label: 'Asset' },
          { key: 'caption', label: 'Caption' },
          { key: 'boostedLabel', label: 'Boosted' },
          { key: 'reach', label: 'Reach', align: 'right', format: num },
          { key: 'engagements', label: 'Engagements', align: 'right', format: num },
          { key: 'comments', label: 'Comments', align: 'right', format: num },
          { key: 'positive', label: 'Positive', align: 'right', format: num },
          { key: 'neutral', label: 'Neutral', align: 'right', format: num },
          { key: 'negative', label: 'Negative', align: 'right', format: num },
        ]}
        rows={posts}
        exportName="social-posts"
        pageSizes={[25, 50, 100]}
        empty="No posts in this filter."
      />
      <h2>Website</h2>
      <SampleBadge />
      <DataTable
        columns={[
          { key: 'path', label: 'Page' },
          { key: 'title', label: 'Title' },
          { key: 'sessions', label: 'Sessions', align: 'right', format: num },
          { key: 'submissions', label: 'Form submissions', align: 'right', format: num },
        ]}
        rows={pages.map((page) => ({ ...page, id: page.path }))}
        exportName="website-pages"
        empty="No website pages."
      />
      <h2>Heatmap summary (via heatmap tool)</h2>
      <div className="heat-placeholder" role="img" aria-label="Heatmap summary (via heatmap tool)">
        <span>Heatmap summary (via heatmap tool)</span>
      </div>
      <h2>Google Ads</h2>
      <SampleBadge />
      <DataTable
        columns={[
          { key: 'name', label: 'Campaign' },
          { key: 'asset', label: 'Asset' },
          { key: 'month', label: 'Month' },
          { key: 'spendRM', label: 'Spend', align: 'right', format: rm },
          { key: 'impressions', label: 'Impressions', align: 'right', format: num },
          { key: 'clicks', label: 'Clicks', align: 'right', format: num },
          { key: 'conversions', label: 'Conversions', align: 'right', format: num },
          { key: 'cost', label: 'Cost per conversion', align: 'right', format: rm },
        ]}
        rows={ads}
        exportName="google-ads"
        pageSizes={[25, 50, 100]}
        empty="No Google Ads rows in this filter. Spend is zero before July 2026."
      />
    </section>
  );
}

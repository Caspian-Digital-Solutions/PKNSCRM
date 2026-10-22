import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import Filters from '../components/Filters.jsx';
import Field from '../components/Field.jsx';
import Kpi from '../components/Kpi.jsx';
import { liveAssets, visitorSummary } from '../data/selectors.js';
import { num, rm, pct, dayMonth, tooltipDate } from '../format.js';

function VisitorDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={payload.weekend ? 'var(--crest)' : 'var(--s1)'} />;
}

export default function Visitors({ params }) {
  const { state, data } = useStore();
  const assets = useMemo(() => {
    const ids = Object.keys(data.visitors?.byAsset || {});
    return ids.map((id) => liveAssets(data, state).find((asset) => asset.id === id)).filter(Boolean);
  }, [data, state]);
  const requested = params?.[0];
  const initial = assets.some((asset) => asset.id === requested) ? requested : (assets[0]?.id || '');
  const [assetId, setAssetId] = useState(initial);
  const [range, setRange] = useState({ preset: '2026-10', from: '2026-10-01', to: '2026-10-31' });
  useEffect(() => {
    if (requested && assets.some((asset) => asset.id === requested)) setAssetId(requested);
  }, [requested, assets]);
  const selected = assets.some((asset) => asset.id === assetId) ? assetId : (assets[0]?.id || '');
  const summary = useMemo(
    () => visitorSummary(data, selected, { from: range.from, to: range.to }),
    [data, selected, range.from, range.to],
  );
  const chart = summary.daily.map((day) => ({ ...day, label: dayMonth(day.date) }));

  return (
    <section>
      <h1 className="page-title">Visitors</h1>
      <p className="banner" data-testid="visitors-banner">Future phase: connects to PKNS&apos;s visitor counting system when installed. Figures below are illustrative.</p>
      <div className="screen-head">
        <Field label="Asset">
          <select data-testid="visitor-asset" value={selected} onChange={(event) => setAssetId(event.target.value)}>
            {assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Filters fields={['range']} value={range} onChange={setRange} />
      </div>
      <div className="kpi-row">
        <Kpi label="Average weekday visitors" value={summary.weekdayAverage} format={num} testId="visitors-weekday" />
        <Kpi label="Average weekend visitors" value={summary.weekendAverage} format={num} testId="visitors-weekend" />
        <Kpi label="Total visitors" value={summary.total} format={num} testId="visitors-total" />
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={2} vertical={false} />
            <XAxis dataKey="label" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} interval={chart.length > 40 ? Math.ceil(chart.length / 8) : 2} angle={-30} textAnchor="end" height={70} />
            <YAxis yAxisId="visitors" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <YAxis yAxisId="spend" orientation="right" stroke="var(--ink)" strokeWidth={2} tick={{ fontSize: 14, fill: 'var(--ink)' }} tickFormatter={(value) => num(value)} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload || {};
                return (
                  <div className="chart-tip">
                    <p>{tooltipDate(row.date)}</p>
                    <p>Visitors {num(row.visitors)}</p>
                    <p>SA Sentral spend {rm(row.spend)}</p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 14, color: 'var(--ink-2)' }} />
            <Line yAxisId="visitors" dataKey="visitors" name="Visitors" stroke="var(--s1)" strokeWidth={2} dot={<VisitorDot />} />
            <Bar yAxisId="spend" dataKey="spend" name="SA Sentral spend" fill="var(--s2)" fillOpacity={0.5} maxBarSize={18} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="footnote">Gold marks are weekends. Blue marks are weekdays.</p>
      <h2 className="section-title">Entrances</h2>
      <div className="table-scroll">
        <table className="table data-table" data-testid="entrances">
          <thead>
            <tr>
              <th>Entrance</th>
              <th className="r">Visitors</th>
              <th className="r">Share</th>
            </tr>
          </thead>
          <tbody>
            {summary.entrances.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td className="r">{num(row.visitors)}</td>
                <td className="r">{pct(row.share)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              <td className="r">{num(summary.total)}</td>
              <td className="r">{pct(summary.totalShare)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import { Bubbles, HBars, StackedArea, StackedBars } from '../components/Charts.jsx';
import { PageHead } from '../components/bits.jsx';
import { ACTIVATION_TYPES, AGE_BANDS, ASSET_COLOURS, FESTIVE_BANDS, INTERESTS, LEAD_TYPES, SOURCE_CHANNELS } from '../data/config.js';
import { householdType } from '../data/audienceStats.js';
import { channelMatch, monthKey, monthsBetween, safeDiv } from '../data/metrics.js';
import { useAmp } from '../useAmp.jsx';
import { monthTick } from '../components/Charts.jsx';
import { num, rm } from '../format.js';

const TABS = ['Asset audiences', 'Cross-asset movement', 'What works where', 'Seasonality', 'Interests and tenant mix', 'Capture channels'];
const HOUSE = ['Single', 'Couple', 'Family with kids', 'Multi-generational'];

function heat(value, max) {
  if (!max) return '#fff';
  const t = value / max;
  if (t > 0.75) return '#8F1216';
  if (t > 0.5) return '#E31E24';
  if (t > 0.25) return '#F28B8F';
  if (t > 0) return '#FAD4D5';
  return '#fff';
}

function Heat({ rows, columns, get, mode }) {
  const values = rows.flatMap((row) => columns.map((column) => get(row, column)));
  const max = Math.max(...values, 1);
  return (
    <div className="table-scroll">
      <table className="table data-table">
        <thead><tr><th>Asset</th>{columns.map((column) => <th key={column} className="r">{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              {columns.map((column) => {
                const value = get(row, column);
                const shown = mode === 'pct' ? `${num(row.total ? (value / row.total) * 100 : 0)}%` : num(value);
                const ink = value / max > 0.5 ? '#fff' : '#111827';
                return <td key={column} className="heat-cell" style={{ background: heat(value, max), color: ink }} title={`${row.name} · ${column}: ${shown}`}>{shown}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Insights() {
  const { profiles, activations, assets, scope, allActivations } = useAmp();
  const [tab, setTab] = useState(TABS[0]);
  const [affinityTable, setAffinityTable] = useState(false);
  const [countMode, setCountMode] = useState('count');
  const [metric, setMetric] = useState('Attendance');
  const [bubbleAsset, setBubbleAsset] = useState('');
  const assetList = assets.filter((asset) => scope.assetIds.includes(asset.id));
  const people = useMemo(() => profiles.filter((profile) => !profile.anonymised && profile.firstSeen <= scope.to && channelMatch(profile, scope.channels) && (scope.unrestricted || (profile.assetIds || []).some((id) => scope.assetIds.includes(id)))), [profiles, scope]);
  const legend = assetList.map((asset) => `${asset.shortCode} ${asset.name}`).join(' · ');
  const perAsset = assetList.map((asset) => {
    const mine = people.filter((profile) => (profile.assetIds || []).includes(asset.id));
    return { id: asset.id, name: asset.name, short: asset.shortCode, colour: ASSET_COLOURS[asset.id], people: mine, total: mine.length };
  });
  const acts = (allActivations || activations).filter((act) => scope.assetIds.includes(act.assetId) && (!scope.types.length || scope.types.includes(act.type)) && act.endDate >= scope.from && act.startDate <= scope.to);

  const ageCols = AGE_BANDS;
  const houseCols = HOUSE;
  const interestCols = INTERESTS.slice(0, 6);
  const affinityRows = perAsset.map((row) => {
    const cells = { name: row.name };
    ageCols.forEach((band) => { cells[band] = row.people.filter((profile) => profile.ageBand === band).length; });
    houseCols.forEach((band) => { cells[band] = row.people.filter((profile) => householdType(profile) === band).length; });
    interestCols.forEach((band) => { cells[band] = row.people.filter((profile) => (profile.interests || []).includes(band)).length; });
    return cells;
  });

  const ageMix = perAsset.map((row) => {
    const point = { name: row.short, month: row.short, full: row.name };
    const total = row.total || 1;
    AGE_BANDS.forEach((band) => { point[band] = countMode === 'pct' ? Math.round((row.people.filter((profile) => profile.ageBand === band).length / total) * 1000) / 10 : row.people.filter((profile) => profile.ageBand === band).length; });
    return point;
  });
  const houseMix = perAsset.map((row) => {
    const point = { name: row.short, month: row.short };
    HOUSE.forEach((band) => { point[band] = row.people.filter((profile) => householdType(profile) === band).length; });
    return point;
  });

  const pairMap = new Map();
  for (const profile of people) {
    const ids = [...new Set(profile.assetIds || [])].filter((id) => scope.assetIds.includes(id)).sort();
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = `${ids[i]}|${ids[j]}`;
        pairMap.set(key, (pairMap.get(key) || 0) + 1);
      }
    }
  }
  const pairs = [...pairMap.entries()].map(([key, value]) => {
    const [a, b] = key.split('|');
    const left = assetList.find((asset) => asset.id === a);
    const right = assetList.find((asset) => asset.id === b);
    return { name: `${left?.name || a} ↔ ${right?.name || b}`, value };
  }).sort((a, b) => b.value - a.value).slice(0, 10);
  const crossRows = perAsset.map((row) => {
    const cells = { name: row.name };
    perAsset.forEach((other) => {
      if (other.id === row.id) cells[other.short] = null;
      else cells[other.short] = people.filter((profile) => (profile.assetIds || []).includes(row.id) && (profile.assetIds || []).includes(other.id)).length;
    });
    return cells;
  });
  const multi = perAsset.map((row) => ({
    name: row.short,
    month: row.short,
    'Single asset': row.people.filter((profile) => (profile.assetIds || []).length <= 1).length,
    'Multi asset': row.people.filter((profile) => (profile.assetIds || []).length > 1).length,
  }));

  const metricValue = (act) => {
    if (metric === 'Cost per attendee') {
      const spend = (act.outcomes?.totalAttendance || 0);
      return safeDiv(act.budget || 0, spend);
    }
    if (metric === 'Avg rating') return act.outcomes?.avgRating || 0;
    if (metric === 'Number of activations') return 1;
    return act.outcomes?.totalAttendance || 0;
  };
  const typeAsset = ACTIVATION_TYPES.map((type) => {
    const point = { name: type, month: type };
    assetList.forEach((asset) => {
      const mine = acts.filter((act) => act.type === type && act.assetId === asset.id);
      point[asset.shortCode] = metric === 'Number of activations' ? mine.length : mine.reduce((sum, act) => sum + (Number(metricValue(act)) || 0), 0);
    });
    return point;
  });
  const bubbles = acts.filter((act) => !bubbleAsset || act.assetId === bubbleAsset).map((act) => ({
    id: act.id,
    name: act.name,
    x: safeDiv(act.budget || 0, act.outcomes?.totalAttendance || 0) || 0,
    y: act.outcomes?.totalAttendance || 0,
    z: act.outcomes?.newProfiles || 1,
    colour: ASSET_COLOURS[act.assetId],
  }));
  const medians = ACTIVATION_TYPES.map((type) => {
    const values = acts.filter((act) => act.type === type).map((act) => act.outcomes?.totalAttendance || 0).sort((a, b) => a - b);
    const mid = values.length ? values[Math.floor(values.length / 2)] : 0;
    return { name: type, value: mid };
  }).sort((a, b) => b.value - a.value);

  const months = monthsBetween(scope.from, scope.to);
  const season = months.map((month) => {
    const point = { month };
    assetList.forEach((asset) => {
      point[asset.shortCode] = acts.filter((act) => act.assetId === asset.id && monthKey(act.startDate) === month).reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0);
    });
    return point;
  });
  const year = scope.to.slice(0, 4);
  const days = [];
  for (let month = 1; month <= 12; month += 1) {
    const count = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
    for (let day = 1; day <= count; day += 1) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ iso, value: acts.filter((act) => act.startDate <= iso && act.endDate >= iso).length });
    }
  }
  const interestAsset = INTERESTS.map((interest) => {
    const point = { name: interest, month: interest };
    assetList.forEach((asset) => {
      const mine = perAsset.find((row) => row.id === asset.id);
      point[asset.shortCode] = mine.people.filter((profile) => (profile.interests || []).includes(interest)).length;
    });
    return point;
  });
  const leadAsset = LEAD_TYPES.map((lead) => {
    const point = { name: lead, month: lead };
    assetList.forEach((asset) => {
      const mine = perAsset.find((row) => row.id === asset.id);
      point[asset.shortCode] = mine.people.filter((profile) => (profile.leadTypes || []).includes(lead)).length;
    });
    return point;
  });
  const channelAsset = assetList.map((asset) => {
    const point = { name: asset.shortCode, month: asset.shortCode };
    const mine = perAsset.find((row) => row.id === asset.id);
    SOURCE_CHANNELS.forEach((source) => { point[source] = mine.people.filter((profile) => profile.sourceChannelFirst === source).length; });
    return point;
  });
  const channelTime = months.map((month) => {
    const point = { month };
    SOURCE_CHANNELS.forEach((source) => { point[source] = people.filter((profile) => monthKey(profile.firstSeen) === month && profile.sourceChannelFirst === source).length; });
    return point;
  });
  const keys = assetList.map((asset) => asset.shortCode);

  return (
    <section>
      <PageHead
        title="Insights"
        lede="Audience and activation patterns for the selected filters."
        tabs={<div className="tabs">{TABS.map((item) => <button key={item} type="button" className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>}
      />
      {tab === 'Asset audiences' && (
        <div className="chart-grid">
          <div className="span-12 screen-actions">
            <div className="segmented">
              <button type="button" className={!affinityTable ? 'on' : ''} onClick={() => setAffinityTable(false)}>Chart</button>
              <button type="button" className={affinityTable ? 'on' : ''} onClick={() => setAffinityTable(true)}>Table</button>
            </div>
            <div className="segmented">
              <button type="button" className={countMode === 'count' ? 'on' : ''} onClick={() => setCountMode('count')}>Count</button>
              <button type="button" className={countMode === 'pct' ? 'on' : ''} onClick={() => setCountMode('pct')}>% of row</button>
            </div>
          </div>
          {affinityTable ? (
            <div className="span-12">
              <ChartCard title="Asset affinity" rows={affinityRows} columns={[{ key: 'name', label: 'Asset' }, ...[...ageCols, ...houseCols, ...interestCols].map((key) => ({ key, label: key, align: 'right', format: num }))]} exportName="asset-affinity" footer={legend}>
                <Heat rows={perAsset} columns={[...ageCols, ...houseCols, ...interestCols]} mode={countMode} get={(row, column) => {
                  if (AGE_BANDS.includes(column)) return row.people.filter((profile) => profile.ageBand === column).length;
                  if (HOUSE.includes(column)) return row.people.filter((profile) => householdType(profile) === column).length;
                  return row.people.filter((profile) => (profile.interests || []).includes(column)).length;
                }} />
              </ChartCard>
            </div>
          ) : (
            <>
              <div className="span-6"><ChartCard title="Age mix by asset" rows={ageMix} columns={[{ key: 'name', label: 'Asset' }, ...AGE_BANDS.map((key) => ({ key, label: key, align: 'right', format: num }))]} exportName="age-mix" footer={legend}><StackedBars data={ageMix} keys={AGE_BANDS} /></ChartCard></div>
              <div className="span-6"><ChartCard title="Household mix by asset" rows={houseMix} columns={[{ key: 'name', label: 'Asset' }, ...HOUSE.map((key) => ({ key, label: key, align: 'right', format: num }))]} exportName="household-mix" footer={legend}><StackedBars data={houseMix} keys={HOUSE} /></ChartCard></div>
            </>
          )}
        </div>
      )}
      {tab === 'Cross-asset movement' && (
        <div className="chart-grid">
          <div className="span-12">
            <ChartCard title="Cross-asset heatmap" rows={crossRows} exportName="cross-asset" footer={legend}>
              <Heat rows={perAsset.map((row) => ({ ...row, name: row.name }))} columns={keys} get={(row, column) => {
                const other = assetList.find((asset) => asset.shortCode === column);
                if (!other || other.id === row.id) return 0;
                return people.filter((profile) => (profile.assetIds || []).includes(row.id) && (profile.assetIds || []).includes(other.id)).length;
              }} />
            </ChartCard>
          </div>
          <div className="span-6"><ChartCard title="Top asset pairs" rows={pairs} exportName="asset-pairs"><HBars data={pairs} /></ChartCard></div>
          <div className="span-6"><ChartCard title="Single-asset and multi-asset profiles" rows={multi} exportName="multi-asset" footer={legend}><StackedBars data={multi} keys={['Single asset', 'Multi asset']} /></ChartCard></div>
        </div>
      )}
      {tab === 'What works where' && (
        <div className="chart-grid">
          <div className="span-12">
            <ChartCard title="Activation type by asset" rows={typeAsset} exportName="type-asset" footer={legend}>
              <div className="seg-toggle">
                {['Attendance', 'Cost per attendee', 'Avg rating', 'Number of activations'].map((item) => <button key={item} type="button" className={metric === item ? 'on' : ''} onClick={() => setMetric(item)}>{item}</button>)}
              </div>
              <StackedBars data={typeAsset} keys={keys} money={metric === 'Cost per attendee'} />
            </ChartCard>
          </div>
          <div className="span-6">
            <ChartCard title="Activations" subtitle="Cost per attendee, attendance, and new profiles" rows={bubbles.map((row) => ({ name: row.name, x: row.x, y: row.y, z: row.z }))} columns={[{ key: 'name', label: 'Activation' }, { key: 'x', label: 'Cost per attendee', align: 'right', format: rm }, { key: 'y', label: 'Attendance', align: 'right', format: num }, { key: 'z', label: 'New profiles', align: 'right', format: num }]} exportName="activation-bubbles">
              <label className="field">Asset
                <select className="control" value={bubbleAsset} onChange={(event) => setBubbleAsset(event.target.value)}>
                  <option value="">All assets</option>
                  {assetList.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <Bubbles data={bubbles} />
            </ChartCard>
          </div>
          <div className="span-6"><ChartCard title="Median attendance by activation type" rows={medians} exportName="median-attendance"><HBars data={medians} /></ChartCard></div>
        </div>
      )}
      {tab === 'Seasonality' && (
        <div className="chart-grid">
          <div className="span-8">
            <ChartCard title="Monthly attendance by asset" rows={season} exportName="seasonality" footer={`${legend}. Shaded months include ${FESTIVE_BANDS.map((band) => band.name).filter((name, index, list) => list.indexOf(name) === index).join(', ')}.`}>
              <StackedBars data={season.map((row) => ({ ...row, name: monthTick(row.month), month: monthTick(row.month) }))} keys={keys} />
            </ChartCard>
          </div>
          <div className="span-4">
            <ChartCard title={`Activation days ${year}`} rows={days.filter((day) => day.value).map((day) => ({ name: day.iso, value: day.value }))} exportName="activation-days">
              <div className="cal-heat">
                {days.map((day) => <i key={day.iso} title={`${day.iso}: ${day.value}`} style={{ background: heat(day.value, 4) }} />)}
              </div>
            </ChartCard>
          </div>
        </div>
      )}
      {tab === 'Interests and tenant mix' && (
        <div className="chart-grid">
          <div className="span-12"><ChartCard title="Interests by asset" rows={interestAsset} exportName="interests-asset" footer={legend}><StackedBars data={interestAsset} keys={keys} /></ChartCard></div>
          <div className="span-12"><ChartCard title="Lead type by asset" rows={leadAsset} exportName="leads-asset" footer={legend}><StackedBars data={leadAsset} keys={keys} /></ChartCard></div>
        </div>
      )}
      {tab === 'Capture channels' && (
        <div className="chart-grid">
          <div className="span-6"><ChartCard title="First capture channel by asset" rows={channelAsset} exportName="channel-asset" footer={legend}><StackedBars data={channelAsset} keys={SOURCE_CHANNELS} /></ChartCard></div>
          <div className="span-6"><ChartCard title="Channel mix over time" rows={channelTime} exportName="channel-time"><StackedArea data={channelTime} keys={SOURCE_CHANNELS} /></ChartCard></div>
        </div>
      )}
    </section>
  );
}

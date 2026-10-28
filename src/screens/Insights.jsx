import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { SeasonChart, StackedBars } from '../components/Charts.jsx';
import { PageHead } from '../components/bits.jsx';
import { ACTIVATION_TYPES, AGE_BANDS, FESTIVE_BANDS, INTERESTS, LEAD_TYPES, SOURCE_CHANNELS } from '../data/config.js';
import { filterProfiles } from '../data/selectors.js';
import { monthKey, safeDiv } from '../data/metrics.js';
import { useAmp } from '../useAmp.jsx';
import { dec1, num, rm } from '../format.js';

function Matrix({ title, columns, rows, toggle, format }) {
  const [pctMode, setPctMode] = useState(false);
  const shaped = rows.map((row) => {
    const record = { id: row.id, label: row.label };
    columns.forEach((column) => {
      const value = row.cells[column] || 0;
      record[column] = pctMode ? (row.total ? value / row.total : 0) : value;
    });
    return record;
  });
  return (
    <section>
      <h2>{title}</h2>
      {toggle && <button type="button" className="btn" onClick={() => setPctMode((on) => !on)}>{pctMode ? 'Show counts' : 'Show % of row'}</button>}
      <DataTable
        columns={[{ key: 'label', label: 'Row' }, ...columns.map((column) => ({ key: column, label: column, align: 'right', format: (value) => (pctMode ? `${(value * 100).toFixed(1)}%` : (format ? format(value) : num(value))) }))]}
        rows={shaped}
        exportName={title}
      />
    </section>
  );
}

export default function Insights() {
  const { profiles, scope, activations, assets, monthly, spend } = useAmp();
  const spendByAct = useMemo(() => {
    const map = new Map();
    spend.forEach((line) => {
      if (!line.activationId) return;
      map.set(line.activationId, (map.get(line.activationId) || 0) + line.amountRM);
    });
    return map;
  }, [spend]);
  const [metric, setMetric] = useState('attendance');
  const people = useMemo(() => filterProfiles(profiles, scope, scope.from, scope.to), [profiles, scope]);
  const assetRows = assets.filter((asset) => scope.assetIds.includes(asset.id));
  const affinityColumns = [...AGE_BANDS, 'With children', 'No children', ...INTERESTS];
  const affinity = assetRows.map((asset) => {
    const mine = people.filter((profile) => profile.assetIds?.includes(asset.id));
    const cells = {};
    AGE_BANDS.forEach((band) => { cells[band] = mine.filter((profile) => profile.ageBand === band).length; });
    cells['With children'] = mine.filter((profile) => profile.childrenCount > 0).length;
    cells['No children'] = mine.filter((profile) => !profile.childrenCount).length;
    INTERESTS.forEach((interest) => { cells[interest] = mine.filter((profile) => profile.interests?.includes(interest)).length; });
    return { id: asset.id, label: asset.shortCode, total: mine.length, cells };
  });
  const cross = assetRows.map((asset) => {
    const cells = {};
    assetRows.forEach((other) => {
      cells[other.shortCode] = people.filter((profile) => profile.assetIds?.includes(asset.id) && profile.assetIds?.includes(other.id)).length;
    });
    return { id: asset.id, label: asset.shortCode, total: cells[asset.shortCode] || 0, cells };
  });
  const typeRows = ACTIVATION_TYPES.map((type) => {
    const cells = {};
    assetRows.forEach((asset) => {
      const acts = activations.filter((act) => act.type === type && act.assetId === asset.id);
      const attendance = acts.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0);
      const linkedSpend = acts.reduce((sum, act) => sum + (spendByAct.get(act.id) || 0), 0);
      const rated = acts.filter((act) => act.outcomes?.avgRating != null);
      const rating = rated.length ? rated.reduce((sum, act) => sum + act.outcomes.avgRating, 0) / rated.length : null;
      const value = metric === 'attendance' ? attendance : metric === 'count' ? acts.length : metric === 'rating' ? rating : safeDiv(linkedSpend, attendance);
      cells[asset.shortCode] = value || 0;
    });
    return { id: type, label: type, total: 0, cells };
  });
  const originRows = [];
  assetRows.forEach((asset) => {
    const tally = new Map();
    people.filter((profile) => profile.assetIds?.includes(asset.id)).forEach((profile) => {
      const key = `${profile.area} ${profile.postcode}`;
      tally.set(key, (tally.get(key) || 0) + 1);
    });
    [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, count]) => {
      originRows.push({ id: `${asset.id}-${name}`, asset: asset.shortCode, area: name, count });
    });
  });
  const season = monthly.map((row) => {
    const record = { month: row.month };
    assetRows.forEach((asset) => {
      record[asset.shortCode] = activations.filter((act) => act.assetId === asset.id && monthKey(act.startDate) === row.month).reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0);
    });
    return record;
  });
  const interestRows = assetRows.map((asset) => {
    const cells = {};
    const mine = people.filter((profile) => profile.assetIds?.includes(asset.id));
    INTERESTS.forEach((interest) => { cells[interest] = mine.filter((profile) => profile.interests?.includes(interest)).length; });
    return { id: asset.id, label: asset.shortCode, total: mine.length, cells };
  });
  const leadRows = assetRows.map((asset) => {
    const cells = {};
    const mine = people.filter((profile) => profile.assetIds?.includes(asset.id));
    LEAD_TYPES.forEach((lead) => { cells[lead] = mine.filter((profile) => profile.leadTypes?.includes(lead)).length; });
    return { id: asset.id, label: asset.shortCode, total: mine.length, cells };
  });
  const sourceRows = assetRows.map((asset) => {
    const cells = {};
    const mine = people.filter((profile) => profile.assetIds?.includes(asset.id));
    SOURCE_CHANNELS.forEach((source) => { cells[source] = mine.filter((profile) => profile.sourceChannelFirst === source).length; });
    return { id: asset.id, label: asset.shortCode, total: mine.length, cells };
  });
  const bands = FESTIVE_BANDS.map((band) => ({ ...band, start: band.start.slice(0, 7), end: band.end.slice(0, 7) })).filter((band) => band.end >= scope.from.slice(0, 7) && band.start <= scope.to.slice(0, 7));
  return (
    <section>
      <PageHead title="Insights" />
      <Matrix title="Asset affinity" columns={affinityColumns} rows={affinity} toggle />
      <Matrix title="Cross-asset engagement" columns={assetRows.map((asset) => asset.shortCode)} rows={cross} />
      <h2>Activation type by asset</h2>
      <label>Cell
        <select value={metric} onChange={(event) => setMetric(event.target.value)}>
          <option value="attendance">Attendance</option>
          <option value="cost">Cost per attendee</option>
          <option value="rating">Average rating</option>
          <option value="count">Activations</option>
        </select>
      </label>
      <Matrix title="Activation type × asset" columns={assetRows.map((asset) => asset.shortCode)} rows={typeRows} format={metric === 'cost' ? rm : metric === 'rating' ? (value) => dec1(value) : num} />
      <h2>Audience origin</h2>
      <DataTable columns={[{ key: 'asset', label: 'Asset' }, { key: 'area', label: 'Area / postcode' }, { key: 'count', label: 'Profiles', align: 'right', format: num }]} rows={originRows} exportName="audience-origin" pageSizes={[25, 50, 100]} />
      <h2>Seasonality</h2>
      <p className="fine">Shaded months include Ramadan/Raya, Chinese New Year, Deepavali or school holidays.</p>
      <SeasonChart data={season} lines={assetRows.map((asset) => ({ key: asset.shortCode, name: asset.shortCode }))} bands={bands} />
      <h2>Interest categories by asset audience</h2>
      <StackedBars data={interestRows.map((row) => ({ month: row.label, ...row.cells }))} keys={INTERESTS} />
      <Matrix title="Interest categories by asset audience" columns={INTERESTS} rows={interestRows} />
      <h2>Lead type mix by asset</h2>
      <Matrix title="Lead type mix" columns={LEAD_TYPES} rows={leadRows} />
      <h2>Channel source by asset</h2>
      <Matrix title="First capture channel" columns={SOURCE_CHANNELS} rows={sourceRows} />
    </section>
  );
}

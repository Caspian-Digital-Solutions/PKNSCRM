import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { Donut, HBars, StackedArea, VBars } from '../components/Charts.jsx';
import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import { EmptyState, PageHead, Status, auditEntry, linkTo, personal } from '../components/bits.jsx';
import { CheckInline, SelectInput } from '../components/controls.jsx';
import { can } from '../access.js';
import { AGE_BANDS, ASSET_COLOURS, GENDERS, INTERESTS, LEAD_TYPES, SOURCE_CHANNELS } from '../data/config.js';
import { audiencePack } from '../data/audienceStats.js';
import { channelMatch } from '../data/metrics.js';
import { exportCsv } from '../components/ExportButton.jsx';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct } from '../format.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'area', label: 'Area' },
  { key: 'ageBand', label: 'Age band' },
  { key: 'leads', label: 'Lead types' },
  { key: 'attended', label: 'Activations', align: 'right', format: num },
  { key: 'assets', label: 'Assets' },
  { key: 'lastSeen', label: 'Last seen', format: date },
  { key: 'consent', label: 'Consent' },
  { key: 'mobile', label: 'Mobile', optional: true },
  { key: 'email', label: 'Email', optional: true },
  { key: 'firstSeen', label: 'First seen', optional: true, format: date },
  { key: 'source', label: 'Source', optional: true },
  { key: 'children', label: 'Children', align: 'right', optional: true },
  { key: 'interests', label: 'Interests', optional: true, wrap: true },
];

function dots(ids, assets) {
  return (
    <span className="asset-dots">
      {(ids || []).map((id) => {
        const asset = assets.find((item) => item.id === id);
        return <i key={id} className="asset-dot" title={asset?.name || id} style={{ background: ASSET_COLOURS[id] || '#64748B' }} />;
      })}
    </span>
  );
}

export default function Audience() {
  const amp = useAmp();
  const { profiles, scope, assets, state, dispatch, route, segments } = amp;
  const [tab, setTab] = useState('overview');
  const [cards, setCards] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const [filters, setFilters] = useState({
    lead: route.search.lead || '',
    age: '',
    gender: '',
    children: '',
    interest: '',
    area: '',
    consent: route.search.consent || '',
    source: '',
    asset: '',
  });
  const people = useMemo(() => profiles.filter((profile) => {
    if (profile.anonymised || profile.firstSeen > scope.to) return false;
    if (!channelMatch(profile, scope.channels)) return false;
    if (!scope.unrestricted && !(profile.assetIds || []).some((id) => scope.assetIds.includes(id))) return false;
    return true;
  }), [profiles, scope]);
  const pack = useMemo(() => audiencePack(people, scope.from, scope.to, assets.filter((asset) => scope.assetIds.includes(asset.id))), [people, scope, assets]);
  const management = state.role === 'management';
  const openDirectory = (patch) => {
    if (management) return;
    setFilters((current) => ({ ...current, ...patch }));
    setTab('directory');
  };
  const areas = useMemo(() => [...new Set(people.map((profile) => profile.area))].sort(), [people]);
  const rows = useMemo(() => people.filter((profile) => {
    if (filters.lead && !(profile.leadTypes || []).includes(filters.lead)) return false;
    if (filters.age && profile.ageBand !== filters.age) return false;
    if (filters.gender && profile.gender !== filters.gender) return false;
    if (filters.children === 'Yes' && !(profile.childrenCount > 0)) return false;
    if (filters.children === 'No' && profile.childrenCount > 0) return false;
    if (filters.interest && !(profile.interests || []).includes(filters.interest)) return false;
    if (filters.area && profile.area !== filters.area) return false;
    if (filters.consent === 'yes' && !(profile.consent?.marketingOptIn && !profile.consent.unknown)) return false;
    if (filters.consent === 'no' && (profile.consent?.marketingOptIn || profile.consent?.unknown)) return false;
    if (filters.consent === 'unknown' && !profile.consent?.unknown) return false;
    if (filters.source && profile.sourceChannelFirst !== filters.source) return false;
    if (filters.asset && !(profile.assetIds || []).includes(filters.asset)) return false;
    if (route.search.arrived === '1' && (profile.firstSeen < scope.from || profile.firstSeen > scope.to)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${profile.fullName} ${profile.area} ${profile.mobile} ${profile.email}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [people, filters, query, route.search.arrived, scope]);
  const consentedRows = rows.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
  const reveal = (profile, event) => {
    event.stopPropagation();
    dispatch({ type: 'reveal', id: profile.id, entry: auditEntry(state, 'Revealed contact', 'Profile', profile.id, `Revealed contact for ${profile.id}`) });
  };
  const shaped = rows.map((profile) => ({
    id: profile.id,
    name: <span className="person-cell"><Avatar name={profile.fullName} size={28} />{profile.fullName}</span>,
    area: profile.area,
    ageBand: profile.ageBand,
    leads: (profile.leadTypes || []).join(', '),
    attended: profile.totalActivationsAttended || 0,
    assets: dots(profile.assetIds, assets),
    lastSeen: profile.lastSeen,
    consent: <Status value={profile.consent?.unknown ? 'Consent unknown' : profile.consent?.marketingOptIn ? 'Opted in' : 'Not opted in'} />,
    mobile: <span className="person-cell">{personal(profile, state.role, state.revealed, 'mobile')}{can(state.role, 'profile.reveal') && !state.revealed?.[profile.id] ? <button type="button" className="icon-btn" aria-label="Reveal mobile" onClick={(event) => reveal(profile, event)}><Eye size={16} /></button> : null}</span>,
    email: personal(profile, state.role, state.revealed, 'email'),
    firstSeen: profile.firstSeen,
    source: profile.sourceChannelFirst,
    children: profile.childrenCount || 0,
    interests: (profile.interests || []).join(', '),
  }));
  const exportConsented = () => {
    const excluded = rows.length - consentedRows.length;
    exportCsv({
      filename: 'consented-contacts',
      columns: [{ key: 'fullName', label: 'Name' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'area', label: 'Area' }],
      rows: consentedRows,
    });
    dispatch({ type: 'audit', entry: auditEntry(state, 'Exported segment', 'Audience', 'directory', `Exported ${consentedRows.length} consented contacts. ${excluded} excluded.`) });
  };
  const addToSegment = () => {
    const id = `SEG-L${state.seq}`;
    dispatch({
      type: 'addSegment',
      segment: {
        id,
        name: `Selection ${date(state.now)}`,
        description: `${picked.length} profiles added from the directory.`,
        match: 'or',
        groups: [],
        memberIds: picked,
        createdBy: 'Farah Idris',
        createdAt: state.now.slice(0, 10),
      },
    });
    setPicked([]);
  };
  const clear = () => setFilters({ lead: '', age: '', gender: '', children: '', interest: '', area: '', consent: '', source: '', asset: '' });
  const legend = assets.filter((asset) => scope.assetIds.includes(asset.id)).map((asset) => `${asset.shortCode} ${asset.name}`).join(' · ');

  return (
    <section>
      <PageHead
        title="Audience"
        lede="Who is in the AMP database for the selected period."
        tabs={(
          <div className="tabs">
            <button type="button" className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
            {management ? null : <button type="button" className={tab === 'directory' ? 'on' : ''} onClick={() => setTab('directory')}>Directory</button>}
          </div>
        )}
        actions={tab === 'directory' ? (
          <>
            <button type="button" className="btn" onClick={() => setCards((value) => !value)}>{cards ? 'Table' : 'Cards'}</button>
            {picked.length > 0 && <button type="button" className="btn" onClick={addToSegment}>Add to segment</button>}
            {can(state.role, 'contacts.export') && <button type="button" className="btn btn-primary" onClick={exportConsented}>Export consented</button>}
          </>
        ) : null}
      />
      {tab === 'overview' && (
        <>
          <div className="kpi-row six">
            <Kpi label="Total profiles" value={pack.total} format={num} spark={pack.sparks.total} href={linkTo('audience', route.search)} />
            <Kpi label="New this period" value={pack.fresh} format={num} spark={pack.sparks.fresh} />
            <Kpi label="Returning this period" value={pack.returning} format={num} spark={pack.sparks.returning} />
            <Kpi label="Marketing consent" value={pack.consented} format={num} sub={`${pct(pack.consentPct)} of profiles`} spark={pack.sparks.consented} />
            <Kpi label="Families with children" value={pack.familiesPct} format={pct} spark={pack.sparks.families} />
            <Kpi label="Average activations" value={pack.avgActivations} format={(value) => (value == null ? '–' : Number(value).toFixed(1))} spark={pack.sparks.avg} />
          </div>
          <div className="chart-grid">
            <div className="span-8">
              <ChartCard title="Audience growth" subtitle="Cumulative profiles by first capture channel" rows={pack.growth} columns={[{ key: 'month', label: 'Month' }, ...SOURCE_CHANNELS.map((name) => ({ key: name, label: name, align: 'right', format: num }))]} exportName="audience-growth">
                <StackedArea data={pack.growth} keys={SOURCE_CHANNELS} />
              </ChartCard>
            </div>
            <div className="span-4">
              <ChartCard title="Consent status" rows={pack.consent} exportName="consent-status">
                <Donut data={pack.consent} centre={num(pack.total)} />
              </ChartCard>
            </div>
            <div className="span-4"><ChartCard title="Age band" rows={pack.age} exportName="age-band"><VBars data={pack.age} onPick={management ? undefined : (row) => openDirectory({ age: row.name })} /></ChartCard></div>
            <div className="span-4"><ChartCard title="Gender" rows={pack.gender} exportName="gender"><Donut data={pack.gender} /></ChartCard></div>
            <div className="span-4"><ChartCard title="Household type" rows={pack.household} exportName="household"><Donut data={pack.household} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Lead type mix" rows={pack.leads} exportName="lead-types"><HBars data={pack.leads} onPick={(row) => openDirectory({ lead: row.name })} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Children's age bands" rows={pack.children} exportName="child-ages"><HBars data={pack.children} colour="#E31E24" /></ChartCard></div>
            <div className="span-6"><ChartCard title="Top interests" rows={pack.interests} exportName="interests"><HBars data={pack.interests} onPick={(row) => openDirectory({ interest: row.name })} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Where they come from" rows={pack.areas} exportName="areas"><HBars data={pack.areas} onPick={(row) => openDirectory({ area: row.name })} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Engagement depth" subtitle="Activations attended per profile" rows={pack.depth} exportName="engagement-depth"><VBars data={pack.depth} colour="#1F6FEB" /></ChartCard></div>
            <div className="span-6">
              <ChartCard title="Assets engaged" rows={pack.assets.map((row) => ({ ...row, name: row.fullName }))} exportName="assets-engaged" footer={legend}>
                <HBars data={pack.assets.map((row) => ({ ...row, name: row.fullName }))} onPick={(row) => openDirectory({ asset: row.id })} />
              </ChartCard>
            </div>
          </div>
        </>
      )}
      {tab === 'directory' && (
        <>
          <div className="filters">
            <input className="search-input control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search profiles" aria-label="Search profiles" />
            <SelectInput ariaLabel="Lead type" placeholder="Lead type" value={filters.lead} onChange={(lead) => setFilters({ ...filters, lead })} options={LEAD_TYPES} />
            <SelectInput ariaLabel="Age band" placeholder="Age band" value={filters.age} onChange={(age) => setFilters({ ...filters, age })} options={AGE_BANDS} />
            <SelectInput ariaLabel="Gender" placeholder="Gender" value={filters.gender} onChange={(gender) => setFilters({ ...filters, gender })} options={GENDERS} />
            <SelectInput ariaLabel="Has children" placeholder="Has children" value={filters.children} onChange={(children) => setFilters({ ...filters, children })} options={['Yes', 'No']} />
            <SelectInput ariaLabel="Interest" placeholder="Interest" value={filters.interest} onChange={(interest) => setFilters({ ...filters, interest })} options={INTERESTS} />
            <SelectInput ariaLabel="Area" placeholder="Area" value={filters.area} onChange={(area) => setFilters({ ...filters, area })} options={areas} />
            <SelectInput ariaLabel="Consent" placeholder="Consent" value={filters.consent} onChange={(consent) => setFilters({ ...filters, consent })} options={[{ id: 'yes', label: 'Opted in' }, { id: 'no', label: 'Not opted in' }, { id: 'unknown', label: 'Consent unknown' }]} />
            <SelectInput ariaLabel="Source" placeholder="Source" value={filters.source} onChange={(source) => setFilters({ ...filters, source })} options={SOURCE_CHANNELS} />
            <SelectInput ariaLabel="Asset engaged" placeholder="Asset engaged" value={filters.asset} onChange={(asset) => setFilters({ ...filters, asset })} options={assets.filter((asset) => scope.assetIds.includes(asset.id)).map((asset) => ({ id: asset.id, label: asset.name }))} />
            <button type="button" className="btn" onClick={clear}>Clear all</button>
          </div>
          <p className="summary-strip">{num(rows.length)} profiles · {num(consentedRows.length)} with marketing consent{can(state.role, 'contacts.export') ? ` · export excludes ${num(rows.length - consentedRows.length)}` : ''}</p>
          {cards ? (
            <div className="chart-grid">
              {rows.slice(0, 24).map((profile) => (
                <a key={profile.id} className="span-3 info-card" href={linkTo(`profile/${profile.id}`, route.search)}>
                  <span className="person-cell"><Avatar name={profile.fullName} /> <strong>{profile.fullName}</strong></span>
                  <p>{profile.area} · {profile.ageBand}</p>
                  <p>{(profile.leadTypes || []).join(', ')}</p>
                  <p>Last seen {date(profile.lastSeen)}</p>
                </a>
              ))}
              {rows.length === 0 && <EmptyState title="No profiles match these filters." />}
            </div>
          ) : (
            <DataTable
              columns={[{ key: 'pick', label: 'Select' }, ...COLUMNS]}
              rows={shaped.map((row) => ({
                ...row,
                pick: <CheckInline checked={picked.includes(row.id)} onChange={(on) => setPicked((current) => (on ? [...current, row.id] : current.filter((id) => id !== row.id)))} />,
              }))}
              pageSizes={[25, 50, 100]}
              initialSort={{ key: 'lastSeen', dir: 'desc' }}
              exportName="audience-directory"
              onRowClick={(row) => { window.location.hash = linkTo(`profile/${row.id}`, route.search); }}
              empty="No profiles match these filters."
            />
          )}
          {segments ? null : null}
        </>
      )}
    </section>
  );
}

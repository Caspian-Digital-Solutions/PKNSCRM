import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { PageHead, SampleBadge, SearchBox, Status, linkTo } from '../components/bits.jsx';
import { can } from '../access.js';
import { AS_OF } from '../data/config.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct, rm } from '../format.js';

const TYPES = ['Mall', 'Office', 'Mixed-use', 'Open space', 'Township site'];
const STATUSES = ['Active', 'Under redevelopment', 'Planned'];

function Photo({ code }) {
  return <div className="asset-photo" aria-hidden="true">{code}</div>;
}

export default function Assets({ id }) {
  const amp = useAmp();
  if (id) return <AssetDetail id={id} amp={amp} />;
  return <AssetList amp={amp} />;
}

function AssetList({ amp }) {
  const { state, dispatch, assets, operators, byAsset, profiles, scope, route, allActivations } = amp;
  const [mode, setMode] = useState('cards');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', shortCode: '', type: TYPES[0], area: 'Shah Alam', city: 'Shah Alam', postcode: '40000', operatorId: '', status: 'Active', description: '' });
  const allowed = can(state.role, 'asset.add');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byAsset.map((row) => {
      const asset = assets.find((item) => item.id === row.id);
      const ytdActs = allActivations.filter((act) => act.assetId === row.id && act.startDate >= '2026-01-01' && act.startDate <= AS_OF);
      return {
        ...row,
        shortCode: asset?.shortCode,
        type: asset?.type,
        location: `${asset?.area || ''}, ${asset?.city || ''}`,
        status: asset?.status,
        profiles: profiles.filter((profile) => (profile.assetIds || []).includes(row.id) && profile.firstSeen <= scope.to).length,
        ytdActivations: ytdActs.length,
        ytdAttendance: ytdActs.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0),
      };
    }).filter((row) => !q || `${row.asset} ${row.type} ${row.location} ${row.operator}`.toLowerCase().includes(q));
  }, [byAsset, assets, profiles, scope.to, query, allActivations]);
  const save = (event) => {
    event.preventDefault();
    const asset = {
      id: `asset-${form.shortCode.toLowerCase().replace(/[^a-z0-9]+/g, '') || state.seq}`,
      ...form,
      operatorId: form.operatorId || null,
      rentxLinked: false,
      photoUrl: '',
      createdBy: 'Farah Idris',
      createdAt: '2026-10-28T09:00:00+08:00',
    };
    dispatch({ type: 'addAsset', asset });
    setOpen(false);
  };
  return (
    <section>
      <PageHead
        title="Assets"
        lede="Registry of places where PKNS AMP runs activations."
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setMode(mode === 'cards' ? 'table' : 'cards')}>{mode === 'cards' ? 'Table' : 'Cards'}</button>
            {allowed && <button type="button" className="btn" onClick={() => setOpen((value) => !value)}>Add asset</button>}
          </>
        )}
      />
      <p className="note">New assets can be added by PKNS without a vendor change request.</p>
      <div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search assets" /></div>
      {open && allowed && (
        <form className="dialog-form" onSubmit={save}>
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Short code<input required value={form.shortCode} onChange={(event) => setForm({ ...form, shortCode: event.target.value })} /></label>
          <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Area<input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} /></label>
          <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <label>Postcode<input value={form.postcode} onChange={(event) => setForm({ ...form, postcode: event.target.value })} /></label>
          <label>Operator
            <select value={form.operatorId} onChange={(event) => setForm({ ...form, operatorId: event.target.value })}>
              <option value="">PKNS-run</option>
              {operators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <button type="submit" className="btn">Save asset</button>
        </form>
      )}
      {mode === 'cards' ? (
        <div className="card-grid">
          {rows.map((row) => (
            <a key={row.id} className="asset-card" href={linkTo(`asset/${row.id}`, route.search)}>
              <Photo code={row.shortCode} />
              <h2>{row.asset}</h2>
              <p>{row.type} · {row.location}</p>
              <p>{row.operator}</p>
              <p><Status value={row.status} /></p>
              <p>Activations YTD {num(row.ytdActivations)} · Attendance YTD {num(row.ytdAttendance)}</p>
              <p>Profiles linked {num(row.profiles)}</p>
            </a>
          ))}
          {rows.length === 0 && <p>No assets in this filter.</p>}
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'asset', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'location', label: 'Location' },
            { key: 'operator', label: 'Operator' },
            { key: 'status', label: 'Status' },
            { key: 'activations', label: 'Activations', align: 'right', format: num },
            { key: 'attendance', label: 'Attendance', align: 'right', format: num },
            { key: 'profiles', label: 'Profiles linked', align: 'right', format: num },
          ]}
          rows={rows}
          exportName="amp-assets"
          pageSizes={[25, 50, 100]}
          empty="No assets in this filter."
          onRowClick={(row) => { window.location.hash = linkTo(`asset/${row.id}`, route.search); }}
        />
      )}
    </section>
  );
}

function AssetDetail({ id, amp }) {
  const { assets, operators, allActivations, byAsset, spend, budgets, route, scope, profiles } = amp;
  const asset = assets.find((item) => item.id === id);
  if (!asset) return <section><PageHead title="Asset" lede="This asset is not in the current filter." /></section>;
  const operator = operators.find((item) => item.id === asset.operatorId);
  const acts = allActivations.filter((act) => act.assetId === id && scope.assetIds.includes(id));
  const summary = byAsset.find((row) => row.id === id);
  const snap = asset.rentxSnapshot;
  return (
    <section>
      <PageHead title={asset.name} lede={`${asset.type} · ${asset.area}, ${asset.city} ${asset.postcode}`} actions={<a className="btn" href={linkTo('assets', route.search)}>All assets</a>} />
      <Photo code={asset.shortCode} />
      <p>{asset.description}</p>
      <p>Operator: {operator?.name || 'PKNS-run'}</p>
      <p>Status: <Status value={asset.status} /></p>
      <h2>Activations at this asset</h2>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'startDate', label: 'Start', format: date },
          { key: 'status', label: 'Status' },
          { key: 'attendance', label: 'Attendance', align: 'right', format: num },
        ]}
        rows={acts.map((act) => ({ id: act.id, name: act.name, type: act.type, startDate: act.startDate, status: act.status, attendance: act.outcomes?.totalAttendance || 0 }))}
        exportName={`asset-${asset.shortCode}-activations`}
        pageSizes={[25, 50, 100]}
        empty="No activations in this filter."
        onRowClick={(row) => { window.location.hash = linkTo(`activation/${row.id}`, route.search); }}
      />
      <h2>Audience summary</h2>
      <p>Profiles linked {num(profiles.filter((profile) => (profile.assetIds || []).includes(id) && profile.firstSeen <= scope.to).length)}</p>
      <DataTable
        columns={[
          { key: 'label', label: 'Measure' },
          { key: 'value', label: 'Value', align: 'right' },
        ]}
        rows={summary ? [
          { id: 'profiles', label: 'Profiles in period scope', value: num(acts.length ? summary.newProfiles : summary.newProfiles) },
          { id: 'new', label: 'New profiles', value: num(summary.newProfiles) },
          { id: 'attendance', label: 'Attendance', value: num(summary.attendance) },
          { id: 'consent', label: 'Consented for marketing', value: num(summary.consented) },
        ] : []}
        exportName={`asset-${asset.shortCode}-audience`}
        empty="Asset is outside the current filter."
      />
      <h2>Spend vs budget</h2>
      <p>AMP spend {rm(summary?.ampSpend)} · Budget {rm(summary?.budget)} · Utilisation {pct(summary?.utilisation)}</p>
      <DataTable
        columns={[{ key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount', align: 'right', format: rm, total: 'sum' }]}
        rows={Object.entries(spend.filter((line) => line.assetId === id && line.date >= scope.from && line.date <= scope.to).reduce((map, line) => {
          map[line.category] = (map[line.category] || 0) + line.amountRM;
          return map;
        }, {})).map(([category, amount]) => ({ id: category, category, amount }))}
        totals
        exportName={`asset-${asset.shortCode}-spend`}
        empty="No spend in this filter."
      />
      <p className="fine">Approved quarters on file: {budgets.filter((row) => row.assetId === id).map((row) => `${row.quarter} ${rm(row.approvedRM)}`).join(' · ') || 'None'}</p>
      <h2>RentX snapshot</h2>
      {asset.rentxLinked && snap ? (
        <article className="info-card">
          <SampleBadge />
          <p>Occupancy {snap.occupancyPct}% · {num(snap.tenantCount)} tenants · as of {date(snap.asOf)} · via RentX</p>
          <p className="fine">Sample data, not connected · Subject to integration approval</p>
        </article>
      ) : (
        <p className="note">No RentX snapshot. Open space and township sites are not linked.</p>
      )}
    </section>
  );
}

import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { PageHead, SearchBox, Status, linkTo, openScreen } from '../components/bits.jsx';
import { can } from '../access.js';
import { ACTIVATION_TYPES, ASSETS, AS_OF, CONSENT, DEFAULT_FORM_KEYS, FIELD_LIBRARY, OBJECTIVES } from '../data/config.js';
import { blankOutcomes } from '../data/submit.js';
import { useAmp } from '../useAmp.jsx';
import { date, dateSpan, dec1, num, rm } from '../format.js';
import { activationTitle } from '../labels.js';

const SERIES = ['#3D5A80', '#8A9A5B', '#C9A227', '#7D6B91', '#5C8D89', '#9C6644', '#5E6A82', '#8C7A6B'];
const STATUSES = ['Planned', 'Approved', 'Live', 'Completed', 'Reported'];

function fieldFrom(key) {
  const src = FIELD_LIBRARY.find((item) => item.key === key);
  return { ...src, required: key === 'fullName' || key === 'mobile', options: src.options ? src.options.slice() : undefined };
}

function NewActivation() {
  const { dispatch, state, assets, route } = useAmp();
  const [form, setForm] = useState({
    name: '', assetId: assets[0]?.id || '', specificLocation: '', runBy: 'PKNS AMP', type: ACTIVATION_TYPES[0],
    objective: OBJECTIVES[0], targetAudience: '', description: '', startDate: '2026-11-20', endDate: '2026-11-21', budget: 8000, createForm: true,
  });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const save = (event) => {
    event.preventDefault();
    const id = `ACT-L${state.seq}`;
    const asset = assets.find((item) => item.id === form.assetId);
    const activation = {
      id,
      ...form,
      budget: Number(form.budget) || 0,
      operatorId: form.runBy === 'Operator' ? asset?.operatorId || null : null,
      status: 'Planned',
      formId: form.createForm ? `FORM-${id}` : '',
      qrCodes: [{ id: `QR-${id}`, touchpoint: 'Form', scans: 0 }],
      linkedCampaignIds: [],
      outcomes: blankOutcomes(),
      createdBy: 'Farah Idris',
      createdAt: '2026-10-28T09:00:00+08:00',
      updatedAt: '2026-10-28T09:00:00+08:00',
    };
    dispatch({ type: 'addActivation', activation });
    if (form.createForm) {
      dispatch({
        type: 'addForm',
        form: {
          id: `FORM-${id}`,
          name: `${form.name} registration`,
          activationId: id,
          language: 'BM+EN',
          fields: DEFAULT_FORM_KEYS.map(fieldFrom),
          consentBlock: {
            purposeTextEN: CONSENT.purposeTextEN,
            purposeTextBM: CONSENT.purposeTextBM,
            privacyNoticeUrl: CONSENT.privacyNoticeUrl,
            requiredConsent: CONSENT.requiredEN,
            requiredConsentBM: CONSENT.requiredBM,
            marketingOptIn: CONSENT.marketingEN,
            marketingOptInBM: CONSENT.marketingBM,
            consentVersion: CONSENT.consentVersion,
          },
          thankYouMessage: 'Thank you. Your response has been recorded.',
          thankYouMessageBM: 'Terima kasih. Maklum balas anda telah direkodkan.',
          active: true,
          createdAt: activation.createdAt,
        },
      });
      openScreen('form', route.search, `FORM-${id}`);
      return;
    }
    openScreen('activation', route.search, id);
  };
  return (
    <section>
      <PageHead title="New activation" lede="The record is stored in this browser session." />
      <form className="dialog-form" onSubmit={save}>
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Asset<select value={form.assetId} onChange={set('assetId')}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
        <label>Specific location<input value={form.specificLocation} onChange={set('specificLocation')} placeholder="Open plaza, ground floor" /></label>
        <label>Run by<select value={form.runBy} onChange={set('runBy')}><option>PKNS AMP</option><option>Operator</option></select></label>
        <label>Type<select value={form.type} onChange={set('type')}>{ACTIVATION_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Objective<select value={form.objective} onChange={set('objective')}>{OBJECTIVES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Target audience<input value={form.targetAudience} onChange={set('targetAudience')} /></label>
        <label>Description<textarea value={form.description} onChange={set('description')} rows={3} /></label>
        <label>Start<input type="date" required value={form.startDate} onChange={set('startDate')} /></label>
        <label>End<input type="date" required value={form.endDate} onChange={set('endDate')} /></label>
        <label>Budget (RM)<input type="number" min="0" value={form.budget} onChange={set('budget')} /></label>
        <label className="check-inline"><input type="checkbox" checked={form.createForm} onChange={set('createForm')} /><span>Next: create a registration form</span></label>
        <div className="dialog-actions"><button className="btn btn-primary" type="submit">Save activation</button></div>
      </form>
    </section>
  );
}

function Calendar({ rows, search }) {
  const [cursor, setCursor] = useState('2026-10');
  const [year, month] = cursor.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [...Array(pad).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const color = (assetId) => SERIES[Math.max(0, ASSETS.findIndex((asset) => asset.id === assetId)) % SERIES.length];
  return (
    <div>
      <div className="screen-actions">
        <button type="button" className="btn" onClick={() => setCursor(month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`)}>Previous</button>
        <strong>{first.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
        <button type="button" className="btn" onClick={() => setCursor(month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`)}>Next</button>
      </div>
      <div className="cal">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="cal-head">{day}</div>)}
        {cells.map((day, index) => {
          const iso = day ? `${cursor}-${String(day).padStart(2, '0')}` : '';
          const items = day ? rows.filter((act) => act.startDate <= iso && act.endDate >= iso) : [];
          return (
            <div key={iso || `e-${index}`} className="cal-cell">
              {day}
              {items.slice(0, 3).map((act) => (
                <a key={act.id} className="cal-item" style={{ borderLeftColor: color(act.assetId) }} href={linkTo(`activation/${act.id}`, search)}>{act.name}</a>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pipeline({ rows, search, canDrag, dispatch, state }) {
  const [drag, setDrag] = useState('');
  return (
    <div className="pipe">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="pipe-col"
          onDragOver={(event) => { if (canDrag) event.preventDefault(); }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData('text/plain') || drag;
            if (!canDrag || !id) return;
            dispatch({ type: 'patchActivation', id, patch: { status } });
            dispatch({ type: 'audit', entry: { userName: 'Farah Idris', role: 'AMP Manager', action: 'Edited activation', targetType: 'Activation', targetId: id, details: `Status set to ${status}` } });
          }}
        >
          <div className="pipe-col-head"><h2>{status}</h2><span>{rows.filter((act) => act.status === status).length}</span></div>
          <div className="pipe-cards">
            {rows.filter((act) => act.status === status).map((act) => (
              <article key={act.id} className="pipe-card" draggable={canDrag} onDragStart={(event) => { setDrag(act.id); event.dataTransfer.setData('text/plain', act.id); }}>
                <a className="pipe-card-main" href={linkTo(`activation/${act.id}`, search)}><strong>{act.name}</strong><span>{date(act.startDate)}</span></a>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  void state;
}

export default function Activations() {
  const amp = useAmp();
  const { route, activations, roster, scope, spend, assets, state, dispatch } = amp;
  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [doneOnly, setDoneOnly] = useState(route.search.done === '1');
  const spendById = useMemo(() => {
    const map = new Map();
    spend.forEach((line) => {
      if (!line.activationId) return;
      map.set(line.activationId, (map.get(line.activationId) || 0) + line.amountRM);
    });
    return map;
  }, [spend]);
  if (route.params[0] === 'new') return <NewActivation />;
  const assetName = (id) => assets.find((asset) => asset.id === id)?.name || id;
  const shape = (act) => ({
    ...act,
    asset: assetName(act.assetId),
    dates: dateSpan(act.startDate, act.endDate),
    colour: assets.find((asset) => asset.id === act.assetId)?.colour,
    actual: spendById.get(act.id) || 0,
    attendance: act.outcomes?.totalAttendance || 0,
    fresh: act.outcomes?.newProfiles || 0,
    cost: act.outcomes?.totalAttendance ? (spendById.get(act.id) || 0) / act.outcomes.totalAttendance : null,
    rating: act.outcomes?.avgRating,
  });
  let rows = activations.map(shape).sort((a, b) => {
    const aUp = a.endDate >= AS_OF ? 0 : 1;
    const bUp = b.endDate >= AS_OF ? 0 : 1;
    if (aUp !== bUp) return aUp - bUp;
    return aUp === 0 ? String(a.startDate).localeCompare(String(b.startDate)) : String(b.startDate).localeCompare(String(a.startDate));
  });
  const rosterRows = (roster || activations).map(shape);
  if (doneOnly || route.search.done === '1') rows = rows.filter((act) => act.status === 'Completed' || act.status === 'Reported');
  if (query) {
    const q = query.toLowerCase();
    rows = rows.filter((act) => `${act.name} ${act.asset} ${act.type} ${act.specificLocation}`.toLowerCase().includes(q));
  }
  const columns = [
    { key: 'name', label: 'Name', format: (value, row) => <span><i className="asset-dot" style={{ background: row?.colour || '#64748B' }} /> {activationTitle(value)}</span> },
    { key: 'asset', label: 'Asset' },
    { key: 'specificLocation', label: 'Location', optional: true },
    { key: 'runBy', label: 'Run by', optional: true },
    { key: 'type', label: 'Type' },
    { key: 'objective', label: 'Objective', optional: true },
    { key: 'dates', label: 'Dates' },
    { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
    { key: 'budget', label: 'Budget', align: 'right', format: rm },
    { key: 'actual', label: 'Actual spend', align: 'right', format: rm, optional: true },
    { key: 'attendance', label: 'Attendance', align: 'right', format: num },
    { key: 'fresh', label: 'New profiles', align: 'right', format: num, optional: true },
    { key: 'cost', label: 'Cost per attendee', align: 'right', format: rm, optional: true },
    { key: 'rating', label: 'Avg rating', align: 'right', format: (value) => dec1(value), optional: true },
  ];
  return (
    <section>
      <PageHead
        title="Activations"
        lede="Plan, run and report AMP activations."
        actions={(
          <>
            <div className="segmented" role="tablist" aria-label="Activation view">
              <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
              <button type="button" className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>Calendar</button>
              <button type="button" className={view === 'pipeline' ? 'on' : ''} onClick={() => setView('pipeline')}>Status</button>
            </div>
            {can(state.role, 'activation.edit') && <a className="btn btn-primary" href={linkTo('activations/new', route.search)}>New activation</a>}
          </>
        )}
      />
      <div className="list-tools" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <SearchBox value={query} onChange={setQuery} placeholder="Search activations" />
        <label className="check-inline"><input type="checkbox" checked={doneOnly || route.search.done === '1'} onChange={(event) => setDoneOnly(event.target.checked)} /><span>Completed or reported</span></label>
      </div>
      {view === 'list' && (
        <>
          <div className="kpi-row">
            <div className="kpi"><div className="kpi-label">Planned</div><div className="kpi-value">{num(rosterRows.filter((act) => act.status === 'Planned').length)}</div></div>
            <div className="kpi"><div className="kpi-label">Live</div><div className="kpi-value">{num(rosterRows.filter((act) => act.status === 'Live').length)}</div></div>
            <div className="kpi"><div className="kpi-label">Awaiting report</div><div className="kpi-value">{num(rosterRows.filter((act) => act.status === 'Completed').length)}</div></div>
            <div className="kpi"><div className="kpi-label">Budget in view</div><div className="kpi-value">{rm(rows.reduce((sum, act) => sum + (act.budget || 0), 0))}</div></div>
          </div>
          <DataTable columns={columns} rows={rows} pageSizes={[25, 50, 100]} exportName="activations" onRowClick={(row) => { window.location.hash = linkTo(`activation/${row.id}`, route.search); }} />
        </>
      )}
      {view === 'calendar' && <Calendar rows={scope.includeUpcoming === false ? rows : rosterRows} search={route.search} />}
      {view === 'pipeline' && <Pipeline rows={rosterRows} search={route.search} canDrag={can(state.role, 'activation.status')} dispatch={dispatch} state={state} />}
    </section>
  );
}

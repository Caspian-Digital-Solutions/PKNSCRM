import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../store.jsx';
import { go, useRoute } from '../router.js';
import { useUi } from '../ui.jsx';
import Filters from '../components/Filters.jsx';
import Field from '../components/Field.jsx';
import Num from '../components/Num.jsx';
import SourceIcon from '../components/SourceIcon.jsx';
import { LostDialog, SignedDialog, ZoneMoveDialog, commitStage } from '../components/MoveDialogs.jsx';
import { exportSheets } from '../components/ExportButton.jsx';
import { AS_AT, PIPELINE_STAGES, ZONES } from '../data/config.js';
import { zoneOf } from '../data/metrics.js';
import {
  cardAlert, firstContactOverdue, handoverOf, medianDaysInZone, nextRequirement, octoberMovements, presentRequirements,
  requirementLine, zoneLabel, zoneMovePlan, zoneSnapshot,
} from '../data/zones.js';
import { daysInStage, filteredEnquiries, firstResponseMinutes, liveAssets, liveEnquiries } from '../data/selectors.js';
import { date, dateTime, duration, num, rm } from '../format.js';
import { officerMark, officerTint, initialsOf, unitLabel } from '../labels.js';
import { addDays, dateUTC, ymd } from '../data/rng.js';
import { QR_SOURCE } from '../qrEnquiry.js';
import { qrPageUrl, useQrEnquiries } from '../qrStore.js';

const OPEN = PIPELINE_STAGES.filter((stage) => stage !== 'Signed' && stage !== 'Lost');
const WEEK_END = ymd(addDays(dateUTC(AS_AT), 7));
const PAGE_SIZE = 25;

function cardLine(enquiry, zoneState) {
  const clock = enquiry.hero ? zoneState.heroReceivedAt : undefined;
  const reqs = presentRequirements(enquiry, zoneState, clock);
  const alert = cardAlert(enquiry, reqs, zoneState.triggers);
  if (alert) return alert;
  const next = nextRequirement(reqs);
  return next ? requirementLine(next) : '';
}

function zoneCardLine(enquiry, zoneState) {
  if (enquiry.qr) return '';
  const clock = enquiry.hero ? zoneState.heroReceivedAt : undefined;
  const reqs = presentRequirements(enquiry, zoneState, clock);
  const alert = cardAlert(enquiry, reqs, zoneState.triggers);
  if (alert) return alert;
  const zone = enquiry.stage === 'Lost' ? (enquiry.leftZone || 'suspect') : zoneOf(enquiry.stage);
  const current = reqs.filter((req) => req.zone === zone);
  const done = current.filter((req) => req.status === 'done').length;
  const next = nextRequirement(current.length ? current : reqs);
  if (!next) return current.length ? `${done} of ${current.length} done` : '';
  const detail = requirementLine(next).replace(`${next.id} · `, '');
  if (!current.length) return requirementLine(next);
  return `${done} of ${current.length} done · ${next.id} ${detail}`;
}

function oldestOpen(enquiry, zoneState) {
  if (enquiry.qr) return '9999-12-31';
  const clock = enquiry.hero ? zoneState.heroReceivedAt : undefined;
  const reqs = presentRequirements(enquiry, zoneState, clock);
  const zone = enquiry.stage === 'Lost' ? (enquiry.leftZone || 'suspect') : zoneOf(enquiry.stage);
  const open = reqs.filter((req) => req.zone === zone && req.status !== 'done' && req.dueAt);
  if (!open.length) return '9999-12-31';
  return open.map((req) => req.dueAt).sort()[0];
}

function waitingText(enquiry) {
  if (enquiry.firstResponseAt || enquiry.stage === 'Lost' || enquiry.stage === 'Signed' || !enquiry.receivedAt) return null;
  const minutes = Math.round((new Date(`${AS_AT}T18:00:00+08:00`) - new Date(enquiry.receivedAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return 'No contact yet';
  if (minutes < 60) return 'Waiting under 1 h';
  const hours = Math.round(minutes / 60);
  return `Waiting ${hours} h`;
}

function matchesView(enquiry, view, role, zoneState) {
  if (!view) return true;
  if (view === 'open') return OPEN.includes(enquiry.stage);
  if (view === 'mine') return role === 'leasing' && enquiry.officer === 'aina';
  if (view === 'awaiting') return !enquiry.firstResponseAt && enquiry.stage !== 'Lost' && enquiry.stage !== 'Signed';
  if (view === 'viewings') {
    const when = String(enquiry.nextFollowUp || '').slice(0, 10);
    return Boolean(when) && when >= '2026-10-26' && when <= '2026-11-01';
  }
  if (view === 'signed') return enquiry.stage === 'Signed';
  if (view === 'suspect' || view === 'prospect' || view === 'customer' || view === 'withdrawn') return zoneOf(enquiry.stage) === view;
  if (view === 'overdue') return presentRequirements(enquiry, zoneState).some((req) => req.status === 'overdue');
  return true;
}

export default function Pipeline() {
  const { state, dispatch, data } = useStore();
  const { screen, search } = useRoute();
  const ui = useUi();
  const canEdit = state.role === 'leasing';
  const listView = screen === 'enquiries';
  const zonesView = !listView && search.layout === 'zones';
  const boardView = !listView && !zonesView;
  const filters = {
    asset: search.asset || '',
    campaign: search.campaign || '',
    source: search.source || '',
    officer: search.officer || '',
  };
  const month = search.month || '';
  const view = search.view || '';
  const zoneFilter = search.zone || '';
  const layout = zonesView ? 'zones' : '';
  const query = search.q || '';
  const stage = search.stage || '';
  const [pending, setPending] = useState(null);
  const [zonePrompt, setZonePrompt] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [freshQr, setFreshQr] = useState(() => new Set());
  const [moveId, setMoveId] = useState(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'receivedAt', dir: 'desc' });
  const [selected, setSelected] = useState(() => new Set());
  const [columnsOn, setColumnsOn] = useState({
    enquirer: true, unit: true, source: true, stage: true, zone: true, next: true, officer: true, received: true, response: true, follow: true, rent: true,
  });
  const seenQr = useRef(new Set());
  const qrReady = useRef(false);
  const pulseTimer = useRef(null);
  const { rows: qrRows, enquiries: qrEnquiries } = useQrEnquiries();
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const base = useMemo(() => filteredEnquiries(data, state, filters).filter((enquiry) => !month || String(enquiry.receivedAt || '').startsWith(month)), [data, state, filters.asset, filters.campaign, filters.source, filters.officer, month]);
  const countsFor = (name) => base.filter((enquiry) => matchesView(enquiry, name, state.role, state)).length;
  const textMatch = (enquiry, q) => {
    if (!q.trim()) return true;
    const asset = assets.find((item) => item.id === enquiry.asset);
    const blob = `${enquiry.business || ''} ${enquiry.contact || ''} ${enquiry.lot || ''} ${enquiry.id || ''} ${asset?.short || ''} ${asset?.name || ''}`.toLowerCase();
    return blob.includes(q.trim().toLowerCase());
  };
  const enquiries = useMemo(
    () => base.filter((enquiry) => matchesView(enquiry, view, state.role, state) && (!stage || enquiry.stage === stage) && (!zoneFilter || zoneOf(enquiry.stage) === zoneFilter) && textMatch(enquiry, query)),
    [base, view, state.role, state, stage, zoneFilter, query, assets],
  );
  const byId = useMemo(() => new Map(enquiries.map((enquiry) => [enquiry.id, enquiry])), [enquiries]);
  const shownQr = useMemo(() => qrEnquiries.filter((enquiry) => {
    if (view && view !== 'open' && view !== 'awaiting') return false;
    if (filters.asset && enquiry.asset !== filters.asset) return false;
    if (filters.campaign) return false;
    if (filters.source && enquiry.source !== filters.source) return false;
    if (filters.officer && enquiry.officer !== filters.officer) return false;
    if (month && !String(enquiry.receivedAt || '').startsWith(month)) return false;
    if (stage && enquiry.stage !== stage) return false;
    if (!textMatch(enquiry, query)) return false;
    return true;
  }).slice().reverse(), [qrEnquiries, filters.asset, filters.campaign, filters.source, filters.officer, month, view, stage, query, assets]);
  const sources = useMemo(() => {
    const names = filteredEnquiries(data, state, {}).map((enquiry) => enquiry.source).filter(Boolean);
    if (qrEnquiries.length) names.push(QR_SOURCE);
    return [...new Set(names)].sort();
  }, [data, state, qrEnquiries.length]);
  const allCount = useMemo(() => liveEnquiries(data, state).length, [data, state]);

  const writeQuery = (patch) => {
    go(listView ? 'enquiries' : 'pipeline', {
      asset: filters.asset,
      campaign: filters.campaign,
      source: filters.source,
      officer: filters.officer,
      month,
      view,
      zone: zoneFilter,
      q: query,
      stage,
      ...(layout ? { layout } : {}),
      ...patch,
    });
  };

  const clearFilters = () => go(listView ? 'enquiries' : 'pipeline');
  const dirty = Boolean(filters.asset || filters.campaign || filters.source || filters.officer || month || view || query || stage || zoneFilter);

  useEffect(() => { setPage(0); }, [filters.asset, filters.campaign, filters.source, filters.officer, month, view, listView]);

  const simulate = () => {
    if (state.heroStage) return;
    dispatch({ type: 'simulateHero' });
  };

  useEffect(() => {
    const arrived = [];
    for (const row of qrRows) {
      if (qrReady.current && row.id && !seenQr.current.has(row.id)) arrived.push(row.id);
      if (row.id) seenQr.current.add(row.id);
    }
    qrReady.current = true;
    if (arrived.length) {
      setFreshQr(new Set(arrived));
      clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setFreshQr(new Set()), 5000);
    }
    return () => clearTimeout(pulseTimer.current);
  }, [qrRows]);

  const finishMove = (enquiry, stage) => {
    commitStage(dispatch, enquiry, stage);
    if (stage === 'Signed' && !enquiry.hero && state.triggers?.T6 !== false) {
      ui.notify({ title: `${enquiry.business} became a Customer`, href: `enquiry/${enquiry.id}`, action: 'Open' });
    }
  };
  const requestMove = (enquiry, stageName) => {
    if (!canEdit || !enquiry || enquiry.qr || enquiry.stage === stageName) return;
    const clock = enquiry.hero ? state.heroReceivedAt : undefined;
    const plan = zoneMovePlan(enquiry, stageName, state, clock);
    if (plan.needsAlert) {
      setZonePrompt({ enquiry, stage: stageName, open: plan.open, from: zoneLabel(plan.from), to: zoneLabel(plan.to) });
      return;
    }
    if (stageName === 'Signed' || stageName === 'Lost') {
      setPending({ enquiry, stage: stageName });
      return;
    }
    finishMove(enquiry, stageName);
  };
  const confirmZoneMove = () => {
    if (!zonePrompt) return;
    const count = zonePrompt.open.length;
    dispatch({
      type: 'note',
      id: zonePrompt.enquiry.id,
      note: { type: 'Note', text: `Moved with ${count} ${count === 1 ? 'requirement' : 'requirements'} open`, by: zonePrompt.enquiry.officer },
    });
    const { enquiry, stage: stageName } = zonePrompt;
    setZonePrompt(null);
    if (stageName === 'Signed' || stageName === 'Lost') {
      setPending({ enquiry, stage: stageName });
      return;
    }
    finishMove(enquiry, stageName);
  };

  const stageCount = (stage) => enquiries.filter((enquiry) => enquiry.stage === stage).length + (stage === 'New' ? shownQr.length : 0);
  const stageRent = (stage) => {
    const rows = enquiries.filter((enquiry) => enquiry.stage === stage);
    const extra = stage === 'New' ? shownQr : [];
    return [...rows, ...extra].reduce((sum, enquiry) => sum + (Number(enquiry.rent) || 0), 0);
  };

  const saved = [
    ['open', 'All open', countsFor('open') + (view === 'open' || !view ? shownQr.length : 0)],
    ...(state.role === 'leasing' ? [['mine', 'Mine', countsFor('mine')]] : []),
    ['awaiting', 'Awaiting first response', countsFor('awaiting')],
    ['viewings', 'Viewings 26 Oct – 1 Nov', countsFor('viewings')],
    ['signed', 'Signed this month', countsFor('signed')],
    ['suspect', 'Suspect', countsFor('suspect')],
    ['prospect', 'Prospect', countsFor('prospect')],
    ['customer', 'Customer', countsFor('customer')],
    ['withdrawn', 'Withdrawn', countsFor('withdrawn')],
    ['overdue', 'Requirements overdue', countsFor('overdue')],
  ];

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = (enquiry) => {
      if (sort.key === 'business') return enquiry.business || '';
      if (sort.key === 'lot') return enquiry.lot || '';
      if (sort.key === 'stage') return enquiry.stage || '';
      if (sort.key === 'officer') return data.officers[enquiry.officer]?.name || '';
      if (sort.key === 'response') return firstResponseMinutes(enquiry);
      if (sort.key === 'follow') return enquiry.nextFollowUp || '';
      if (sort.key === 'rent') return enquiry.rent;
      return enquiry.receivedAt || '';
    };
    return enquiries.slice().sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [enquiries, sort, data.officers]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const exportRows = (rows) => {
    exportSheets({
      filename: 'enquiries',
      sheets: [{
        name: 'Enquiries',
        columns: [
          { key: 'business', label: 'Business' },
          { key: 'contact', label: 'Contact' },
          { key: 'lot', label: 'Lot' },
          { key: 'asset', label: 'Asset' },
          { key: 'source', label: 'Source' },
          { key: 'campaign', label: 'Campaign' },
          { key: 'stage', label: 'Stage' },
          { key: 'officer', label: 'Officer' },
          { key: 'receivedAt', label: 'Received' },
          { key: 'response', label: 'First response minutes' },
          { key: 'nextFollowUp', label: 'Next follow-up' },
          { key: 'rent', label: 'Asking rent' },
        ],
        rows: rows.map((enquiry) => ({
          ...enquiry,
          asset: assets.find((item) => item.id === enquiry.asset)?.short || enquiry.asset,
          campaign: data.campaigns.find((item) => item.id === enquiry.campaign)?.short || '',
          officer: data.officers[enquiry.officer]?.name || enquiry.officer,
          response: firstResponseMinutes(enquiry),
        })),
      }],
    });
  };

  const toggleSort = (key) => setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Enquiries</h1>
          <p className="lead">All rental enquiries, by stage, with where each one came from.</p>
          <p data-testid="pipeline-open">
            {num(enquiries.length + shownQr.length)} on this view
          </p>
        </div>
        <div className="screen-actions">
          <div className="view-toggle" role="group" aria-label="Enquiry view">
            <button type="button" aria-pressed={boardView} className={boardView ? 'on' : ''} onClick={() => go('pipeline', { asset: filters.asset, campaign: filters.campaign, source: filters.source, officer: filters.officer, month, view, zone: zoneFilter })}>Board</button>
            <button type="button" aria-pressed={zonesView} className={zonesView ? 'on' : ''} onClick={() => go('pipeline', { asset: filters.asset, campaign: filters.campaign, source: filters.source, officer: filters.officer, month, view, zone: zoneFilter, layout: 'zones' })}>Zones</button>
            <button type="button" aria-pressed={listView} className={listView ? 'on' : ''} onClick={() => go('enquiries', { asset: filters.asset, campaign: filters.campaign, source: filters.source, officer: filters.officer, month, view, zone: zoneFilter })}>List</button>
          </div>
          {canEdit && (
            <button type="button" className="btn" data-testid="qr-toggle" aria-expanded={showQr} onClick={() => setShowQr((open) => !open)}>
              {showQr ? 'Hide QR code' : 'Show QR code'}
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn btn-primary" data-testid="simulate-enquiry" onClick={simulate}>Simulate enquiry</button>
          )}
        </div>
      </div>
      {showQr && (
        <div className="qr-panel" data-testid="qr-panel">
          <QRCodeSVG value={qrPageUrl()} size={300} title="Send an enquiry" data-testid="qr-code" />
          <div>
            <p className="qr-panel-title">Scan with your phone camera</p>
          </div>
        </div>
      )}
      <Filters
        query={query}
        onQuery={(value) => writeQuery({ q: value })}
        fields={['asset', 'campaign', 'source', 'officer', 'stage']}
        value={{ ...filters, stage }}
        onChange={(next) => writeQuery({
          asset: next.asset, campaign: next.campaign, source: next.source, officer: next.officer, stage: next.stage,
        })}
        assets={assets}
        campaigns={data.campaigns.map((item) => ({ id: item.id, name: item.short }))}
        sources={sources}
        officers={Object.values(data.officers)}
        stages={PIPELINE_STAGES}
        onClear={clearFilters}
        alwaysMore={(
          <label className="filter-chip">
            Zone
            <select data-testid="zone-filter" value={zoneFilter} onChange={(event) => writeQuery({ zone: event.target.value })}>
              <option value="">All</option>
              {ZONES.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
              <option value="withdrawn">Withdrawn</option>
            </select>
          </label>
        )}
        extraChips={[
          month ? { key: 'month', label: `Period: ${data.months.find((item) => item.key === month)?.label || month}`, remove: () => writeQuery({ month: '' }) } : null,
          view ? { key: 'view', label: `View: ${saved.find(([id]) => id === view)?.[1] || view}`, remove: () => writeQuery({ view: '' }) } : null,
          zoneFilter ? { key: 'zone', label: `Zone: ${zoneLabel(zoneFilter)}`, remove: () => writeQuery({ zone: '' }) } : null,
        ].filter(Boolean)}
      >
        <label className="filter-chip">
          Period
          <select value={month} onChange={(event) => writeQuery({ month: event.target.value })}>
            <option value="">All</option>
            {data.months.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </Filters>
      <div className="saved-views">
        {saved.map(([id, label, count]) => (
          <button key={id} type="button" className={view === id ? 'on' : ''} onClick={() => writeQuery({ view: view === id ? '' : id })}>
            {label} ({num(count)})
          </button>
        ))}
      </div>
      {enquiries.length === 0 && shownQr.length === 0 && (
        <p className="empty-state">No enquiries match these filters. <button type="button" className="text-btn" onClick={clearFilters}>Clear filters</button> to see all {num(allCount)}.</p>
      )}
      {boardView && (
        <div className="board">
          {ZONES.map((zone) => {
            const count = zone.stages.reduce((sum, stage) => sum + stageCount(stage), 0);
            const rent = zone.stages.reduce((sum, stage) => sum + stageRent(stage), 0);
            return (
              <div key={zone.id} className={`zone-band zone-${zone.id}`} style={{ gridColumn: `span ${zone.stages.length}` }}>
                {`ZONE ${zone.n} · ${zone.label.toUpperCase()} · ${num(count)} · ${rm(rent)}/mo`}
              </div>
            );
          })}
          <div className="zone-band zone-withdrawn">{`WITHDRAWN · ${num(stageCount('Lost'))}`}</div>
          {PIPELINE_STAGES.map((stage) => (
            <section
              key={stage}
              className="pipe-col"
              data-testid={`column-${stage}`}
              onDragOver={canEdit ? (event) => { event.preventDefault(); } : undefined}
              onDrop={canEdit ? (event) => {
                event.preventDefault();
                requestMove(byId.get(event.dataTransfer.getData('text/plain')), stage);
              } : undefined}
            >
              <header className="pipe-col-head">
                <h2>{stage}</h2>
                <span data-testid={`count-${stage}`}><Num value={stageCount(stage)} format={num} watch={`pipeline:${stage}`} /></span>
                <span className="pipe-rent">{rm(stageRent(stage))}/mo</span>
              </header>
              <div className="pipe-cards">
                {[...(stage === 'New' ? shownQr : []), ...enquiries.filter((enquiry) => enquiry.stage === stage)].map((enquiry) => (
                  <PipeCard
                    key={enquiry.id}
                    enquiry={enquiry}
                    assets={assets}
                    data={data}
                    canEdit={canEdit}
                    fresh={enquiry.hero || freshQr.has(String(enquiry.id).replace(/^qr-/, ''))}
                    moveId={moveId}
                    setMoveId={setMoveId}
                    requestMove={requestMove}
                    onOpen={() => ui.openRecord(enquiry.id)}
                    line={enquiry.qr ? '' : cardLine(enquiry, state)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {zonesView && (
        <ZonePanels
          enquiries={enquiries}
          shownQr={shownQr}
          state={state}
          canEdit={canEdit}
          assets={assets}
          data={data}
          freshQr={freshQr}
          moveId={moveId}
          setMoveId={setMoveId}
          requestMove={requestMove}
          ui={ui}
        />
      )}
      {listView && (
        <>
        <div className="list-tools">
          <div className="table-toolbar">
            <button type="button" className="btn" aria-expanded={moveId === 'columns'} onClick={() => setMoveId((current) => (current === 'columns' ? null : 'columns'))}>Columns</button>
            {moveId === 'columns' && (
              <div className="col-pop" role="group" aria-label="Columns">
                {Object.keys(columnsOn).map((key) => (
                  <label key={key}>
                    <input type="checkbox" checked={columnsOn[key]} onChange={() => setColumnsOn((current) => ({ ...current, [key]: !current[key] }))} />
                    {key}
                  </label>
                ))}
              </div>
            )}
            <button type="button" className="btn" onClick={() => exportRows(sorted)}>Export to Excel</button>
          </div>
          {canEdit && selected.size > 0 && (
            <>
              <Field label="Reassign">
                <select defaultValue="" onChange={(event) => {
                  const officer = event.target.value;
                  if (!officer) return;
                  selected.forEach((id) => dispatch({ type: 'reassign', id, officer }));
                  setSelected(new Set());
                }}>
                  <option value="">Select…</option>
                  {Object.values(data.officers).map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
                </select>
              </Field>
              <button type="button" className="btn" onClick={() => exportRows(sorted.filter((enquiry) => selected.has(enquiry.id)))}>Export selected</button>
            </>
          )}
        </div>
          <div className="table-scroll">
            <table className="table data-table enquiry-list">
              <thead>
                <tr>
                  {canEdit && <th />}
                  {columnsOn.enquirer && <th><button type="button" className="th-btn" onClick={() => toggleSort('business')}>Enquirer</button></th>}
                  {columnsOn.unit && <th><button type="button" className="th-btn" onClick={() => toggleSort('lot')}>Unit</button></th>}
                  {columnsOn.source && <th><span className="th-label">Source and campaign</span></th>}
                  {columnsOn.stage && <th><button type="button" className="th-btn" onClick={() => toggleSort('stage')}>Stage</button></th>}
                  {columnsOn.zone && <th><span className="th-label">Zone</span></th>}
                  {columnsOn.next && <th><span className="th-label">Next requirement</span></th>}
                  {columnsOn.officer && <th><button type="button" className="th-btn" onClick={() => toggleSort('officer')}>Officer</button></th>}
                  {columnsOn.received && <th><button type="button" className="th-btn" onClick={() => toggleSort('receivedAt')}>Received</button></th>}
                  {columnsOn.response && <th><button type="button" className="th-btn" onClick={() => toggleSort('response')}>First response</button></th>}
                  {columnsOn.follow && <th><button type="button" className="th-btn" onClick={() => toggleSort('follow')}>Next follow-up</button></th>}
                  {columnsOn.rent && <th className="r"><button type="button" className="th-btn" onClick={() => toggleSort('rent')}>Asking rent</button></th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((enquiry) => {
                  const asset = assets.find((item) => item.id === enquiry.asset);
                  const officer = data.officers[enquiry.officer];
                  const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
                  const minutes = firstResponseMinutes(enquiry);
                  return (
                    <tr key={enquiry.id} className="clickable" onClick={() => ui.openRecord(enquiry.id)}>
                      {canEdit && (
                        <td onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(enquiry.id)} aria-label={`Select ${enquiry.business}`} onChange={() => {
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(enquiry.id)) next.delete(enquiry.id);
                              else next.add(enquiry.id);
                              return next;
                            });
                          }} />
                        </td>
                      )}
                      {columnsOn.enquirer && (
                        <td>
                          <span className="name-cell">
                            <span className="avatar" aria-hidden="true">{initialsOf(enquiry.business)}</span>
                            <span className="name-stack">
                              <strong>{enquiry.business}</strong>
                              <span className="cell-note">{enquiry.contact || '–'}</span>
                            </span>
                          </span>
                        </td>
                      )}
                      {columnsOn.unit && <td><span className="lot-chip">{enquiry.lot || '–'}</span> {asset?.short || ''}</td>}
                      {columnsOn.source && (
                        <td className="source-line" title={enquiry.ad || ''}>
                          <SourceIcon source={enquiry.source} />
                          <span>{campaign?.short || enquiry.source || '–'}</span>
                        </td>
                      )}
                      {columnsOn.stage && <td><span className="stage-pill">{enquiry.stage}</span></td>}
                      {columnsOn.zone && <td><span className={`zone-chip zone-${zoneOf(enquiry.stage)}`}>{zoneLabel(zoneOf(enquiry.stage))}</span></td>}
                      {columnsOn.next && <td>{cardLine(enquiry, state)}</td>}
                      {columnsOn.officer && <td><span className={`avatar tint-${officerTint(officer?.id)}`} aria-hidden="true">{officerMark(officer)}</span> {officer?.name?.split(' ')[0] || '–'}</td>}
                      {columnsOn.received && <td>{dateTime(enquiry.receivedAt)}</td>}
                      {columnsOn.response && <td>{minutes == null ? 'Not yet' : duration(minutes)}</td>}
                      {columnsOn.follow && <td>{date(enquiry.nextFollowUp)}</td>}
                      {columnsOn.rent && <td className="r">{enquiry.rent != null ? `${rm(enquiry.rent)}/mo` : '–'}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>{page + 1} of {pages}</span>
            <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </>
      )}
      <ZoneMoveDialog
        open={Boolean(zonePrompt)}
        fromLabel={zonePrompt?.from}
        toLabel={zonePrompt?.to}
        openItems={zonePrompt?.open || []}
        onStay={() => setZonePrompt(null)}
        onMove={confirmZoneMove}
      />
      <SignedDialog
        open={pending?.stage === 'Signed'}
        enquiry={pending?.enquiry}
        assetName={assets.find((item) => item.id === pending?.enquiry?.asset)?.name}
        unit={data.units.find((item) => item.id === pending?.enquiry?.unitId) || data.units.find((item) => item.asset === pending?.enquiry?.asset && item.lot === pending?.enquiry?.lot)}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, pending.enquiry, 'Signed', extra);
          if (!pending.enquiry.hero && state.triggers?.T6 !== false) {
            ui.notify({ title: `${pending.enquiry.business} became a Customer`, href: `enquiry/${pending.enquiry.id}`, action: 'Open' });
          }
          setPending(null);
        }}
      />
      <LostDialog
        open={pending?.stage === 'Lost'}
        enquiry={pending?.enquiry}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, pending.enquiry, 'Lost', extra);
          ui.notify({
            title: `Marked as lost: ${pending.enquiry.business}${pending.enquiry.lot ? `, ${unitLabel(data.units.find((item) => item.id === pending.enquiry.unitId) || { lot: pending.enquiry.lot, use: pending.enquiry.use })}` : ''}`,
            detail: extra.lostReason,
            href: `enquiry/${pending.enquiry.id}`,
            action: 'Open',
          });
          setPending(null);
        }}
      />
    </section>
  );
}

function PipeCard({ enquiry, assets, data, canEdit, fresh, moveId, setMoveId, requestMove, onOpen, line }) {
  const asset = assets.find((item) => item.id === enquiry.asset);
  const officer = data.officers[enquiry.officer];
  const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
  const days = daysInStage(enquiry);
  const waiting = waitingText(enquiry);
  const overdue = /overdue/i.test(line || '');
  return (
    <article
      className={`pipe-card${fresh ? ' is-new' : ''}`}
      draggable={canEdit && !enquiry.qr}
      data-testid={enquiry.hero ? 'hero-card' : (enquiry.qr ? 'qr-card' : undefined)}
      onClick={(event) => {
        if (event.target.closest('a, button')) return;
        onOpen();
      }}
      onDragStart={canEdit && !enquiry.qr ? (event) => {
        event.dataTransfer.setData('text/plain', enquiry.id);
        event.dataTransfer.effectAllowed = 'move';
      } : undefined}
    >
      {fresh && <span className="crest-dot" aria-hidden="true" />}
      <div className="card-title-row">
        <a className="card-title" href={`#/enquiry/${enquiry.id}`} onClick={(event) => { event.preventDefault(); go('enquiry', enquiry.id); }}>{enquiry.business}</a>
        {canEdit && !enquiry.qr && (
          <div className="move-menu">
            <button type="button" className="btn move-btn" aria-label={`Actions for ${enquiry.business}`} aria-expanded={moveId === enquiry.id} onClick={() => setMoveId((current) => (current === enquiry.id ? null : enquiry.id))}>
              <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            {moveId === enquiry.id && (
              <div className="move-list" role="menu" aria-label={`Move ${enquiry.business}`}>
                <p className="overline move-heading">Move to</p>
                {PIPELINE_STAGES.map((item) => (
                  <button key={item} type="button" role="menuitem" disabled={item === enquiry.stage} onClick={() => { setMoveId(null); requestMove(enquiry, item); }}>{item}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="card-contact">{enquiry.contact || '–'}</span>
      <span className="card-lot"><span className="lot-chip">{enquiry.lot || '–'}</span> {asset?.short || ''}</span>
      <span className="source-line">
        <SourceIcon source={enquiry.source} />
        <span>{campaign?.short || enquiry.source || '–'}</span>
      </span>
      <span className="stage-pill">{enquiry.stage}</span>
      <span className="card-foot">
        <span>{enquiry.rent != null ? `${rm(enquiry.rent)}/mo` : '–'}</span>
        <span className={`avatar tint-${officerTint(officer?.id)}`} title={officer?.name || ''}>{officerMark(officer)}</span>
        <span>{waiting || (days == null ? '' : `${num(days)} ${days === 1 ? 'day' : 'days'}`)}</span>
      </span>
      {enquiry.stage === 'Lost' && enquiry.lostReason && <span className="reason-pill">{enquiry.lostReason}</span>}
      {line ? <span className={overdue ? 'req-line is-overdue' : 'req-line'}>{line}</span> : null}
    </article>
  );
}

function reachedProspect(enquiry) {
  const stages = new Set([enquiry.stage, ...(enquiry.history || []).map((entry) => entry[0])]);
  return ['Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed'].some((stage) => stages.has(stage));
}

function leftFrom(enquiry) {
  if (enquiry.leftZone) return enquiry.leftZone;
  const prior = (enquiry.history || []).map((entry) => entry[0]).filter((stage) => stage !== 'Lost').at(-1);
  return zoneOf(prior || 'New');
}

function ZonePanels({ enquiries, shownQr, state, canEdit, assets, data, freshQr, moveId, setMoveId, requestMove, ui }) {
  const medians = medianDaysInZone(enquiries.filter((enquiry) => !enquiry.hero));
  const flow = octoberMovements(enquiries);
  const reached = enquiries.filter(reachedProspect).length;
  const panels = [
    ...ZONES.map((zone) => ({ ...zone, target: zone.stages[0] })),
    { id: 'withdrawn', label: 'Withdrawn', stages: ['Lost'], target: 'Lost' },
  ];
  const rowsFor = (zone) => {
    const seeded = enquiries.filter((enquiry) => zoneOf(enquiry.stage) === zone.id);
    const extra = zone.id === 'suspect' ? shownQr : [];
    return [...extra, ...seeded].slice().sort((a, b) => String(oldestOpen(a, state)).localeCompare(String(oldestOpen(b, state))));
  };
  return (
    <div data-testid="zones-view">
      <div className="zone-board">
        {panels.map((zone) => {
          const rows = rowsFor(zone);
          const rent = rows.reduce((sum, enquiry) => sum + (Number(enquiry.rent) || 0), 0);
          const late = rows.filter((enquiry) => {
            const clock = enquiry.hero ? state.heroReceivedAt : undefined;
            return firstContactOverdue(presentRequirements(enquiry, state, clock), state.triggers);
          }).length;
          const viewings = state.triggers?.T4 === false ? 0 : rows.filter((enquiry) => {
            const clock = enquiry.hero ? state.heroReceivedAt : undefined;
            return presentRequirements(enquiry, state, clock).some((req) => req.id === 'P2' && req.status === 'overdue');
          }).length;
          const handed = rows.filter((enquiry) => handoverOf(enquiry, state) === 'handed').length;
          const ready = zone.id === 'customer' ? rows.length - handed : 0;
          const fromSuspect = rows.filter((enquiry) => leftFrom(enquiry) === 'suspect').length;
          const fromProspect = rows.filter((enquiry) => leftFrom(enquiry) === 'prospect').length;
          return (
            <section
              key={zone.id}
              className={`zone-panel zone-${zone.id}`}
              data-testid={`zone-${zone.id}`}
              onDragOver={canEdit ? (event) => event.preventDefault() : undefined}
              onDrop={canEdit ? (event) => {
                event.preventDefault();
                const enquiry = enquiries.find((item) => item.id === event.dataTransfer.getData('text/plain'));
                requestMove(enquiry, zone.target);
              } : undefined}
            >
              <header className="zone-panel-head">
                <p className="overline">{zone.id === 'withdrawn' ? 'Withdrawn' : `Zone ${zone.n} · ${zone.label}`}</p>
                <div className="zone-stats">
                  <span className="zone-figure" data-testid={`zone-count-${zone.id}`}>{num(rows.length)}</span>
                  {zone.id !== 'withdrawn' && <span className="zone-rent">{rm(rent)}/mo</span>}
                </div>
                {zone.id === 'suspect' && <p className="zone-meta">median {medians.suspect ?? '–'} days in zone</p>}
                {zone.id === 'suspect' && state.triggers?.T2 !== false && <p className="zone-meta">{num(late)} first contact overdue</p>}
                {zone.id === 'prospect' && <p className="zone-meta">median {medians.prospect ?? '–'} days in zone</p>}
                {zone.id === 'prospect' && state.triggers?.T4 !== false && <p className="zone-meta">{num(viewings)} viewings to log</p>}
                {zone.id === 'customer' && <p className="zone-meta">{num(handed)} handed over · {num(ready)} ready</p>}
                {zone.id === 'customer' && <p className="zone-meta">{num(ready)} handovers due</p>}
                {zone.id === 'withdrawn' && <p className="zone-meta">{num(fromSuspect)} from Suspect</p>}
                {zone.id === 'withdrawn' && <p className="zone-meta">{num(fromProspect)} from Prospect</p>}
              </header>
              <div className="zone-cards">
                {rows.map((enquiry) => (
                  <PipeCard
                    key={enquiry.id}
                    enquiry={enquiry}
                    assets={assets}
                    data={data}
                    canEdit={canEdit}
                    fresh={enquiry.hero || freshQr.has(String(enquiry.id).replace(/^qr-/, ''))}
                    moveId={moveId}
                    setMoveId={setMoveId}
                    requestMove={requestMove}
                    onOpen={() => ui.openRecord(enquiry.id)}
                    line={zoneCardLine(enquiry, state)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="zone-flow" data-testid="zone-flow">
        <p>{num(reached)} have reached Prospect · median {flow.medianToProspect ?? '–'} days</p>
        <span aria-hidden="true">→</span>
        <p>{num(flow.becameCustomer)} became Customer this month · median {flow.medianToCustomer ?? '–'} days</p>
        <span aria-hidden="true">→</span>
      </div>
    </div>
  );
}

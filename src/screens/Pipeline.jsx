import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../store.jsx';
import { go, useRoute } from '../router.js';
import { useUi } from '../ui.jsx';
import Filters from '../components/Filters.jsx';
import Num from '../components/Num.jsx';
import SourceIcon from '../components/SourceIcon.jsx';
import { LostDialog, SignedDialog, commitStage } from '../components/MoveDialogs.jsx';
import { exportSheets } from '../components/ExportButton.jsx';
import { AS_AT, PIPELINE_STAGES } from '../data/config.js';
import { daysInStage, filteredEnquiries, firstResponseMinutes, liveAssets, liveEnquiries } from '../data/selectors.js';
import { date, dayMonth, duration, num, rm, time } from '../format.js';
import { addDays, dateUTC, ymd } from '../data/rng.js';
import { QR_SOURCE } from '../qrEnquiry.js';
import { qrPageUrl, useQrEnquiries } from '../qrStore.js';

const OPEN = PIPELINE_STAGES.filter((stage) => stage !== 'Signed' && stage !== 'Lost');
const WEEK_END = ymd(addDays(dateUTC(AS_AT), 7));
const PAGE_SIZE = 25;

function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '–';
}

function waitingText(enquiry) {
  if (enquiry.firstResponseAt || enquiry.stage === 'Lost' || enquiry.stage === 'Signed' || !enquiry.receivedAt) return null;
  const minutes = Math.round((new Date(`${AS_AT}T18:00:00+08:00`) - new Date(enquiry.receivedAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return 'No contact yet';
  return `No contact yet, ${duration(minutes)}`;
}

function matchesView(enquiry, view, role) {
  if (!view) return true;
  if (view === 'open') return OPEN.includes(enquiry.stage);
  if (view === 'mine') return role === 'leasing' && enquiry.officer === 'aina';
  if (view === 'awaiting') return !enquiry.firstResponseAt && enquiry.stage !== 'Lost' && enquiry.stage !== 'Signed';
  if (view === 'viewings') return enquiry.stage === 'Viewing Scheduled' && enquiry.nextFollowUp >= AS_AT && enquiry.nextFollowUp <= WEEK_END;
  if (view === 'signed') return enquiry.stage === 'Signed';
  return true;
}

export default function Pipeline() {
  const { state, dispatch, data } = useStore();
  const { screen, search } = useRoute();
  const ui = useUi();
  const canEdit = state.role === 'leasing';
  const listView = screen === 'enquiries';
  const filters = {
    asset: search.asset || '',
    campaign: search.campaign || '',
    source: search.source || '',
    officer: search.officer || '',
  };
  const month = search.month || '';
  const view = search.view || '';
  const [pending, setPending] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [freshQr, setFreshQr] = useState(() => new Set());
  const [moveId, setMoveId] = useState(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'receivedAt', dir: 'desc' });
  const [selected, setSelected] = useState(() => new Set());
  const [columnsOn, setColumnsOn] = useState({
    enquirer: true, unit: true, source: true, stage: true, officer: true, received: true, response: true, follow: true, rent: true,
  });
  const seenQr = useRef(new Set());
  const qrReady = useRef(false);
  const pulseTimer = useRef(null);
  const { rows: qrRows, enquiries: qrEnquiries } = useQrEnquiries();
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const base = useMemo(() => filteredEnquiries(data, state, filters).filter((enquiry) => !month || String(enquiry.receivedAt || '').startsWith(month)), [data, state, filters.asset, filters.campaign, filters.source, filters.officer, month]);
  const countsFor = (name) => base.filter((enquiry) => matchesView(enquiry, name, state.role)).length;
  const enquiries = useMemo(() => base.filter((enquiry) => matchesView(enquiry, view, state.role)), [base, view, state.role]);
  const byId = useMemo(() => new Map(enquiries.map((enquiry) => [enquiry.id, enquiry])), [enquiries]);
  const shownQr = useMemo(() => qrEnquiries.filter((enquiry) => {
    if (view && view !== 'open' && view !== 'awaiting') return false;
    if (filters.asset && enquiry.asset !== filters.asset) return false;
    if (filters.campaign) return false;
    if (filters.source && enquiry.source !== filters.source) return false;
    if (filters.officer && enquiry.officer !== filters.officer) return false;
    if (month && !String(enquiry.receivedAt || '').startsWith(month)) return false;
    return true;
  }).slice().reverse(), [qrEnquiries, filters.asset, filters.campaign, filters.source, filters.officer, month, view]);
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
      ...patch,
    });
  };

  const clearFilters = () => go(listView ? 'enquiries' : 'pipeline');
  const dirty = Boolean(filters.asset || filters.campaign || filters.source || filters.officer || month || view);

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

  const requestMove = (enquiry, stage) => {
    if (!canEdit || !enquiry || enquiry.qr || enquiry.stage === stage) return;
    if (stage === 'Signed' || stage === 'Lost') {
      setPending({ enquiry, stage });
      return;
    }
    commitStage(dispatch, enquiry, stage);
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
    ['viewings', 'Viewings this week', countsFor('viewings')],
    ['signed', 'Signed this month', countsFor('signed')],
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
            <button type="button" className={!listView ? 'on' : ''} onClick={() => go('pipeline', { asset: filters.asset, campaign: filters.campaign, source: filters.source, officer: filters.officer, month, view })}>Board</button>
            <button type="button" className={listView ? 'on' : ''} onClick={() => go('enquiries', { asset: filters.asset, campaign: filters.campaign, source: filters.source, officer: filters.officer, month, view })}>List</button>
          </div>
          <button type="button" className="btn" data-testid="qr-toggle" aria-expanded={showQr} onClick={() => setShowQr((open) => !open)}>
            {showQr ? 'Hide QR code' : 'Show QR code'}
          </button>
          {canEdit && (
            <button type="button" className="btn btn-primary" data-testid="simulate-enquiry" onClick={simulate}>Simulate enquiry</button>
          )}
        </div>
      </div>
      {showQr && (
        <div className="qr-panel" data-testid="qr-panel">
          <QRCodeSVG value={qrPageUrl()} size={300} title="Send an enquiry" data-testid="qr-code" />
          <div>
            <p className="qr-panel-title">Scan to send a live enquiry</p>
            <p className="qr-panel-url">{qrPageUrl()}</p>
          </div>
        </div>
      )}
      <div className="filter-bar">
        <Filters
          fields={['asset', 'campaign', 'source', 'officer']}
          value={filters}
          onChange={(next) => writeQuery({ asset: next.asset, campaign: next.campaign, source: next.source, officer: next.officer })}
          assets={assets}
          campaigns={data.campaigns.map((item) => ({ id: item.id, name: item.short }))}
          sources={sources}
          officers={Object.values(data.officers)}
          clearable={false}
        />
        <label className="filter-chip">
          Period
          <select value={month} onChange={(event) => writeQuery({ month: event.target.value })}>
            <option value="">All</option>
            {data.months.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        {dirty && <button type="button" className="text-btn" onClick={clearFilters}>Clear filters</button>}
      </div>
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
      {!listView && (
        <div className="board">
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
                {[...(stage === 'New' ? shownQr : []), ...enquiries.filter((enquiry) => enquiry.stage === stage)].map((enquiry) => {
                  const asset = assets.find((item) => item.id === enquiry.asset);
                  const officer = data.officers[enquiry.officer];
                  const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
                  const days = daysInStage(enquiry);
                  const waiting = waitingText(enquiry);
                  const fresh = enquiry.hero || freshQr.has(String(enquiry.id).replace(/^qr-/, ''));
                  return (
                    <article
                      key={enquiry.id}
                      className={`pipe-card${fresh ? ' is-new' : ''}`}
                      draggable={canEdit && !enquiry.qr}
                      data-testid={enquiry.hero ? 'hero-card' : (enquiry.qr ? 'qr-card' : undefined)}
                      onClick={(event) => {
                        if (event.target.closest('a, button')) return;
                        ui.openRecord(enquiry.id);
                      }}
                      onDragStart={canEdit && !enquiry.qr ? (event) => {
                        event.dataTransfer.setData('text/plain', enquiry.id);
                        event.dataTransfer.effectAllowed = 'move';
                      } : undefined}
                    >
                      {fresh && <span className="crest-dot" aria-hidden="true" />}
                      <a href={`#/enquiry/${enquiry.id}`} onClick={(event) => { event.preventDefault(); go('enquiry', enquiry.id); }}>{enquiry.business}</a>
                      <span className="card-contact">{enquiry.contact || '–'}</span>
                      <span className="card-lot"><span className="lot-chip">{enquiry.lot || '–'}</span> {asset?.short || ''}</span>
                      <span className="source-line">
                        <SourceIcon source={enquiry.source} />
                        <span>{campaign?.short || enquiry.source || '–'}</span>
                      </span>
                      <span className="card-foot">
                        <span>{enquiry.rent != null ? `${rm(enquiry.rent)}/mo` : '–'}</span>
                        <span className="avatar" title={officer?.name || ''}>{initials(officer?.name)}</span>
                        <span>{waiting || (days == null ? '' : `${num(days)} ${days === 1 ? 'day' : 'days'}`)}</span>
                        {canEdit && !enquiry.qr && (
                          <div className="move-menu">
                            <button type="button" className="btn move-btn" aria-label={`Move ${enquiry.business}`} aria-expanded={moveId === enquiry.id} onClick={() => setMoveId((current) => (current === enquiry.id ? null : enquiry.id))}>
                              <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            {moveId === enquiry.id && (
                              <ul className="move-list" role="menu">
                                {PIPELINE_STAGES.filter((item) => item !== enquiry.stage).map((item) => (
                                  <li key={item}>
                                    <button type="button" role="menuitem" onClick={() => { setMoveId(null); requestMove(enquiry, item); }}>{item}</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </span>
                      {enquiry.stage === 'Lost' && enquiry.lostReason && <span className="reason-pill">{enquiry.lostReason}</span>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      {listView && (
        <div className="list-tools">
          <details>
            <summary>Columns</summary>
            {Object.keys(columnsOn).map((key) => (
              <label key={key}>
                <input type="checkbox" checked={columnsOn[key]} onChange={() => setColumnsOn((current) => ({ ...current, [key]: !current[key] }))} />
                {key}
              </label>
            ))}
          </details>
          <button type="button" className="btn" onClick={() => exportRows(sorted)}>Export to Excel</button>
          {canEdit && selected.size > 0 && (
            <>
              <label>
                Reassign
                <select defaultValue="" onChange={(event) => {
                  const officer = event.target.value;
                  if (!officer) return;
                  selected.forEach((id) => dispatch({ type: 'reassign', id, officer }));
                  setSelected(new Set());
                }}>
                  <option value="">Choose officer</option>
                  {Object.values(data.officers).map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
                </select>
              </label>
              <button type="button" className="btn" onClick={() => exportRows(sorted.filter((enquiry) => selected.has(enquiry.id)))}>Export selected</button>
            </>
          )}
          <div className="table-scroll">
            <table className="table data-table">
              <thead>
                <tr>
                  {canEdit && <th />}
                  {columnsOn.enquirer && <th><button type="button" className="th-btn" onClick={() => toggleSort('business')}>Enquirer</button></th>}
                  {columnsOn.unit && <th><button type="button" className="th-btn" onClick={() => toggleSort('lot')}>Unit</button></th>}
                  {columnsOn.source && <th>Source and campaign</th>}
                  {columnsOn.stage && <th><button type="button" className="th-btn" onClick={() => toggleSort('stage')}>Stage</button></th>}
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
                            <span className="avatar" aria-hidden="true">{initials(enquiry.business)}</span>
                            <strong>{enquiry.business}</strong>
                            <span className="cell-note">{enquiry.contact || '–'}</span>
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
                      {columnsOn.officer && <td><span className="avatar" aria-hidden="true">{initials(officer?.name)}</span> {officer?.name?.split(' ')[0] || '–'}</td>}
                      {columnsOn.received && <td>{dayMonth(enquiry.receivedAt)}, {time(enquiry.receivedAt)}</td>}
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
        </div>
      )}
      <SignedDialog
        open={pending?.stage === 'Signed'}
        enquiry={pending?.enquiry}
        onClose={() => setPending(null)}
        onConfirm={(extra) => { commitStage(dispatch, pending.enquiry, 'Signed', extra); setPending(null); }}
      />
      <LostDialog
        open={pending?.stage === 'Lost'}
        onClose={() => setPending(null)}
        onConfirm={(extra) => { commitStage(dispatch, pending.enquiry, 'Lost', extra); setPending(null); }}
      />
    </section>
  );
}

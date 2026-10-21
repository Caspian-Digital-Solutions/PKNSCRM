import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Mail, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go } from '../router.js';
import Num from './Num.jsx';
import SourceIcon from './SourceIcon.jsx';
import { LostDialog, SignedDialog, commitStage } from './MoveDialogs.jsx';
import { AS_AT, PIPELINE_STAGES } from '../data/config.js';
import { contactLog, firstResponseMinutes, liveAssets, liveEnquiries, liveUnits } from '../data/selectors.js';
import { useQrEnquiries } from '../qrStore.js';
import { date, dayMonth, duration, num, rm, rm2, time } from '../format.js';
import { addDays, dateUTC, ymd } from '../data/rng.js';

const LOG_TYPES = ['Call', 'WhatsApp', 'Email', 'Viewing', 'Note'];
const OPEN = PIPELINE_STAGES.filter((stage) => stage !== 'Signed' && stage !== 'Lost');

function atOf(enquiry, stage) {
  return (enquiry.history || []).find((entry) => entry[0] === stage)?.[1] || null;
}

function elapsed(from, to) {
  if (!from || !to) return null;
  const minutes = Math.round((new Date(to) - new Date(from)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 60) return `+${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `+${hours} h`;
  const days = Math.round(minutes / 1440);
  return `+${days} ${days === 1 ? 'day' : 'days'}`;
}

function dayGroup(iso) {
  const day = String(iso || '').slice(0, 10);
  if (day === AS_AT) return 'Today';
  if (day === ymd(addDays(dateUTC(AS_AT), -1))) return 'Yesterday';
  return date(iso);
}

function paidSource(source) {
  return ['Facebook Lead Ad', 'Instagram', 'Google Ads', 'Boosted post'].includes(source);
}

export default function EnquiryRecord({ id, variant = 'page', onClose }) {
  const { state, dispatch, data } = useStore();
  const ui = useUi();
  const canEdit = state.role === 'leasing';
  const [pending, setPending] = useState(null);
  const [menu, setMenu] = useState(false);
  const [viewDate, setViewDate] = useState('');
  const [viewTime, setViewTime] = useState('');
  const stored = ui.drafts[id] || { type: 'Call', text: '' };
  const [entryType, setEntryType] = useState(stored.type || 'Call');
  const [entryText, setEntryText] = useState(stored.text || '');
  const seenStage = useRef(null);
  const [crest, setCrest] = useState(false);
  const enquiries = useMemo(() => liveEnquiries(data, state), [data, state]);
  const { enquiries: qrEnquiries, ready: qrReady } = useQrEnquiries();
  const enquiry = enquiries.find((item) => item.id === id) || qrEnquiries.find((item) => item.id === id);
  const units = useMemo(() => liveUnits(data, state), [data, state]);
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const log = useMemo(() => (enquiry ? contactLog(data, state, enquiry.id) : []), [data, state, enquiry]);

  useEffect(() => {
    const next = ui.drafts[id] || { type: 'Call', text: '' };
    setEntryType(next.type || 'Call');
    setEntryText(next.text || '');
    setViewDate(next.viewDate || '');
    setViewTime(next.viewTime || '');
  }, [id]);

  useEffect(() => {
    if (!id) return;
    ui.setDraft(id, { type: entryType, text: entryText, viewDate, viewTime });
  }, [id, entryType, entryText, viewDate, viewTime, ui.setDraft]);

  useEffect(() => {
    if (!enquiry) return undefined;
    const previous = seenStage.current;
    seenStage.current = enquiry.stage;
    if (previous && previous !== 'Signed' && enquiry.stage === 'Signed') {
      setCrest(true);
      const timer = setTimeout(() => setCrest(false), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [enquiry?.stage]);

  if (!enquiry) {
    return (
      <section className="record">
        <h1 className="page-title">Enquiry</h1>
        <p>{id.startsWith('qr-') && !qrReady ? 'Loading the live enquiry…' : 'This enquiry is not on the board.'}</p>
        <p><button type="button" className="btn" onClick={() => go('pipeline')}>Back to enquiries</button></p>
      </section>
    );
  }

  const asset = assets.find((item) => item.id === enquiry.asset);
  const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
  const officer = data.officers[enquiry.officer];
  const unit = units.find((item) => item.id === enquiry.unitId)
    || units.find((item) => item.asset === enquiry.asset && item.lot === enquiry.lot);
  const minutes = firstResponseMinutes(enquiry);
  const editable = canEdit && !enquiry.qr;
  const form = enquiry.leadForm || {};
  const others = enquiries.filter((item) => item.id !== enquiry.id && item.unitId && item.unitId === enquiry.unitId && OPEN.includes(item.stage));
  const firstYear = (enquiry.confirmedRent ?? enquiry.rent) != null ? (enquiry.confirmedRent ?? enquiry.rent) * 12 : null;
  const nodes = [
    {
      id: 'ad',
      label: paidSource(enquiry.source) ? 'Ad' : (enquiry.source || 'Source'),
      at: null,
      reached: true,
      body: paidSource(enquiry.source) ? (enquiry.ad || enquiry.attribution?.ad || 'Ad') : (enquiry.attribution?.utm || enquiry.source || 'Source'),
    },
    { id: 'received', label: 'Enquiry received', at: enquiry.receivedAt, reached: Boolean(enquiry.receivedAt), pending: 'Not received' },
    { id: 'contact', label: 'First contact', at: enquiry.firstResponseAt, reached: Boolean(enquiry.firstResponseAt), pending: 'Not contacted' },
    { id: 'viewing', label: 'Viewing', at: atOf(enquiry, 'Viewing Scheduled'), reached: Boolean(atOf(enquiry, 'Viewing Scheduled')), pending: 'Viewing: not scheduled' },
    { id: 'offer', label: 'Offer', at: atOf(enquiry, 'Negotiation'), reached: Boolean(atOf(enquiry, 'Negotiation')), pending: 'Offer: not sent' },
    { id: 'tenancy', label: 'Tenancy', at: atOf(enquiry, 'Signed'), reached: enquiry.stage === 'Signed', pending: 'Tenancy: not signed' },
  ];
  let previousAt = null;
  const rail = nodes.map((node) => {
    const gap = node.reached ? elapsed(previousAt, node.at) : null;
    if (node.reached && node.at) previousAt = node.at;
    return { ...node, gap };
  });

  const feed = [];
  if (enquiry.receivedAt) {
    feed.push({ at: enquiry.receivedAt, kind: 'system', text: `Enquiry received from ${enquiry.source || 'an unknown source'}` });
  }
  for (const [stage, at] of enquiry.history || []) {
    if (stage === 'New') continue;
    feed.push({ at, kind: 'stage', text: `Stage moved to ${stage}` });
  }
  for (const entry of log) {
    feed.push({ at: entry.at, kind: entry.type || 'Note', text: entry.text, by: entry.by, type: entry.type });
  }
  feed.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const groups = [];
  for (const item of feed) {
    const label = dayGroup(item.at);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) groups.push({ label, items: [item] });
    else last.items.push(item);
  }

  const requestStage = (stage) => {
    if (!editable || stage === enquiry.stage) return;
    setMenu(false);
    if (stage === 'Signed' || stage === 'Lost') {
      setPending(stage);
      return;
    }
    commitStage(dispatch, enquiry, stage);
  };

  const addEntry = (event) => {
    event.preventDefault();
    const note = entryText.trim();
    if (!note) return;
    dispatch({ type: 'note', id: enquiry.id, note: { type: entryType, text: note, by: enquiry.officer } });
    setEntryText('');
    ui.notify({ title: entryType === 'Viewing' ? 'Viewing noted' : `${entryType} logged` });
  };

  const scheduleViewing = () => {
    setEntryType('Viewing');
    if (!viewDate) return;
    const note = entryText.trim() || `Viewing booked for ${viewDate}${viewTime ? ` ${viewTime}` : ''}.`;
    dispatch({ type: 'note', id: enquiry.id, note: { type: 'Viewing', text: note, by: enquiry.officer } });
    if (viewDate) dispatch({ type: 'followUp', id: enquiry.id, date: viewDate });
    if (enquiry.stage !== 'Viewing Scheduled' && enquiry.stage !== 'Signed' && enquiry.stage !== 'Lost') {
      commitStage(dispatch, enquiry, 'Viewing Scheduled');
    }
    setEntryText('');
    ui.notify({ title: 'Viewing scheduled', detail: `${viewDate}${viewTime ? `, ${viewTime}` : ''}` });
  };

  const offerLabel = ['Negotiation', 'Signed'].includes(enquiry.stage) ? 'Draft' : 'Not started';
  const tenancyLabel = enquiry.stage === 'Signed' ? 'Generated' : 'Not started';

  return (
    <section className={`record${variant === 'drawer' ? ' record-drawer' : ''}`}>
      {variant === 'drawer' && (
        <div className="drawer-tools">
          <button type="button" className="btn" onClick={() => { onClose?.(); go('enquiry', enquiry.id); }}>Open full page</button>
          <button type="button" className="btn" onClick={onClose} aria-label="Close">Close</button>
        </div>
      )}
      <h1 className="page-title">{enquiry.business}</h1>
      <p className="lead">
        {enquiry.contact || '–'}{enquiry.title ? `, ${enquiry.title}` : ''}
        <span className="lead-stage">{enquiry.stage}</span>
      </p>
      {campaign && (
        <p className="crumb">
          <a href={`#/campaign/${campaign.id}`} onClick={(event) => { event.preventDefault(); go('campaign', campaign.id); }}>Back to campaign</a>
        </p>
      )}
      {editable && !pending && (
        <div className="record-actions">
          <button type="button" className="btn" onClick={() => setEntryType('Call')}><Phone size={18} strokeWidth={1.75} aria-hidden="true" /> Log call</button>
          <button type="button" className="btn" onClick={() => setEntryType('WhatsApp')}><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" /> WhatsApp</button>
          <button type="button" className="btn" onClick={() => setEntryType('Email')}><Mail size={18} strokeWidth={1.75} aria-hidden="true" /> Email</button>
          <button type="button" className="btn" onClick={scheduleViewing}><Calendar size={18} strokeWidth={1.75} aria-hidden="true" /> Schedule viewing</button>
          <div className="split">
            <button type="button" className="btn btn-primary" onClick={() => requestStage('Signed')}>Mark as signed</button>
            <button type="button" className="btn" aria-expanded={menu} aria-label="More outcomes" onClick={() => setMenu((open) => !open)}>▾</button>
            {menu && (
              <button type="button" className="btn split-menu" onClick={() => requestStage('Lost')}>Mark as lost</button>
            )}
          </div>
        </div>
      )}
      <div className="stepper" aria-label="Stage">
        {PIPELINE_STAGES.map((stage) => (stage === enquiry.stage || !editable ? (
          <span key={stage} className={stage === enquiry.stage ? 'step on' : 'step'}>{stage}</span>
        ) : (
          <button key={stage} type="button" className="step" onClick={() => requestStage(stage)}>{stage}</button>
        )))}
      </div>
      <ol className="journey" data-testid={variant === 'page' ? 'journey' : undefined}>
        {rail.map((node) => (
          <li key={node.id} className={node.reached ? 'reached' : 'waiting'}>
            <span className="journey-label">{node.label}</span>
            {node.id === 'ad' && paidSource(enquiry.source) ? (
              <div className="ad-mock">
                <div className="ad-image">{asset?.short || 'PKNS'}</div>
                <p>{enquiry.ad || enquiry.attribution?.ad}</p>
                <span className="ad-cta">Learn more</span>
              </div>
            ) : (
              <p>{node.reached ? (node.body || (node.at ? `${dayMonth(node.at)} ${time(node.at)}` : 'Reached')) : node.pending}</p>
            )}
            {node.gap && <span className="journey-gap">{node.gap}</span>}
            {node.id === 'tenancy' && enquiry.stage === 'Signed' && (
              <div className={crest ? 'journey-end crest-flash' : 'journey-end'}>
                <Num value={firstYear} format={rm} watch={`journey-fyv:${enquiry.id}`} />
                <span>first-year rent</span>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="record-grid">
        <div>
          {editable && (
            <form className="composer" onSubmit={addEntry}>
              <div className="composer-tabs" role="tablist" aria-label="Log type">
                {LOG_TYPES.map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={entryType === item} className={entryType === item ? 'on' : ''} onClick={() => setEntryType(item)}>{item}</button>
                ))}
              </div>
              <label>
                Type
                <select value={entryType} onChange={(event) => setEntryType(event.target.value)}>
                  {LOG_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="grow">
                Entry
                <input value={entryText} onChange={(event) => setEntryText(event.target.value)} />
              </label>
              {entryType === 'Viewing' && (
                <div className="composer-when">
                  <label>Date<input type="date" value={viewDate} onChange={(event) => setViewDate(event.target.value)} /></label>
                  <label>Time<input type="time" value={viewTime} onChange={(event) => setViewTime(event.target.value)} /></label>
                </div>
              )}
              <button type="submit" className="btn btn-primary">Add to log</button>
            </form>
          )}
          <div className="timeline">
            {groups.map((group) => <h2 key={group.label} className="section-title">{group.label}</h2>)}
            <ol className="log">
              {feed.map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  <div className="log-meta">
                    <strong>{item.type || item.kind}</strong>
                    <span>{dayGroup(item.at)}</span>
                    <span>{date(item.at)} {time(item.at)}</span>
                    {item.by && <span>{data.officers[item.by]?.name || ''}</span>}
                  </div>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
            {Array.isArray(enquiry.whatsapp) && enquiry.whatsapp.length > 0 && (
              <div className="thread" aria-label="WhatsApp">
                {enquiry.whatsapp.map((message, index) => (
                  <p key={index} className={message.from === 'officer' ? 'bubble officer' : 'bubble enquirer'}>{message.text}</p>
                ))}
              </div>
            )}
          </div>
          <p data-testid="first-response">First response time: <Num value={minutes} format={duration} watch={`response:${enquiry.id}`} /></p>
        </div>
        <aside className="record-side">
          <section>
            <h2>What they asked for</h2>
            <p>{form.spaceType || enquiry.use || '–'}{form.preferredSize ? `, ${form.preferredSize}` : ''}</p>
            <p>{form.budget || enquiry.budget || '–'}</p>
            <p>Move in: {form.moveIn || '–'}</p>
            <p>Prefers {form.preferredContact || 'a call'}</p>
            {form.message && <p className="record-quote">{form.message}</p>}
          </section>
          <section>
            <h2>Unit</h2>
            <p>
              {asset ? (
                <a href={`#/asset/${asset.id}`} onClick={(event) => { event.preventDefault(); go('asset', asset.id); }}>
                  {enquiry.lot ? `Suite ${enquiry.lot}` : asset.name}
                </a>
              ) : '–'}
              {asset ? `, ${asset.short}` : ''}
            </p>
            <p>{unit?.use || enquiry.use || '–'}{unit?.size ? `, ${num(unit.size)} sq ft` : ''}</p>
            <p>{unit?.psf != null ? `${rm2(unit.psf)} psf` : ''}{enquiry.rent != null ? `, ${rm(enquiry.rent)} a month` : ''}</p>
            <p>Status: <span data-testid="unit-status"><Num value={unit?.status || '–'} watch={`unit:${enquiry.id}`} /></span></p>
            <p>{others.length === 0 ? 'No other open enquiries on this unit' : `${num(others.length)} other open enquiries on this unit`}</p>
            {others.map((item) => (
              <p key={item.id}><button type="button" className="text-btn" onClick={() => go('enquiry', item.id)}>{item.business}</button></p>
            ))}
          </section>
          <section>
            <h2>Source</h2>
            <p className="source-line"><SourceIcon source={enquiry.source} /> {enquiry.contactChannel || enquiry.source || '–'}</p>
            <p>Campaign: {campaign?.name || '–'}</p>
            <p>Ad set: {enquiry.attribution?.adSet || '–'}</p>
            <p>Ad: {enquiry.ad || enquiry.attribution?.ad || '–'}</p>
            {enquiry.attribution?.utm && <p>{enquiry.attribution.utm}</p>}
          </section>
          <section>
            <h2>Owner and next step</h2>
            {editable ? (
              <>
                <label>
                  Officer
                  <select value={enquiry.officer || ''} onChange={(event) => dispatch({ type: 'reassign', id: enquiry.id, officer: event.target.value })}>
                    {Object.values(data.officers).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Next follow-up
                  <input type="date" value={enquiry.nextFollowUp || ''} onChange={(event) => dispatch({ type: 'followUp', id: enquiry.id, date: event.target.value })} />
                </label>
              </>
            ) : (
              <p>{officer?.name || '–'}. Next follow-up {date(enquiry.nextFollowUp)}.</p>
            )}
          </section>
          <section>
            <h2>Contact</h2>
            <p>{enquiry.contactDetails?.phone || enquiry.phone || '–'}</p>
            <p>{enquiry.contactDetails?.email || enquiry.email || '–'}</p>
            <p>PDPA consent: {enquiry.consent ? `${enquiry.consent.via}, ${date(enquiry.consent.at)}` : '–'}</p>
          </section>
          <section>
            <h2>Documents</h2>
            <button type="button" className="text-btn" onClick={() => ui.notify({ title: 'Document templates connect in Phase 1' })}>Offer letter ({offerLabel})</button>
            <button type="button" className="text-btn" onClick={() => ui.notify({ title: 'Document templates connect in Phase 1' })}>Tenancy agreement ({tenancyLabel})</button>
          </section>
        </aside>
      </div>
      <SignedDialog
        open={pending === 'Signed'}
        enquiry={enquiry}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, enquiry, 'Signed', extra);
          setPending(null);
        }}
      />
      <LostDialog
        open={pending === 'Lost'}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, enquiry, 'Lost', extra);
          setPending(null);
        }}
      />
    </section>
  );
}

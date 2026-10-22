import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FileText, Mail, MessageCircle, Phone, StickyNote, X } from 'lucide-react';
import { useStore } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go } from '../router.js';
import Num from './Num.jsx';
import { SourceBadge } from './SourceIcon.jsx';
import { DescriptionList } from './DescriptionList.jsx';
import Field from './Field.jsx';
import { LostDialog, SignedDialog, commitStage } from './MoveDialogs.jsx';
import { AS_AT, PIPELINE_STAGES } from '../data/config.js';
import { contactLog, firstResponseMinutes, liveAssets, liveEnquiries, liveUnits } from '../data/selectors.js';
import { useQrEnquiries } from '../qrStore.js';
import { bookedWhen, date, dayMonth, duration, num, rm, time, weekdayDate } from '../format.js';
import { Tip } from './Term.jsx';
import { addDays, dateUTC, ymd } from '../data/rng.js';
import { displaySource, unitLabel } from '../labels.js';

const LOG_TYPES = ['Call', 'WhatsApp', 'Email', 'Viewing', 'Note'];
const STEPS = PIPELINE_STAGES.filter((stage) => stage !== 'Lost');
const OPEN = PIPELINE_STAGES.filter((stage) => stage !== 'Signed' && stage !== 'Lost');
const PLACEHOLDER = {
  Call: 'What was discussed on the call?',
  WhatsApp: 'Message sent on WhatsApp',
  Email: 'What did the email say?',
  Viewing: 'Notes for the viewing',
  Note: 'Add a note',
};
const SUBMIT = {
  Call: 'Log call',
  WhatsApp: 'Log WhatsApp',
  Email: 'Log email',
  Viewing: 'Schedule viewing',
  Note: 'Add note',
};
const SAVED = {
  Call: 'Call logged',
  WhatsApp: 'WhatsApp logged',
  Email: 'Email logged',
  Note: 'Note saved',
};

function nextWorkingDay() {
  let day = addDays(dateUTC(AS_AT), 1);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day = addDays(day, 1);
  return ymd(day);
}

function atOf(enquiry, stage) {
  return (enquiry.history || []).find((entry) => entry[0] === stage)?.[1] || null;
}

function elapsed(from, to) {
  if (!from || !to) return null;
  const minutes = Math.round((new Date(to) - new Date(from)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 1) return 'under 1 min';
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

function docStatus(stage) {
  if (stage === 'Signed') return 'Ready';
  if (stage === 'Negotiation') return 'Draft';
  return 'Not started';
}

export default function EnquiryRecord({ id, variant = 'page', onClose }) {
  const { state, dispatch, data } = useStore();
  const ui = useUi();
  const canEdit = state.role === 'leasing';
  const [pending, setPending] = useState(null);
  const [menu, setMenu] = useState(false);
  const [openThread, setOpenThread] = useState(false);
  const [viewDate, setViewDate] = useState('');
  const [viewTime, setViewTime] = useState('');
  const stored = ui.drafts[id] || { type: 'Call', text: '' };
  const [entryType, setEntryType] = useState(stored.type || 'Call');
  const [entryText, setEntryText] = useState(stored.text || '');
  const seenStage = useRef(null);
  const followRef = useRef(null);
  const entryRef = useRef(null);
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
    if (entryType !== 'Viewing') return;
    setViewDate((current) => current || nextWorkingDay());
    setViewTime((current) => current || '11:00');
  }, [entryType]);

  useEffect(() => {
    if (enquiry?.stage === 'Signed' && entryType !== 'Note') setEntryType('Note');
  }, [enquiry?.stage, entryType]);

  useEffect(() => {
    if (!enquiry) return undefined;
    const previous = seenStage.current;
    seenStage.current = enquiry.stage;
    const arrived = previous && previous !== enquiry.stage && (enquiry.stage === 'Signed' || enquiry.stage === 'Lost');
    if (arrived) {
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
  const phone = enquiry.contactDetails?.phone || enquiry.phone || '';
  const email = enquiry.contactDetails?.email || enquiry.email || '';
  const signedStart = enquiry.stage === 'Signed' ? (state.heroSigned?.start || enquiry.leaseStart || '2026-12-01') : null;
  const currentIndex = STEPS.indexOf(enquiry.stage);
  const nodes = [
    { id: 'ad', label: 'Source', at: null, reached: true, body: displaySource(enquiry.source) },
    { id: 'received', label: 'Enquiry received', at: enquiry.receivedAt, reached: Boolean(enquiry.receivedAt), pending: 'Not received' },
    { id: 'contact', label: 'First contact', at: enquiry.firstResponseAt, reached: Boolean(enquiry.firstResponseAt), pending: 'Not contacted' },
    { id: 'viewing', label: 'Viewing', at: atOf(enquiry, 'Viewing Scheduled'), reached: Boolean(atOf(enquiry, 'Viewing Scheduled')), pending: 'Viewing not scheduled' },
    { id: 'offer', label: 'Offer', at: atOf(enquiry, 'Negotiation'), reached: Boolean(atOf(enquiry, 'Negotiation')), pending: 'Offer not sent' },
    {
      id: 'tenancy',
      label: enquiry.stage === 'Lost' ? 'Lost' : 'Tenancy',
      at: enquiry.stage === 'Lost' ? atOf(enquiry, 'Lost') : atOf(enquiry, 'Signed'),
      reached: enquiry.stage === 'Signed' || enquiry.stage === 'Lost',
      pending: 'Tenancy not signed',
    },
  ];
  let previousAt = null;
  const rail = nodes.map((node) => {
    const gap = node.reached ? elapsed(previousAt, node.at) : null;
    if (node.reached && node.at) previousAt = node.at;
    return { ...node, gap };
  });

  const feed = [];
  if (enquiry.receivedAt) feed.push({ at: enquiry.receivedAt, kind: 'received', text: `Enquiry received from ${displaySource(enquiry.source)}` });
  for (const [stage, at] of enquiry.history || []) {
    if (stage === 'New') continue;
    feed.push({ at, kind: 'stage', stage, text: `Moved to ${stage}` });
  }
  for (const entry of log) feed.push({ at: entry.at, kind: entry.type || 'Note', text: entry.text, by: entry.by });
  if (Array.isArray(enquiry.whatsapp) && enquiry.whatsapp.length) {
    feed.push({ at: enquiry.whatsapp[0].at, kind: 'WhatsApp', thread: enquiry.whatsapp, text: 'WhatsApp conversation' });
  }
  feed.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  const groups = [];
  for (const item of feed) {
    const label = dayGroup(item.at);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) groups.push({ label, items: [item] });
    else last.items.push(item);
  }

  const requestStage = (stage) => {
    if (!editable || stage === enquiry.stage) return;
    if (stage === 'Signed' || stage === 'Lost') {
      setPending(stage);
      setMenu(false);
      return;
    }
    commitStage(dispatch, enquiry, stage);
    if (stage === 'Viewing Scheduled' && !enquiry.nextFollowUp) {
      const when = nextWorkingDay();
      dispatch({ type: 'followUp', id: enquiry.id, date: when });
      ui.notify({ title: `Viewing scheduled: ${enquiry.business}`, detail: `${dayMonth(when)}, 11:00`, href: `enquiry/${enquiry.id}`, action: 'Open' });
    }
  };

  const focusEntry = (type) => {
    setEntryType(type);
    requestAnimationFrame(() => entryRef.current?.focus());
  };

  const addEntry = (event) => {
    event.preventDefault();
    if (entryType === 'Viewing') {
      scheduleViewing();
      return;
    }
    const note = entryText.trim();
    if (!note) return;
    dispatch({ type: 'note', id: enquiry.id, note: { type: entryType, text: note, by: enquiry.officer } });
    if (['Call', 'WhatsApp', 'Email'].includes(entryType) && enquiry.stage === 'New') {
      commitStage(dispatch, enquiry, 'Contacted');
    }
    setEntryText('');
    ui.toastOnly({ title: SAVED[entryType] || 'Note saved' });
  };

  const scheduleViewing = () => {
    const when = viewDate || nextWorkingDay();
    const clock = viewTime || '11:00';
    const note = entryText.trim() || `Viewing booked for ${bookedWhen(when, clock)}.`;
    dispatch({ type: 'note', id: enquiry.id, note: { type: 'Viewing', text: note, by: enquiry.officer } });
    dispatch({ type: 'followUp', id: enquiry.id, date: when });
    if (STEPS.indexOf(enquiry.stage) > -1 && STEPS.indexOf(enquiry.stage) < STEPS.indexOf('Viewing Scheduled')) {
      commitStage(dispatch, enquiry, 'Viewing Scheduled');
    }
    setEntryText('');
    setEntryType('Note');
    ui.notify({ title: 'Viewing scheduled', detail: `${dayMonth(when)}, ${clock}`, href: `enquiry/${enquiry.id}`, action: 'Open' });
  };

  const primary = {
    New: { label: 'Log first contact', run: () => focusEntry('Call') },
    Contacted: { label: 'Mark as qualified', run: () => requestStage('Qualified') },
    Qualified: { label: 'Schedule viewing', run: () => focusEntry('Viewing') },
    'Viewing Scheduled': { label: 'Send offer', run: () => requestStage('Negotiation') },
    Negotiation: { label: 'Mark as signed', run: () => requestStage('Signed') },
    Lost: { label: 'Reopen', run: () => requestStage('Contacted') },
  }[enquiry.stage];

  const waDigits = phone.replace(/\D/g, '');

  return (
    <section className={`record${variant === 'drawer' ? ' record-drawer' : ''}${crest ? ' crest-flash' : ''}`}>
      {variant === 'drawer' && (
        <div className="drawer-tools">
          <button type="button" className="btn" onClick={() => { onClose?.(); go('enquiry', enquiry.id); }}>Open full page</button>
          <Tip label="Close">
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </Tip>
        </div>
      )}
      <h1 className="page-title">{enquiry.business}</h1>
      <p className="lead">
        {enquiry.contact || '–'}{enquiry.title ? `, ${enquiry.title}` : ''}
        <span className="stage-pill">{enquiry.stage}</span>
        <span data-testid="first-response">{minutes == null ? 'Not contacted' : `First contact ${duration(minutes)}`}</span>
      </p>
      {campaign && (
        <p className="crumb">
          <a href={`#/campaign/${campaign.id}`} onClick={(event) => { event.preventDefault(); go('campaign', campaign.id); }}>Back to campaign</a>
        </p>
      )}
      {enquiry.stage === 'Lost' && <p className="banner">Lost. {enquiry.lostReason || 'No reason recorded'}.</p>}
      {enquiry.stage === 'Signed' && <p className="stage-pill">Signed{signedStart ? `, starts ${date(signedStart)}` : ''}</p>}
      {editable && !pending && (
        <div className="record-actions">
          {primary && <button type="button" className="btn btn-primary" onClick={primary.run}>{primary.label}</button>}
          <button type="button" className="btn" onClick={() => setEntryType('Call')}><Phone size={16} strokeWidth={1.75} aria-hidden="true" /> Log call</button>
          <button type="button" className="btn" onClick={() => setEntryType('WhatsApp')}><MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" /> WhatsApp</button>
          <button type="button" className="btn" onClick={() => setEntryType('Email')}><Mail size={16} strokeWidth={1.75} aria-hidden="true" /> Email</button>
          <button type="button" className="btn" onClick={() => setEntryType('Note')}><StickyNote size={16} strokeWidth={1.75} aria-hidden="true" /> Note</button>
          <div className="move-menu">
            <button type="button" className="icon-btn" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
            {menu && (
              <ul className="move-list" role="menu">
                <li><button type="button" role="menuitem" onClick={() => requestStage('Lost')}>Mark as lost</button></li>
              </ul>
            )}
          </div>
        </div>
      )}
      <ol className="stepper" aria-label="Stage">
        {STEPS.map((stage, index) => {
          const signedDone = enquiry.stage === 'Signed';
          const stateName = signedDone || currentIndex > index ? 'done' : (enquiry.stage === stage ? 'current' : 'future');
          const mark = stateName === 'done' ? <Check size={14} strokeWidth={1.75} aria-hidden="true" /> : null;
          return (
            <li key={stage} className={`step ${stateName}`}>
              {editable ? (
                <button type="button" className="step-btn" aria-label={stage} onClick={() => requestStage(stage)}>{mark}</button>
              ) : <span className="step-btn" aria-hidden="true">{mark}</span>}
              <span className="step-name">{stage}</span>
            </li>
          );
        })}
      </ol>
      <ol className="journey" data-testid={variant === 'page' ? 'journey' : undefined}>
        {rail.map((node) => (
          <li key={node.id} className={node.reached ? 'reached' : 'waiting'}>
            <span className="journey-label">{node.label}</span>
            {node.id === 'ad' ? (
              <>
                <p className="journey-value">{node.body}</p>
                {enquiry.ad && <div className="ad-mock"><p>{enquiry.ad}</p></div>}
              </>
            ) : node.id === 'viewing' && node.reached && enquiry.nextFollowUp ? (
              <p className="journey-value">Viewing {dayMonth(enquiry.nextFollowUp)}, 11:00</p>
            ) : node.id === 'tenancy' && enquiry.stage === 'Lost' ? (
              <div className="journey-end">
                Lost
                <span className="journey-caption">{enquiry.lostReason || 'No reason recorded'}</span>
              </div>
            ) : node.id === 'tenancy' && enquiry.stage === 'Signed' ? (
              <div className="journey-end">
                <Num value={firstYear} format={rm} watch={`journey-fyv:${enquiry.id}`} />
                <span className="journey-caption">first-year rent</span>
                <span className="journey-caption">Signed {dayMonth(node.at || AS_AT)}</span>
                <span className="journey-caption">Starts {date(signedStart || '2026-12-01')}</span>
              </div>
            ) : (
              <p className="journey-value">{node.reached ? (node.at ? time(node.at) : node.body) : node.pending}</p>
            )}
            {node.id === 'contact' && node.reached && minutes != null && <span className="journey-gap">First contact {duration(minutes)}</span>}
          </li>
        ))}
      </ol>
      <div className="record-grid">
        <div>
          {editable && (
            <form className="composer" onSubmit={addEntry}>
              <div className="composer-tabs" role="tablist" aria-label="Composer">
                {LOG_TYPES.map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={entryType === item} className={entryType === item ? 'on' : ''} onClick={() => setEntryType(item)}>{item}</button>
                ))}
              </div>
              <label className="grow">
                <span className="sr-only">Entry</span>
                <textarea ref={entryRef} rows={3} aria-label="Entry" placeholder={PLACEHOLDER[entryType]} value={entryText} onChange={(event) => setEntryText(event.target.value)} />
              </label>
              {entryType === 'Viewing' && (
                <div className="composer-when">
                  <Field label="Date" hint={viewDate ? weekdayDate(viewDate) : ''}>
                    <input type="date" value={viewDate} onChange={(event) => setViewDate(event.target.value)} />
                  </Field>
                  <Field label="Time">
                    <input type="time" value={viewTime} onChange={(event) => setViewTime(event.target.value)} />
                  </Field>
                </div>
              )}
              <button type="submit" className={enquiry.stage === 'Signed' || entryType === 'Note' ? 'btn' : 'btn btn-primary'}>{SUBMIT[entryType]}</button>
            </form>
          )}
          <div className="timeline">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="overline">{group.label}</h2>
                <ol className="log">
                  {group.items.map((item, index) => (
                    <li key={`${item.at}-${index}`} className={item.kind === 'stage' ? 'log-compact' : ''}>
                      {item.kind === 'stage' ? (
                        <div className="stage-row">
                          <span className="stage-dot" aria-hidden="true" />
                          <span>{item.text}</span>
                          <span className="stage-time">{time(item.at)}</span>
                        </div>
                      ) : (
                      <>
                      <div className="log-meta">
                        <strong>{item.kind === 'received' ? 'Enquiry received' : item.kind}</strong>
                        <span>{time(item.at)}</span>
                      </div>
                      {item.thread ? (
                        <div>
                          <button type="button" className="btn" onClick={() => setOpenThread((open) => !open)}>{openThread ? 'Hide WhatsApp' : 'Show WhatsApp'}</button>
                          {openThread && item.thread.map((message, messageIndex) => (
                            <p key={messageIndex} className={message.from === 'officer' ? 'bubble officer' : 'bubble enquirer'}>{message.text}</p>
                          ))}
                        </div>
                      ) : <p>{item.text}</p>}
                      </>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
        <aside className="record-side">
          <DescriptionList
            title="What they asked for"
            rows={[
              { label: 'Use', value: form.spaceType || enquiry.use || '–' },
              { label: 'Size', value: form.preferredSize || '–' },
              { label: 'Budget', value: form.budget || enquiry.budget || '–' },
              { label: 'Move in', value: form.moveIn || '–' },
              { label: 'Contact by', value: form.preferredContact || '–' },
              { label: 'Message', value: form.message ? <q>{form.message}</q> : '–' },
            ]}
          />
          <DescriptionList
            title="Unit"
            rows={[
              { label: 'Unit', value: asset ? <a href={`#/asset/${asset.id}`} onClick={(event) => { event.preventDefault(); go('asset', asset.id); }}>{unitLabel(unit)}</a> : '–' },
              { label: 'Asset', value: asset?.short || '–' },
              { label: 'Use', value: unit?.use || enquiry.use || '–' },
              { label: 'Size', value: unit?.size ? `${num(unit.size)} sq ft` : '–' },
              { label: 'Rent', value: enquiry.rent != null ? `${rm(enquiry.rent)}/mo` : '–' },
              { label: 'Status', value: <span data-testid="unit-status"><Num value={unit?.status || '–'} watch={`unit:${enquiry.id}`} /></span> },
              { label: 'Other open', value: others.length === 0 ? 'None on this unit' : `${num(others.length)} on this unit` },
            ]}
          />
          <DescriptionList
            title="Source"
            rows={[
              { label: 'Source', value: <SourceBadge source={enquiry.source} /> },
              { label: 'Campaign', value: campaign?.name || '–' },
              { label: 'Ad set', value: enquiry.attribution?.adSet || '–' },
              { label: 'Ad', value: enquiry.ad || enquiry.attribution?.ad || '–' },
            ]}
          />
          <section className="desc-group">
            <h2 className="overline">Owner and next step</h2>
            {editable ? (
              <>
                <Field label="Officer">
                  <select value={enquiry.officer || ''} onChange={(event) => dispatch({ type: 'reassign', id: enquiry.id, officer: event.target.value })}>
                    {Object.values(data.officers).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Field>
                <Field label="Next follow-up" hint={enquiry.nextFollowUp ? weekdayDate(enquiry.nextFollowUp) : ''}>
                  <input
                    ref={followRef}
                    type="date"
                    value={enquiry.nextFollowUp || ''}
                    onChange={(event) => {
                      const next = event.target.value;
                      dispatch({ type: 'followUp', id: enquiry.id, date: next });
                      if (next) ui.notify({ title: `Follow-up set: ${enquiry.business}, ${date(next)}`, href: `enquiry/${enquiry.id}`, action: 'Open' });
                    }}
                  />
                </Field>
              </>
            ) : <p>{officer?.name || '–'}. Next follow-up {date(enquiry.nextFollowUp)}.</p>}
          </section>
          <DescriptionList
            title="Contact"
            rows={[
              { label: 'Phone', value: phone ? <span className="contact-line"><a href={`tel:${phone}`}>{phone}</a> {waDigits && <a className="btn" href={`https://wa.me/6${waDigits.replace(/^0/, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}</span> : '–' },
              { label: 'Email', value: email ? <a href={`mailto:${email}`}>{email}</a> : '–' },
              { label: 'Consent', value: enquiry.consent ? `${enquiry.consent.via}, ${date(enquiry.consent.at)}` : '–' },
            ]}
          />
          <section className="desc-group">
            <h2 className="overline">Documents</h2>
            {['Offer letter', 'Tenancy agreement'].map((name) => {
              const status = docStatus(enquiry.stage);
              return (
                <button key={name} type="button" className="file-row" onClick={() => ui.toastOnly({ title: 'Document templates connect in Phase 1.' })}>
                  <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>{name}</span>
                  <span className={status === 'Not started' ? 'pill muted-pill' : 'pill'}>{status}</span>
                </button>
              );
            })}
          </section>
        </aside>
      </div>
      <SignedDialog
        open={pending === 'Signed'}
        enquiry={enquiry}
        assetName={asset?.name}
        unit={unit}
        onClose={() => setPending(null)}
        onConfirm={(extra) => { commitStage(dispatch, enquiry, 'Signed', extra); setPending(null); }}
      />
      <LostDialog
        open={pending === 'Lost'}
        enquiry={enquiry}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, enquiry, 'Lost', extra);
          ui.notify({
            title: `Marked as lost: ${enquiry.business}`,
            detail: extra.lostReason,
            href: `enquiry/${enquiry.id}`,
            action: 'Open',
          });
          setPending(null);
        }}
      />
    </section>
  );
}

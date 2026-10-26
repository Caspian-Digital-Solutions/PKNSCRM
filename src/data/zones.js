// Audience-zone facts for the enquiry board. Seeded state uses makeRng(20261101)
// and never touches the streams that produce the agreed figures.

import { AS_AT, AS_AT_END, DEMO_START, ZONE_RULES, ZONES } from './config.js';
import { zoneOf } from './metrics.js';
import { makeRng } from './rng.js';
import { addCalendarDays, addWorkingDays, dueAfterWorkingMinutes, elapsed, workingMinutesBetween } from '../time.js';

const REQ_BY_ID = Object.fromEntries(ZONE_RULES.requirements.map((item) => [item.id, item]));
const DOC_KEYS = ['ssm', 'ic', 'profile'];
const STAGE_RANK = { New: 0, Contacted: 1, Qualified: 2, 'Viewing Scheduled': 3, Negotiation: 4, Signed: 5, Lost: 6 };
const ZONE_RANK = { suspect: 1, prospect: 2, customer: 3, withdrawn: 0 };
const DONE_IDS = {
  New: [],
  Contacted: ['S1'],
  Qualified: ['S1', 'S2', 'S3'],
  'Viewing Scheduled': ['S1', 'S2', 'S3', 'P1'],
  Negotiation: ['S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4'],
  Signed: ['S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4', 'P5'],
};
const DEFAULT_TRIGGERS = { T1: true, T2: true, T3: true, T4: true, T5: true, T6: true, T7: true };

export function defaultTriggers() {
  return { ...DEFAULT_TRIGGERS };
}

function plusMs(iso, ms) {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}
function plusHours(iso, hours) {
  return plusMs(iso, hours * 3600000);
}
function plusDays(iso, days) {
  return plusMs(iso, days * 86400000);
}
function at(enquiry, stage) {
  return (enquiry.history || []).find((entry) => entry[0] === stage)?.[1] || null;
}
function median(values) {
  const list = values.filter((value) => value != null && Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}
export function oneDecimal(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return (Math.round(value * 10) / 10).toFixed(1);
}
function dayKey(iso) {
  return String(iso || '').slice(0, 10);
}
function inOctober(iso) {
  return String(iso || '').startsWith('2026-10');
}

function inSpan(iso, from, to) {
  const day = String(iso || '').slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function movementMatch(enquiry, kind, from = '2026-10-01', to = '2026-10-31') {
  if (kind === 'received') return inSpan(enquiry.receivedAt, from, to);
  if (kind === 'prospect') {
    if (!reachedProspect(enquiry)) return false;
    const when = at(enquiry, 'Qualified')
      || (enquiry.history || []).find((entry) => ['Viewing Scheduled', 'Negotiation', 'Signed'].includes(entry[0]))?.[1]
      || enquiry.receivedAt;
    return inSpan(when, from, to);
  }
  if (kind === 'customer') return enquiry.stage === 'Signed' && inSpan(at(enquiry, 'Signed') || enquiry.receivedAt, from, to);
  if (kind === 'withdrawn') return enquiry.stage === 'Lost' && inSpan(at(enquiry, 'Lost') || enquiry.receivedAt, from, to);
  return false;
}

function positionStage(enquiry) {
  if (enquiry.stage !== 'Lost') return enquiry.stage;
  const prior = (enquiry.history || []).map((entry) => entry[0]).filter((stage) => stage !== 'Lost');
  return prior[prior.length - 1] || 'New';
}

function stageEnteredAt(enquiry) {
  if (enquiry.stage && enquiry.stage !== 'Lost') return at(enquiry, enquiry.stage) || enquiry.receivedAt;
  const prior = (enquiry.history || []).map((entry) => entry[0]).filter((stage) => stage !== 'Lost');
  return at(enquiry, prior[prior.length - 1]) || enquiry.receivedAt;
}

function blankReq(id, enquiry) {
  const rule = REQ_BY_ID[id];
  const received = enquiry.receivedAt || `${AS_AT}T00:00:00+08:00`;
  const entered = stageEnteredAt(enquiry) || received;
  const prospectAt = at(enquiry, 'Qualified') || entered;
  const signedAt = at(enquiry, 'Signed') || entered;
  const viewingAt = enquiry.viewingAt || at(enquiry, 'Viewing Scheduled') || null;
  const start = (enquiry.leaseStart || '2026-12-01').slice(0, 10);
  const dueAt = {
    S1: dueAfterWorkingMinutes(received, 60),
    S2: addCalendarDays(entered, 2),
    S3: addCalendarDays(entered, 3),
    P1: addCalendarDays(prospectAt, 3),
    P2: viewingAt ? addWorkingDays(viewingAt, 1) : addCalendarDays(prospectAt, 4),
    P3: addCalendarDays(prospectAt, 7),
    P4: addCalendarDays(prospectAt, 10),
    P5: addCalendarDays(prospectAt, 14),
    C1: addCalendarDays(signedAt, 7),
    C2: addCalendarDays(signedAt, 14),
    C3: addCalendarDays(`${start}T00:00:00+08:00`, -7),
    C4: addCalendarDays(`${start}T00:00:00+08:00`, -1),
  }[id];
  return {
    id,
    zone: rule.zone,
    title: rule.title,
    done: false,
    dueAt,
    doneAt: null,
    outcome: null,
    documents: id === 'P3' ? { ssm: false, ic: false, profile: false } : null,
  };
}

function doneStamp(enquiry, id) {
  if (id === 'S1') return enquiry.firstResponseAt || at(enquiry, 'Contacted') || enquiry.receivedAt;
  if (id === 'S2' || id === 'S3') return at(enquiry, 'Qualified') || at(enquiry, 'Contacted');
  if (id === 'P1') return at(enquiry, 'Viewing Scheduled');
  if (id === 'P2') return at(enquiry, 'Negotiation') || at(enquiry, 'Viewing Scheduled');
  if (id === 'P3' || id === 'P4') return at(enquiry, 'Negotiation') || at(enquiry, 'Signed');
  if (id === 'P5') return at(enquiry, 'Signed') || at(enquiry, 'Negotiation');
  return at(enquiry, 'Signed');
}

export function attachZoneData(enquiries) {
  const rng = makeRng(20261101);
  for (const enquiry of enquiries) {
    enquiry.visits = rng.int(1, 6);
    enquiry.ssmSample = String(rng.int(10000000, 99999999));
    const stage = positionStage(enquiry);
    const done = new Set(DONE_IDS[stage] || []);
    let outcome = null;
    const documents = { ssm: false, ic: false, profile: false };
    if (enquiry.stage === 'Negotiation' || enquiry.stage === 'Signed' || done.has('P2')) outcome = 'Attended';
    if (enquiry.stage === 'Viewing Scheduled') {
      const viewingAt = at(enquiry, 'Viewing Scheduled');
      const past = viewingAt && new Date(viewingAt) < new Date(AS_AT_END);
      if (past && rng.next() < 0.1) {
        done.add('P2');
        outcome = 'No-show';
      }
      const ticks = DOC_KEYS.map(() => rng.next() < 0.55);
      if (ticks.every(Boolean)) ticks[2] = false;
      DOC_KEYS.forEach((key, index) => { documents[key] = ticks[index]; });
    }
    if (done.has('P3')) DOC_KEYS.forEach((key) => { documents[key] = true; });
    const ids = enquiry.stage === 'Lost'
      ? (ZONE_RANK[zoneOf(stage)] >= 2 ? ['S1', 'S2', 'S3', 'P1', 'P2', 'P3', 'P4', 'P5'] : ['S1', 'S2', 'S3'])
      : ZONE_RULES.requirements.filter((item) => ZONE_RANK[item.zone] <= ZONE_RANK[zoneOf(enquiry.stage)]).map((item) => item.id);
    enquiry.zoneReqs = ids.map((id) => {
      const req = blankReq(id, enquiry);
      req.done = done.has(id);
      req.doneAt = req.done ? doneStamp(enquiry, id) : null;
      if (id === 'P2') req.outcome = req.done ? outcome : null;
      if (id === 'P3') req.documents = { ...documents };
      return req;
    });
    if (enquiry.stage === 'Lost') {
      const prior = (enquiry.history || []).map((entry) => entry[0]).filter((item) => item !== 'Lost');
      enquiry.leftZone = zoneOf(prior[prior.length - 1] || 'New');
      const lostAt = at(enquiry, 'Lost');
      enquiry.reengageAt = enquiry.lostReason === 'Timing' && lostAt ? dayKey(plusDays(lostAt, 60)) : null;
    } else {
      enquiry.leftZone = null;
      enquiry.reengageAt = null;
    }
    if (enquiry.stage === 'Signed') {
      const clockDay = DEMO_START.slice(0, 10);
      const started = enquiry.leaseStart && enquiry.leaseStart <= clockDay;
      enquiry.handover = started ? 'handed' : 'ready';
      enquiry.handedAt = started ? `${enquiry.leaseStart}T09:00:00+08:00` : null;
      if (started) {
        for (const req of enquiry.zoneReqs) {
          if (String(req.id).startsWith('C')) {
            req.done = true;
            req.doneAt = req.doneAt || enquiry.handedAt;
          }
        }
      }
    } else {
      enquiry.handover = null;
      enquiry.handedAt = null;
    }
  }
  capOverdue(enquiries, DEMO_START);
}

const OPEN_ALLOWANCE_DAYS = { S2: 2, S3: 3, P1: 3, P2: 1, P3: 7, P4: 10, P5: 14, C1: 7, C2: 14, C3: 7, C4: 1 };

function naturallyOverdue(enquiry, req, now) {
  if (!req || req.done || !req.dueAt) return false;
  if (req.id === 'S1') return enquiry.stage === 'New' && workingMinutesBetween(enquiry.receivedAt, now) > 60 && new Date(req.dueAt) < new Date(now);
  return new Date(req.dueAt) < new Date(now);
}

// Due dates come from the history timestamp of the current stage. Records that have already passed
// that date are the overdue set. The set is capped at 15% of open records. First-contact overdue stays.
function capOverdue(enquiries, now) {
  const rows = enquiries.filter((enquiry) => enquiry.stage !== 'Lost' && enquiry.handover !== 'handed');
  const late = [];
  for (const enquiry of rows) {
    const overdue = (enquiry.zoneReqs || []).filter((req) => naturallyOverdue(enquiry, req, now));
    if (!overdue.length) continue;
    const oldest = overdue.map((req) => req.dueAt).sort()[0];
    late.push({ enquiry, overdue, oldest, firstContact: overdue.some((req) => req.id === 'S1') });
  }
  const open = enquiries.filter((enquiry) => !['Signed', 'Lost'].includes(enquiry.stage)).length;
  const limit = Math.min(25, Math.floor(open * 0.15));
  late.sort((a, b) => Number(b.firstContact) - Number(a.firstContact) || a.oldest.localeCompare(b.oldest));
  late.slice(limit).forEach(({ overdue }) => {
    for (const req of overdue) {
      if (req.id === 'S1') continue;
      req.dueAt = addCalendarDays(now, OPEN_ALLOWANCE_DAYS[req.id] || 3);
    }
  });
}

function cloneReqs(enquiry) {
  return (enquiry.zoneReqs || []).map((req) => ({
    ...req,
    documents: req.documents ? { ...req.documents } : null,
  }));
}

function ensureReq(list, enquiry, id) {
  if (list.some((req) => req.id === id)) return;
  list.push(blankReq(id, enquiry));
}

function markDone(req, when) {
  if (!req || req.done) return;
  req.done = true;
  req.doneAt = when || req.doneAt || AS_AT_END;
}

function noteText(enquiry, state) {
  const notes = state?.notes?.[enquiry.id] || [];
  return notes.map((note) => `${note.type || ''} ${note.text || ''}`).join('\n');
}

function contactNotes(enquiry, state) {
  return (state?.notes?.[enquiry.id] || []).filter((note) => ['Call', 'WhatsApp', 'Email'].includes(note.type));
}

export function presentRequirements(enquiry, state = {}, clock = AS_AT_END) {
  if (enquiry.hero) return heroRequirements(enquiry, state, clock);
  const list = cloneReqs(enquiry);
  const rank = enquiry.stage === 'Lost' ? 0 : (STAGE_RANK[enquiry.stage] ?? 0);
  if (rank >= STAGE_RANK.Qualified) ['P1', 'P2', 'P3', 'P4', 'P5'].forEach((id) => ensureReq(list, enquiry, id));
  if (rank >= STAGE_RANK.Signed) ['C1', 'C2', 'C3', 'C4'].forEach((id) => ensureReq(list, enquiry, id));
  const ticks = state.requirementDone?.[enquiry.id] || {};
  const docs = state.documents?.[enquiry.id];
  for (const req of list) {
    if (ticks[req.id]) markDone(req, clock);
    if (req.id === 'P3' && docs) {
      req.documents = { ...req.documents, ...docs };
      if (DOC_KEYS.every((key) => req.documents[key])) markDone(req, clock);
    }
  }
  const text = noteText(enquiry, state);
  if (/rate card/i.test(text)) {
    const unitLinked = Boolean(enquiry.unitId || enquiry.lot);
    const s3 = list.find((req) => req.id === 'S3');
    if (unitLinked && s3) markDone(s3, clock);
  }
  return list.map((req) => decorate(req, clock, enquiry, state.triggers));
}

function heroRequirements(enquiry, state, clock) {
  const list = ['S1', 'S2', 'S3'].map((id) => blankReq(id, enquiry));
  const notes = state.notes?.[enquiry.id] || [];
  const contacted = contactNotes(enquiry, state);
  if (contacted.length) markDone(list.find((req) => req.id === 'S1'), contacted[0].at || clock);
  const form = enquiry.leadForm || {};
  if (form.spaceType && form.preferredSize && form.budget && form.moveIn) {
    markDone(list.find((req) => req.id === 'S2'), enquiry.receivedAt);
  }
  const text = notes.map((note) => note.text || '').join('\n');
  if ((enquiry.unitId || enquiry.lot) && /rate card/i.test(text)) {
    markDone(list.find((req) => req.id === 'S3'), contacted[0]?.at || clock);
  }
  const rank = STAGE_RANK[enquiry.stage] ?? 0;
  if (rank >= STAGE_RANK.Qualified) {
    ['P1', 'P2', 'P3', 'P4', 'P5'].forEach((id) => list.push(blankReq(id, enquiry)));
  }
  if (rank >= STAGE_RANK['Viewing Scheduled'] || notes.some((note) => note.type === 'Viewing')) {
    markDone(list.find((req) => req.id === 'P1'), at(enquiry, 'Viewing Scheduled') || clock);
  }
  if (rank >= STAGE_RANK.Negotiation) {
    for (const id of ['P3', 'P4']) {
      const req = list.find((item) => item.id === id);
      if (req?.id === 'P3' && req.documents) DOC_KEYS.forEach((key) => { req.documents[key] = true; });
      markDone(req, at(enquiry, 'Negotiation') || clock);
    }
  }
  const outcome = notes.map((note) => note.text || '').join('\n').match(/Attended|No-show|Rescheduled/);
  if (outcome) {
    const p2 = list.find((req) => req.id === 'P2');
    if (p2) {
      p2.outcome = outcome[0];
      markDone(p2, clock);
    }
  }
  if (rank >= STAGE_RANK.Signed) {
    const p5 = list.find((item) => item.id === 'P5');
    markDone(p5, at(enquiry, 'Signed') || clock);
    ['C1', 'C2', 'C3', 'C4'].forEach((id) => list.push(blankReq(id, { ...enquiry, history: [...(enquiry.history || []), ['Signed', clock]] })));
  }
  const ticks = state.requirementDone?.[enquiry.id] || {};
  const docs = state.documents?.[enquiry.id];
  for (const req of list) {
    if (ticks[req.id]) markDone(req, clock);
    if (req.id === 'P3' && docs) {
      req.documents = { ...req.documents, ...docs };
      if (DOC_KEYS.every((key) => req.documents[key])) markDone(req, clock);
    }
  }
  return list.filter(Boolean).map((req) => decorate(req, clock, enquiry, state.triggers));
}

function decorate(req, now, enquiry, triggers = DEFAULT_TRIGGERS) {
  let status = 'due';
  if (req.done) status = 'done';
  else if (req.id === 'S1') {
    const late = triggers?.T2 !== false && enquiry?.stage === 'New' && workingMinutesBetween(enquiry.receivedAt, now) > 60 && req.dueAt && new Date(req.dueAt) < new Date(now);
    if (late) status = 'overdue';
  } else if (req.dueAt && new Date(req.dueAt) < new Date(now)) status = 'overdue';
  const overdueLabel = status === 'overdue' ? elapsed(req.dueAt, now) : null;
  return { ...req, status, overdueLabel };
}

function klParts(iso) {
  const date = new Date(String(iso).length === 10 ? `${iso}T00:00:00+08:00` : iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { day: String(Number(get('day'))), month: get('month'), time: `${hour}:${get('minute')}` };
}

export function nextRequirement(reqs) {
  return (reqs || []).find((req) => req.status !== 'done') || null;
}

export function requirementLine(req, now = AS_AT_END) {
  if (!req) return 'All requirements done';
  if (req.id === 'S1' && req.status === 'overdue') return `First contact overdue ${req.overdueLabel || elapsed(req.dueAt, now)}`;
  if (req.status === 'overdue') return `${req.id} · Overdue ${req.overdueLabel || elapsed(req.dueAt, now)}`;
  const due = klParts(req.dueAt);
  const today = klParts(now);
  if (due.day === today.day && due.month === today.month) return `${req.id} · Due ${due.time}`;
  return `${req.id} · due ${due.day} ${due.month}`;
}

export function firstContactOverdue(reqs, triggers = DEFAULT_TRIGGERS) {
  if (triggers.T2 === false) return false;
  return (reqs || []).some((req) => req.id === 'S1' && req.status === 'overdue');
}

function viewingWasBooked(enquiry) {
  if (enquiry.viewingAt) return true;
  return (enquiry.history || []).some((entry) => entry[0] === 'Viewing Scheduled');
}

export function cardAlert(enquiry, reqs, triggers = DEFAULT_TRIGGERS) {
  if (firstContactOverdue(reqs, triggers)) {
    const s1 = reqs.find((req) => req.id === 'S1');
    return `First contact overdue ${s1?.overdueLabel || ''}`.trim();
  }
  const p2 = (reqs || []).find((req) => req.id === 'P2');
  if (triggers.T4 !== false && viewingWasBooked(enquiry) && p2 && p2.status === 'overdue') return 'Viewing outcome overdue';
  return null;
}

function budgetAmount(text) {
  const match = String(text || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function moveInIndex(text) {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const raw = String(text || '').toLowerCase();
  const month = months.findIndex((name) => raw.includes(name));
  const year = raw.match(/20\d{2}/);
  if (month < 0 || !year) return null;
  return Number(year[0]) * 12 + month;
}

export function qualifiersFor(enquiry, reqs) {
  const zone = zoneOf(enquiry.stage);
  const from = zone === 'customer' || zone === 'withdrawn' ? 'prospect' : zone === 'prospect' ? 'prospect' : 'suspect';
  const form = enquiry.leadForm || {};
  const useKnown = Boolean(form.spaceType || enquiry.use);
  const sizeKnown = Boolean(form.preferredSize || enquiry.size);
  const budget = budgetAmount(form.budget || enquiry.budget);
  const rent = Number(enquiry.rent);
  const move = moveInIndex(form.moveIn);
  const limit = (2026 * 12 + 9) + 6;
  const byId = Object.fromEntries((reqs || []).map((req) => [req.id, req]));
  const value = {
    need: useKnown && sizeKnown ? 'met' : (useKnown || sizeKnown ? 'not' : 'unknown'),
    budget: budget == null || !rent ? 'unknown' : (budget >= rent * 0.8 ? 'met' : 'not'),
    movein: move == null ? 'unknown' : (move <= limit ? 'met' : 'not'),
    reachable: byId.S1?.done || enquiry.firstResponseAt ? 'met' : 'not',
    attended: byId.P2?.outcome === 'Attended' ? 'met' : (byId.P2?.outcome ? 'not' : 'unknown'),
    documents: byId.P3?.done ? 'met' : 'not',
    terms: byId.P4?.done ? 'met' : 'not',
  };
  return ZONE_RULES.qualifiers.filter((item) => item.from === from).map((item) => ({
    ...item,
    state: value[item.id] || 'unknown',
  }));
}

export function signalsFor(enquiry, log = []) {
  const form = enquiry.leadForm || {};
  const answered = Boolean(form.spaceType && form.preferredSize && form.budget && form.moveIn);
  const replies = (log || []).filter((entry) => ['Call', 'WhatsApp', 'Email'].includes(entry.type)).length;
  const last = [enquiry.firstResponseAt, ...(log || []).map((entry) => entry.at)].filter(Boolean).sort().at(-1);
  let since = 'No contact yet';
  if (last) {
    const days = Math.floor((new Date(AS_AT_END) - new Date(last)) / 86400000);
    since = days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  }
  return {
    source: enquiry.source || 'Unknown source',
    ad: enquiry.ad || enquiry.attribution?.ad || '',
    answered,
    visits: enquiry.visits || enquiry.heroVisits || 3,
    replies,
    since,
  };
}

export function handoverOf(enquiry, state = {}) {
  const live = state.handover?.[enquiry.id];
  if (live?.status === 'handed' || live === 'handed') return 'handed';
  if (enquiry.handover === 'handed') return 'handed';
  if (zoneOf(enquiry.stage) !== 'customer') return null;
  return 'ready';
}

export function zoneTasks(enquiry, reqs, triggers = DEFAULT_TRIGGERS) {
  const tasks = [];
  const s1 = (reqs || []).find((req) => req.id === 'S1');
  if (triggers.T3 !== false && zoneOf(enquiry.stage) === 'suspect' && s1?.done && enquiry.firstResponseAt) {
    const days = (new Date(AS_AT_END) - new Date(enquiry.firstResponseAt)) / 86400000;
    const replies = (enquiry.log || []).filter((entry) => entry.type === 'WhatsApp' || entry.type === 'Email').length;
    if (days >= 7 && replies === 0) tasks.push({ id: 'T3', label: 'Follow up', due: 'due today' });
  }
  if (triggers.T5 !== false && (STAGE_RANK[enquiry.stage] ?? 0) >= STAGE_RANK.Negotiation && enquiry.stage !== 'Signed' && enquiry.stage !== 'Lost') {
    const sent = at(enquiry, 'Negotiation');
    if (sent && (new Date(AS_AT_END) - new Date(sent)) / 86400000 >= 5) tasks.push({ id: 'T5', label: 'Chase offer', due: 'due today' });
  }
  return tasks;
}

export function openZoneRequirements(enquiry, state, clock) {
  const zone = zoneOf(enquiry.stage);
  return presentRequirements(enquiry, state, clock).filter((req) => req.zone === zone && req.status !== 'done');
}

export function zoneMovePlan(enquiry, stage, state, clock) {
  const from = zoneOf(enquiry.stage);
  const to = zoneOf(stage);
  const open = openZoneRequirements(enquiry, state, clock);
  const forward = (ZONE_RANK[to] || 0) > (ZONE_RANK[from] || 0);
  return {
    from,
    to,
    open,
    needsAlert: Boolean(forward && open.length && stage !== 'Lost' && stage !== 'Signed'),
  };
}

export function zoneLabel(id) {
  if (id === 'withdrawn') return 'Withdrawn';
  return ZONES.find((zone) => zone.id === id)?.label || 'Withdrawn';
}

function pack(list) {
  return {
    count: list.length,
    rent: list.reduce((sum, enquiry) => sum + (Number(enquiry.rent) || 0), 0),
    list,
  };
}

export function zoneSnapshot(enquiries, state = {}) {
  const groups = { suspect: [], prospect: [], customer: [], withdrawn: [] };
  for (const enquiry of enquiries) {
    const zone = zoneOf(enquiry.stage);
    (groups[zone] || groups.withdrawn).push(enquiry);
  }
  const from = { suspect: 0, prospect: 0, customer: 0 };
  for (const enquiry of groups.withdrawn) {
    const left = enquiry.leftZone || 'suspect';
    from[left] = (from[left] || 0) + 1;
  }
  const handed = groups.customer.filter((enquiry) => handoverOf(enquiry, state) === 'handed').length;
  return {
    suspect: pack(groups.suspect),
    prospect: pack(groups.prospect),
    customer: pack(groups.customer),
    withdrawn: { ...pack(groups.withdrawn), from },
    handed,
    ready: groups.customer.length - handed,
  };
}

function reachedProspect(enquiry) {
  const stages = new Set([enquiry.stage, ...(enquiry.history || []).map((entry) => entry[0])]);
  return ['Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed'].some((stage) => stages.has(stage));
}

export function octoberMovements(enquiries) {
  const received = enquiries.filter((enquiry) => movementMatch(enquiry, 'received'));
  const entered = enquiries.filter((enquiry) => movementMatch(enquiry, 'prospect'));
  const customers = enquiries.filter((enquiry) => movementMatch(enquiry, 'customer'));
  const withdrawn = enquiries.filter((enquiry) => movementMatch(enquiry, 'withdrawn'));
  const toProspect = entered.map((enquiry) => {
    const when = at(enquiry, 'Qualified');
    if (!when || !enquiry.receivedAt) return null;
    return (new Date(when) - new Date(enquiry.receivedAt)) / 86400000;
  });
  const toCustomer = customers.map((enquiry) => {
    const from = at(enquiry, 'Qualified');
    const to = at(enquiry, 'Signed');
    if (!from || !to) return null;
    return (new Date(to) - new Date(from)) / 86400000;
  });
  return {
    received: received.length,
    enteredProspect: entered.length,
    becameCustomer: customers.length,
    withdrawn: withdrawn.length,
    medianToProspect: oneDecimal(median(toProspect)),
    medianToCustomer: oneDecimal(median(toCustomer)),
  };
}

export function medianDaysInZone(enquiries) {
  const now = new Date(AS_AT_END);
  const days = { suspect: [], prospect: [], customer: [] };
  for (const enquiry of enquiries) {
    const zone = zoneOf(enquiry.stage);
    if (!days[zone]) continue;
    const start = zone === 'suspect' ? enquiry.receivedAt : zone === 'prospect' ? at(enquiry, 'Qualified') : at(enquiry, 'Signed');
    if (!start) continue;
    days[zone].push((now - new Date(start)) / 86400000);
  }
  return {
    suspect: oneDecimal(median(days.suspect)),
    prospect: oneDecimal(median(days.prospect)),
    customer: oneDecimal(median(days.customer)),
  };
}

export function countOpen(enquiries, state, predicate) {
  return enquiries.filter((enquiry) => predicate(presentRequirements(enquiry, state))).length;
}

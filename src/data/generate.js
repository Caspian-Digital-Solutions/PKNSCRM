import { makeRng, allocate, scatter, ymd, addDays, dateUTC, daysBetween } from './rng.js';
import {
  AS_AT, PERIOD, MONTHS, ASSETS, CAMPAIGNS, CHANNELS, SIGNED, OFFICERS, SOCIAL_PAGES, WEBSITE_OCT,
  STAGE_COUNTS, SOURCE_MIX, LOST_REASONS, HERO, AD_CREATIVES,
} from './config.js';
import { BUSINESSES } from './businesses.js';

const r2 = (x) => Math.round(x * 100) / 100;
const monthOf = (d) => d.slice(0, 7);
const monthEnd = (m) => ymd(addDays(dateUTC(m + '-01'), 40)).slice(0, 7) + '-01';
const lastDayOf = (m) => ymd(addDays(dateUTC(monthEnd(m)), -1));

function dateRange(start, end) {
  const out = [];
  for (let d = dateUTC(start); d <= dateUTC(end); d = addDays(d, 1)) out.push(ymd(d));
  return out;
}

function gaussian(rng) {
  const u = Math.max(rng.next(), 1e-9);
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const TRADES = [['F&B', 24], ['Fashion', 21], ['Services', 17], ['Health and beauty', 12], ['Education', 9], ['Other', 17]];

function buildUnits(rng) {
  const units = [];
  for (const a of ASSETS) {
    const lots = [];
    for (const g of a.mix) {
      const perFloor = allocate(g.n, g.floors.map(() => 1));
      g.floors.forEach((floor, fi) => {
        const already = lots.filter((l) => l.floor === floor).length;
        for (let k = 0; k < perFloor[fi]; k++) {
          const size = Math.round(rng.range(g.size[0], g.size[1]) / 10) * 10;
          const psf = g.psf ? r2(rng.range(g.psf[0], g.psf[1])) : null;
          lots.push({
            id: `${a.id}:${floor}-${String(already + k + 1).padStart(2, '0')}`,
            asset: a.id, lot: `${floor}-${String(already + k + 1).padStart(2, '0')}`, floor, use: g.use, size, psf,
            rent: psf ? Math.round((size * psf) / 10) * 10 : null,
          });
        }
      });
    }
    // Assign statuses to match the register exactly.
    const order = rng.shuffle(lots.map((_, i) => i));
    const { occupied, reserved, vacant, redev } = a.counts;
    order.forEach((idx, k) => {
      lots[idx].status = k < occupied ? 'Occupied' : k < occupied + reserved ? 'Reserved' : k < occupied + reserved + vacant ? 'Vacant' : 'Under redevelopment';
    });
    if (redev) lots.forEach((l) => (l.status = 'Under redevelopment'));
    if (a.id === HERO.asset) {
      const hero = lots.find((l) => l.lot === HERO.lot);
      if (hero.status !== 'Vacant') {
        const swap = lots.find((l) => l.status === 'Vacant' && l.use === hero.use) || lots.find((l) => l.status === 'Vacant');
        swap.status = hero.status;
        hero.status = 'Vacant';
      }
      hero.size = HERO.size; hero.psf = HERO.psf; hero.rent = HERO.rent;
    }
    units.push(...lots);
  }
  return units;
}

function attachLeases(rng, units, signed) {
  const asAt = dateUTC(AS_AT);
  // Signed tenancies take an occupied lot of the right use and carry the signed rent.
  for (const s of signed) {
    const lot = units.find((u) => u.asset === s.asset && u.status === 'Occupied' && u.use === s.use && !u.signedId && u.lot !== HERO.lot)
      || units.find((u) => u.asset === s.asset && u.status === 'Occupied' && !u.signedId);
    lot.signedId = s.id;
    lot.rent = s.rent;
    lot.size = Math.max(200, Math.round(s.rent / (lot.psf || 3) / 10) * 10);
    lot.psf = r2(s.rent / lot.size);
    const start = addDays(dateUTC(monthEnd(monthOf(s.date))), 0);
    lot.leaseStart = ymd(start);
    lot.leaseExpiry = ymd(addDays(new Date(Date.UTC(start.getUTCFullYear() + 2, start.getUTCMonth(), start.getUTCDate())), -1));
    lot.signedDate = s.date;
    s.lot = lot.lot;
    s.unitId = lot.id;
  }
  for (const u of units) {
    if (u.status === 'Occupied' && !u.signedId) {
      const term = u.use === 'Retail' ? rng.pick([2, 3]) : 3;
      const bucket = rng.weighted([0, 1, 2], [6.8, 31.5, 61.7]);
      let expiry;
      if (bucket === 0) expiry = addDays(dateUTC('2026-11-01'), rng.int(0, 60));
      else if (bucket === 1) expiry = addDays(dateUTC('2027-01-01'), rng.int(0, 364));
      else {
        const latest = new Date(Date.UTC(asAt.getUTCFullYear() + term, asAt.getUTCMonth(), asAt.getUTCDate()));
        const span = Math.max(30, Math.round((latest - dateUTC('2028-01-01')) / 86400000));
        expiry = addDays(dateUTC('2028-01-01'), rng.int(0, span));
      }
      const start = addDays(new Date(Date.UTC(expiry.getUTCFullYear() - term, expiry.getUTCMonth(), expiry.getUTCDate())), 1);
      u.leaseStart = ymd(start);
      u.leaseExpiry = ymd(expiry);
      if (u.use === 'Retail' || u.use === 'Shop lot' || u.use === 'Shop office') u.trade = rng.weighted(TRADES.map((t) => t[0]), TRADES.map((t) => t[1]));
    }
    if (u.status === 'Vacant' || u.status === 'Reserved') {
      const days = Math.min(720, Math.max(15, Math.round(Math.exp(Math.log(142) + 0.75 * gaussian(rng)))));
      u.vacantSince = ymd(addDays(asAt, -days));
    }
  }
  const hero = units.find((u) => u.asset === HERO.asset && u.lot === HERO.lot);
  hero.vacantSince = '2026-05-18';
}

function buildCampaigns(rng, signed, spreadRng) {
  return CAMPAIGNS.map((c) => {
    const days = dateRange(c.start, c.end);
    const T = days.length;
    const base = days.map((d, t) => {
      const dow = dateUTC(d).getUTCDay();
      return (1 + 0.35 * (t / T)) * (dow === 0 || dow === 6 ? 0.88 : 1) * (0.85 + 0.3 * rng.next());
    });
    const daily = {};
    for (const ch of CHANNELS) {
      const [spend, imp, clicks, enq, views, sgn] = c.channels[ch.id];
      let spendDaily;
      if (ch.id === 'gads') {
        spendDaily = new Array(T).fill(0);
        for (const [m, tot] of Object.entries(c.googleByMonth)) {
          const idx = days.map((d, i) => (monthOf(d) === m ? i : -1)).filter((i) => i >= 0);
          const parts = allocate(tot, idx.map((i) => base[i]));
          idx.forEach((i, k) => (spendDaily[i] = parts[k]));
        }
      } else spendDaily = allocate(spend, base);
      const w = spendDaily.map((s) => s * (0.8 + 0.4 * rng.next()) + 0.01);
      const lagged = days.map((_, i) => (i < 5 ? 0.05 : spendDaily[i - 5] + 0.01));
      const signedDaily = days.map((d) => signed.filter((s) => s.campaign === c.id && s.channel === ch.id && s.date === d).length);
      daily[ch.id] = { spend: spendDaily, imp: allocate(imp, w), clicks: allocate(clicks, w), enq: scatter(enq, w, spreadRng), views: scatter(views, lagged, spreadRng), signed: signedDaily };
      if (signedDaily.reduce((a, b) => a + b, 0) !== sgn) throw new Error(`signed mismatch ${c.id} ${ch.id}`);
    }
    const unpaid = {};
    for (const [src, n] of Object.entries(c.unpaid)) unpaid[src] = scatter(n, base, spreadRng);
    return { ...c, days, daily, unpaidDaily: unpaid };
  });
}

const CONTACTS = ['Puan Rohana Ismail', 'Encik Lim Wei Jie', 'Cik Nurul Aisyah', 'Encik Ravi Subramaniam', 'Puan Tan Mei Ling', 'Encik Azman Yusof', 'Cik Priya Nair', 'Encik Hakim Zulkifli', 'Puan Siti Khadijah', 'Encik Wong Kok Leong', 'Cik Farah Hani', 'Encik Muthu Krishnan', 'Puan Norazlina Hassan', 'Encik Danial Rizal', 'Cik Chong Pei Shan', 'Encik Syafiq Ahmad', 'Puan Kavitha Raj', 'Encik Ong Boon Hock', 'Cik Izzah Najwa', 'Encik Firdaus Kamal'];

const PAID_SOURCES = { 'Facebook Lead Ad': 'fb', 'Google Ads': 'gads', Instagram: 'ig' };

function buildEnquiries(rng, units, signed, campaigns) {
  const asAt = dateUTC(AS_AT);
  const out = [];
  let n = 0;
  const nextId = () => `ENQ-${String(4100 + ++n)}`;
  const respMinutes = () => Math.min(2880, Math.max(10, Math.round(Math.exp(Math.log(195) + 0.95 * gaussian(rng)))));
  const atTime = (d, hMin = 9, hMax = 18) => `${ymd(d)}T${String(rng.int(hMin, hMax)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00+08:00`;
  const plusMin = (iso, m) => new Date(new Date(iso).getTime() + m * 60000).toISOString();
  // Each enquiry gets its own business: no name appears twice on the board.
  const bizQueue = rng.shuffle(BUSINESSES);
  const business = () => bizQueue.pop();
  // A reserved unit is under negotiation with one prospect only.
  const negotiating = new Set();
  const leasable = ASSETS.filter((a) => a.counts.redev === 0);

  // Signed this month: the October signed tenancies.
  for (const s of signed.filter((x) => monthOf(x.date) === '2026-10')) {
    const ch = CHANNELS.find((c) => c.id === s.channel);
    const received = atTime(addDays(dateUTC(s.date), -rng.int(25, 45)));
    const first = plusMin(received, respMinutes());
    out.push({
      id: nextId(), business: business(), contact: rng.pick(CONTACTS), source: ch.source, channel: s.channel, campaign: s.campaign,
      asset: s.asset, unitId: s.unitId, lot: s.lot, rent: s.rent, stage: 'Signed', officer: ASSETS.find((a) => a.id === s.asset).officer,
      receivedAt: received, firstResponseAt: first, signedId: s.id,
      history: [['New', received], ['Contacted', first], ['Qualified', plusMin(first, 1440 * 3)], ['Viewing Scheduled', plusMin(first, 1440 * 8)], ['Negotiation', plusMin(first, 1440 * 15)], ['Signed', `${s.date}T15:00:00+08:00`]],
    });
  }

  const ageRange = { New: [0, 2], Contacted: [2, 10], Qualified: [5, 20], 'Viewing Scheduled': [7, 25], Negotiation: [15, 40], Lost: [10, 45] };
  const flow = ['New', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Negotiation'];
  for (const [stage, count] of Object.entries(STAGE_COUNTS)) {
    if (stage === 'Signed') continue;
    for (let i = 0; i < count; i++) {
      let source = rng.weighted(SOURCE_MIX.map((s) => s[0]), SOURCE_MIX.map((s) => s[1]));
      let campaign = null, channel = null, asset, unit;
      const active = campaigns.filter((c) => c.end >= '2026-10-01');
      if (stage === 'Negotiation') {
        // Negotiation holds a Reserved unit, one prospect per unit. Pick the unit first, then a campaign that covers it.
        const free = units.filter((u) => u.status === 'Reserved' && !negotiating.has(u.id));
        unit = rng.pick(free);
        asset = unit.asset;
        negotiating.add(unit.id);
        const covering = active.filter((c) => c.assets[asset]);
        if (PAID_SOURCES[source] && covering.length) {
          channel = PAID_SOURCES[source];
          campaign = rng.weighted(covering, covering.map((x) => x.channels[channel][3] + 1)).id;
        } else if (PAID_SOURCES[source]) {
          source = 'Website form';
        }
      } else {
        if (PAID_SOURCES[source]) {
          channel = PAID_SOURCES[source];
          const c = rng.weighted(active, active.map((x) => x.channels[channel][3] + 1));
          campaign = c.id;
          asset = rng.weighted(Object.keys(c.assets), Object.values(c.assets));
        } else {
          const a = rng.weighted(leasable, leasable.map((x) => x.counts.vacant + x.counts.reserved));
          asset = a.id;
        }
        unit = rng.pick(units.filter((u) => u.asset === asset && u.status === 'Vacant' && u.lot !== HERO.lot));
      }
      const [lo, hi] = ageRange[stage];
      const received = atTime(addDays(asAt, -rng.int(lo, hi)));
      const reached = stage === 'Lost' ? rng.int(1, 4) : flow.indexOf(stage);
      const first = reached >= 1 ? plusMin(received, respMinutes()) : null;
      const history = [['New', received]];
      let t = first;
      for (let k = 1; k <= reached; k++) {
        history.push([flow[k], t]);
        t = plusMin(t, 1440 * rng.int(1, 5));
      }
      const rec = {
        id: nextId(), business: business(), contact: rng.pick(CONTACTS), source, channel, campaign, asset, unitId: unit.id, lot: unit.lot,
        rent: unit.rent, stage, officer: ASSETS.find((a) => a.id === asset).officer, receivedAt: received, firstResponseAt: first, history,
      };
      if (stage === 'Lost') {
        rec.lostReason = rng.weighted(LOST_REASONS.map((x) => x[0]), LOST_REASONS.map((x) => x[1]));
        const lostAt = `2026-10-${String(rng.int(1, 30)).padStart(2, '0')}T16:00:00+08:00`;
        rec.history.push(['Lost', lostAt]);
      } else {
        rec.nextFollowUp = ymd(addDays(asAt, rng.int(0, 6)));
      }
      out.push(rec);
    }
  }
  return out;
}

function buildWebsite(rng) {
  const monthly = { '2026-07': 71000, '2026-08': 74500, '2026-09': 79000, '2026-10': WEBSITE_OCT.sessions };
  const days = dateRange(PERIOD.start, PERIOD.end);
  const sessions = new Array(days.length).fill(0);
  for (const [m, tot] of Object.entries(monthly)) {
    const idx = days.map((d, i) => (monthOf(d) === m ? i : -1)).filter((i) => i >= 0);
    const w = idx.map((i) => { const dow = dateUTC(days[i]).getUTCDay(); return (dow === 0 || dow === 6 ? 0.78 : 1) * (0.9 + 0.2 * rng.next()); });
    allocate(tot, w).forEach((v, k) => (sessions[idx[k]] = v));
  }
  const usersMonthly = Object.fromEntries(Object.entries(monthly).map(([m, s]) => [m, m === '2026-10' ? WEBSITE_OCT.users : Math.round(s * 0.715)]));
  return { days, sessions, monthly, usersMonthly };
}

function buildSocial(rng) {
  const days = dateRange(PERIOD.start, PERIOD.end);
  return SOCIAL_PAGES.map((p) => {
    const monthlyReach = { '2026-07': Math.round(p.reachOct * 0.84), '2026-08': Math.round(p.reachOct * 0.88), '2026-09': Math.round(p.reachOct * 0.93), '2026-10': p.reachOct };
    const reach = new Array(days.length).fill(0);
    for (const [m, tot] of Object.entries(monthlyReach)) {
      const idx = days.map((d, i) => (monthOf(d) === m ? i : -1)).filter((i) => i >= 0);
      allocate(tot, idx.map(() => 0.7 + 0.6 * rng.next())).forEach((v, k) => (reach[idx[k]] = v));
    }
    const followersByMonth = { '2026-07': Math.round(p.followers * 0.955), '2026-08': Math.round(p.followers * 0.968), '2026-09': Math.round(p.followers * 0.983), '2026-10': p.followers };
    return { ...p, days, reach, monthlyReach, followersByMonth };
  });
}

function buildVisitors(rng, saCampaign) {
  const days = dateRange(PERIOD.start, PERIOD.end);
  const spend = days.map((d) => {
    const i = saCampaign.days.indexOf(d);
    return i < 0 ? 0 : CHANNELS.reduce((s, ch) => s + saCampaign.daily[ch.id].spend[i], 0);
  });
  const weekly = [];
  for (let i = 0; i < days.length; i += 7) weekly.push(spend.slice(i, i + 7).reduce((a, b) => a + b, 0));
  const cutoff = weekly.slice().sort((a, b) => b - a)[Math.floor(weekly.length / 4)];
  const out = {};
  for (const [asset, factor] of [['kpsa', 1], ['pas', 1.2]]) {
    out[asset] = days.map((d, i) => {
      const dow = dateUTC(d).getUTCDay();
      const weekend = dow === 0 || dow === 6;
      let v = weekend ? rng.range(11000, 15000) : rng.range(6000, 9000);
      if (weekly[Math.floor(i / 7)] >= cutoff) v *= 1.08 + 0.04 * rng.next();
      const total = Math.round(v * factor);
      const [main, car, side] = allocate(total, [55, 30, 15]);
      return { date: d, total, main, car, side };
    });
  }
  return { days, spend, byAsset: out };
}

const LOG_TYPE = { Qualified: 'Note', 'Viewing Scheduled': 'Viewing', Negotiation: 'Email', Signed: 'Note', Lost: 'Note' };
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rmInt(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function whenLabel(iso) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value || '';
  const month = pick('month') || MONTHS_SHORT[d.getUTCMonth()];
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return { label: `${pick('day')} ${month}`, clock: `${hour}:${pick('minute')}` };
}

const CALL_TEXT = [
  (e) => `Called. Looking at lot ${e.lot}; sent the floor plan and rate card.`,
  (e) => `Called ${e.contact}. Discussed lot ${e.lot} and sent the rate card.`,
  (e) => `Called. Asked about lot ${e.lot}. Floor plan and rate card sent.`,
  (e) => `Phone call with ${e.contact}. Sent details for lot ${e.lot}.`,
  (e) => `Called. Shared the rate card for lot ${e.lot} and answered questions on the space.`,
];
const WHATSAPP_TEXT = [
  (e) => `WhatsApp to ${e.contact}. Sent the floor plan and rate card for lot ${e.lot}.`,
  (e) => `WhatsApp: shared availability for lot ${e.lot} and the asking rent of RM${rmInt(e.rent)} a month.`,
  (e) => `Messaged ${e.contact} on WhatsApp with the floor plan for lot ${e.lot}.`,
  (e) => `WhatsApp follow-up. Rate card for lot ${e.lot} is with the prospect.`,
  (e) => `WhatsApp to ${e.contact}. Confirmed interest and sent details for lot ${e.lot}.`,
];
const LOG_TEXT = {
  Call: CALL_TEXT,
  WhatsApp: WHATSAPP_TEXT,
  Qualified: [
    (e) => `Budget discussed for lot ${e.lot}. Asking rent is RM${rmInt(e.rent)} a month.`,
    (e) => `Qualified. ${e.contact} wants to proceed on lot ${e.lot}.`,
    (e) => `Note: budget and timing confirmed for lot ${e.lot}.`,
    (e) => `Prospect qualified. Next step is a viewing of lot ${e.lot}.`,
    (e) => `Confirmed interest in lot ${e.lot} at RM${rmInt(e.rent)} a month.`,
  ],
  'Viewing Scheduled': [
    (e, at) => `Viewing booked for lot ${e.lot} on ${whenLabel(at).label}, ${whenLabel(at).clock}.`,
    (e, at) => `Viewing of lot ${e.lot} confirmed for ${whenLabel(at).label} at ${whenLabel(at).clock}.`,
    (e, at) => `Site visit arranged for lot ${e.lot} on ${whenLabel(at).label}.`,
    (e, at) => `Viewing set with ${e.contact} for lot ${e.lot} on ${whenLabel(at).label}, ${whenLabel(at).clock}.`,
    (e, at) => `Booked a viewing of lot ${e.lot} on ${whenLabel(at).label}.`,
  ],
  Negotiation: [
    (e) => `Sent offer letter for lot ${e.lot} at RM${rmInt(e.rent)} a month, 2-year term.`,
    (e) => `Emailed the draft offer for lot ${e.lot} to ${e.contact}.`,
    (e) => `Offer sent: lot ${e.lot}, RM${rmInt(e.rent)} a month, 2-year term.`,
    (e) => `Negotiating terms for lot ${e.lot} by email.`,
    (e) => `Sent the proposal for lot ${e.lot} at RM${rmInt(e.rent)} a month.`,
  ],
  Signed: [
    (e, at) => `Tenancy agreement signed for lot ${e.lot} on ${whenLabel(at).label}.`,
    (e) => `Signed. Lot ${e.lot} is now let at RM${rmInt(e.rent)} a month.`,
    (e, at) => `Agreement completed for lot ${e.lot}. Signed on ${whenLabel(at).label}.`,
    (e) => `Tenancy signed by ${e.business} for lot ${e.lot}.`,
    (e) => `Signed the agreement for lot ${e.lot} at RM${rmInt(e.rent)} a month.`,
  ],
  Lost: [
    (e) => `Lost: ${e.lostReason}. Prospect chose another unit.`,
    (e) => `Closed as lost (${e.lostReason}).`,
    (e) => `Lost: ${e.lostReason}. No further action.`,
    (e) => `Prospect withdrew. Reason: ${e.lostReason}.`,
    (e) => `Lost: ${e.lostReason}.`,
  ],
};

// Own random stream so every other generated field stays identical.
export function buildContactLogs(enquiries) {
  const rng = makeRng(20261030);
  for (const e of enquiries) {
    const log = [];
    for (const [stage, at] of e.history) {
      if (stage === 'New' || (stage !== 'Contacted' && !LOG_TYPE[stage])) continue;
      const type = stage === 'Contacted' ? (rng.next() < 0.5 ? 'Call' : 'WhatsApp') : LOG_TYPE[stage];
      const templates = stage === 'Contacted' ? LOG_TEXT[type] : LOG_TEXT[stage];
      const text = templates[rng.int(0, templates.length - 1)](e, at);
      log.push({ type, text, at, by: e.officer });
    }
    e.log = log;
  }
}

const UTM_CAMPAIGN = {
  sa: 'sa-sentral-2026',
  mpk: 'menara-pkns-2026',
  bangi: 'bangi-2026',
  kl: 'pejabat-kl-2026',
  s13: 'seksyen-13-2026',
};

function businessTypeOf(name) {
  const text = String(name || '').toLowerCase();
  if (/klinik|clinic|dental|pergigian|optik|pharmacy|farmasi/.test(text)) return 'clinic';
  if (/cafe|café|coffee|restaurant|restoran|bistro|bakery|kitchen|food|makanan/.test(text)) return 'F&B';
  if (/school|sekolah|tuition|tuisyen|tadika|academy|college|kolej|education|pendidikan/.test(text)) return 'education';
  if (/retail|fashion|boutique|mart|grocer|kedai|store|shop|runcit/.test(text)) return 'retail';
  if (/service|servis|consult|konsul|agency|agensi|solution|digital|tech|engineering|logistik/.test(text)) return 'services';
  return 'office';
}

function sizeBand(size) {
  const n = Number(size) || 0;
  const lo = Math.floor(n / 500) * 500;
  const hi = lo + 500;
  const fmt = (value) => value.toLocaleString('en-US');
  return `${fmt(lo)}–${fmt(hi)} sq ft`;
}

function budgetLabel(rent) {
  const up = Math.ceil((Number(rent) || 0) / 500) * 500;
  return `Up to RM${up.toLocaleString('en-US')} a month`;
}

function moveInLabel(iso, months) {
  const received = new Date(iso);
  const when = new Date(Date.UTC(received.getUTCFullYear(), received.getUTCMonth() + months, 1));
  return when.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function emailFor(business, index) {
  const slug = String(business || '').toLowerCase().replace(/sdn\.?\s*bhd\.?/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'niaga';
  return `${slug}${index}@${slug}.com.my`;
}

function nextPhone(rng, used) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const phone = `01${rng.int(0, 9)}-${String(rng.int(0, 999)).padStart(3, '0')} ${String(rng.int(0, 9999)).padStart(4, '0')}`;
    if (!used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
  const phone = `019-000 ${String(used.size).padStart(4, '0')}`;
  used.add(phone);
  return phone;
}

function consentVia(source) {
  if (source === 'Walk-in / call') return 'Verbal (walk-in)';
  if (source === 'Website form' || source === 'Website form – QR demo') return 'Website form';
  return 'Lead form';
}

const LEAD_MESSAGES = [
  (enquiry) => `Saya berminat dengan ruang di lot ${enquiry.lot}. Boleh hubungi saya?`,
  (enquiry) => `I would like the rate card for lot ${enquiry.lot}.`,
  (enquiry) => `Mohon maklumat sewa untuk lot ${enquiry.lot}.`,
  (enquiry) => `Looking at lot ${enquiry.lot}. Please call me this week.`,
];

// Own stream after contact logs, so campaigns, units and the existing enquiry fields stay identical.
export function enrichEnquiries(enquiries, units) {
  const rng = makeRng(20261031);
  const usedPhones = new Set();
  enquiries.forEach((enquiry, index) => {
    const unit = units.find((item) => item.id === enquiry.unitId);
    const roll = rng.next();
    const preferredContact = roll < 0.6 ? 'WhatsApp' : roll < 0.9 ? 'Call' : 'Email';
    const months = rng.int(1, 4);
    const message = rng.pick(LEAD_MESSAGES)(enquiry);
    const phone = nextPhone(rng, usedPhones);
    const spaceType = (unit?.use || enquiry.use) === 'Office' ? 'Office' : 'Retail';
    enquiry.leadForm = {
      businessType: businessTypeOf(enquiry.business),
      spaceType,
      preferredSize: sizeBand(unit?.size || enquiry.size),
      budget: budgetLabel(enquiry.rent),
      moveIn: moveInLabel(enquiry.receivedAt, months),
      preferredContact,
      message,
    };
    enquiry.contactDetails = { phone, email: emailFor(enquiry.business, index + 1) };
    enquiry.phone = phone;
    enquiry.email = enquiry.contactDetails.email;
    enquiry.consent = { given: true, via: consentVia(enquiry.source), at: enquiry.receivedAt };
    const creative = enquiry.campaign && enquiry.channel ? AD_CREATIVES[enquiry.campaign]?.[enquiry.channel] : null;
    if (creative) {
      enquiry.attribution = { adSet: creative.adSet, ad: rng.pick(creative.ads) };
      enquiry.ad = enquiry.attribution.ad;
    }
    if (enquiry.source === 'Website form') {
      const slug = UTM_CAMPAIGN[enquiry.campaign] || `${enquiry.campaign || 'web'}-2026`;
      enquiry.attribution = { ...(enquiry.attribution || {}), utm: `utm_source=facebook&utm_campaign=${slug}` };
    }
    if (preferredContact === 'WhatsApp' && enquiry.firstResponseAt) {
      const count = rng.int(3, 6);
      const logged = enquiry.log || [];
      enquiry.whatsapp = Array.from({ length: count }, (_, i) => {
        const from = i % 2 === 0 ? 'officer' : 'enquirer';
        const entry = logged[Math.floor(i / 2)];
        return {
          from,
          at: entry?.at || enquiry.firstResponseAt,
          text: from === 'officer'
            ? (entry?.text || `Lot ${enquiry.lot} is available.`)
            : (i === 1 ? message : 'Baik, terima kasih. Saya akan semak.'),
        };
      });
    }
  });
}

export function generate() {
  const rng = makeRng();
  const signed = SIGNED.map((s) => ({ ...s }));
  const units = buildUnits(rng);
  attachLeases(rng, units, signed);
  const campaigns = buildCampaigns(rng, signed, makeRng(20261029)); // separate stream: keeps every other generated record unchanged
  const enquiries = buildEnquiries(rng, units, signed, campaigns);
  const website = buildWebsite(rng);
  const social = buildSocial(rng);
  const visitors = buildVisitors(rng, campaigns.find((c) => c.id === 'sa'));
  buildContactLogs(enquiries);
  enrichEnquiries(enquiries, units);
  return { asAt: AS_AT, months: MONTHS, assets: ASSETS, officers: OFFICERS, units, signed, campaigns, enquiries, website, social, visitors };
}

export { lastDayOf, monthOf, daysBetween };

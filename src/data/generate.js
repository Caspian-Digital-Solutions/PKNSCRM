import { makeRng, allocate, scatter, ymd, addDays, dateUTC, daysBetween } from './rng.js';
import { attachZoneData } from './zones.js';
import {
  AS_AT, DEMO_START, LAST_DAY_SHARE, PERIOD, MONTHS, ASSETS, CAMPAIGNS, CHANNELS, SIGNED, OFFICERS, SOCIAL_PAGES, WEBSITE_OCT,
  LOST_REASONS_BEFORE_VIEWING, LOST_REASONS_AFTER_VIEWING, NON_CAMPAIGN, HERO, AD_CREATIVES,
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
    if (lot.leaseStart > AS_AT) lot.status = 'Let'; // signed, lease not started yet: let, not occupied
    s.lot = lot.lot;
    s.leaseStart = lot.leaseStart;
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
    const days = dateRange(c.start, c.end < AS_AT ? c.end : AS_AT); // figures to date: nothing after the demo clock
    const T = days.length;
    const base = days.map((d, t) => {
      const dow = dateUTC(d).getUTCDay();
      return (1 + 0.35 * (t / T)) * (dow === 0 || dow === 6 ? 0.88 : 1) * (0.85 + 0.3 * rng.next()) * (d === AS_AT ? LAST_DAY_SHARE : 1);
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

// ---------------------------------------------------------------------------------------------
// Enquiry records: ONE record for every enquiry that any screen counts.
// The campaign daily arrays (enq, views, signed) decide how many records exist on each day and
// which of them had a viewing or signed; the records are then the single source of truth, so a
// count taken from any dashboard equals the count of records behind it.
// ---------------------------------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');
const MYT = 8 * 3600000;
const tsOf = (iso) => new Date(iso).getTime();
const isoOf = (t) => new Date(t + MYT).toISOString().slice(0, 19) + '+08:00';
const dayOf = (iso) => iso.slice(0, 10);
const at = (day, h, m) => `${day}T${pad2(h)}:${pad2(m)}:00+08:00`;
const HOUR = 3600000, DAY = 24 * HOUR;

const NAME_TYPES = ['Kedai Runcit', 'Butik', 'Restoran', 'Kafe', 'Klinik Gigi', 'Pusat Tuisyen', 'Salon', 'Farmasi', 'Studio', 'Akademi',
  'Perunding', 'Agensi', 'Kedai Kek', 'Bakeri', 'Optik', 'Pusat Kecergasan', 'Tadika', 'Pusat Latihan', 'Kedai Telefon', 'Dobi',
  'Spa', 'Firma Guaman', 'Syarikat Teknologi', 'Pusat Rawatan', 'Kedai Buku', 'Kedai Kasut', 'Kedai Perabot', 'Pusat Servis', 'Kedai Bunga', 'Kedai Jam'];
const NAME_WORDS = ['Seri Mawar', 'Bestari', 'Cahaya', 'Mutiara', 'Permata', 'Gemilang', 'Harmoni', 'Sinar', 'Damai', 'Jaya',
  'Murni', 'Indah', 'Ceria', 'Setia', 'Bistari', 'Kenanga', 'Melati', 'Delima', 'Nilam', 'Zamrud',
  'Intan', 'Suria', 'Bayu', 'Pelangi', 'Teratai', 'Cempaka', 'Seroja', 'Anggerik', 'Kemboja', 'Tanjung',
  'Wawasan', 'Perdana', 'Utama', 'Mesra', 'Ikhlas', 'Amanah', 'Sejahtera', 'Bahagia', 'Lestari', 'Tekun'];

function lognormalMinutes(rng, median, sigma) {
  return Math.exp(Math.log(median) + sigma * gaussian(rng));
}
const isWorking = (t) => {
  const d = new Date(t + MYT);
  const dow = d.getUTCDay(), h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return dow >= 1 && dow <= 5 && h >= 9 && h < 18;
};
const nextWorkingMorning = (t) => {
  let d = new Date(t + MYT);
  d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const hour = new Date(t + MYT).getUTCHours();
  if (hour >= 9) d = addDays(d, 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = addDays(d, 1);
  return d.getTime() - MYT + 9 * HOUR;
};

function buildEnquiries(rng, units, signed, campaigns) {
  const NOW = tsOf(DEMO_START);
  const out = [];
  const leasable = ASSETS.filter((a) => a.counts.redev === 0);
  const unitsAt = (asset, statuses) => units.filter((u) => u.asset === asset && statuses.includes(u.status) && u.lot !== HERO.lot);

  const receivedTime = (day, isLast) => {
    if (isLast) return at(day, rng.int(7, 9), rng.int(0, 50)); // the part day ends at 10:00
    const h = rng.weighted([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], [2, 5, 7, 7, 6, 6, 7, 7, 7, 6, 5, 6, 7, 6, 3]);
    return at(day, h, rng.int(0, 59));
  };
  const make = (base) => {
    const rec = { ...base, history: [['New', base.receivedAt]] };
    out.push(rec);
    return rec;
  };

  // 1. Paid and unpaid records from every campaign, day by day.
  for (const c of campaigns) {
    const last = c.days.length - 1;
    for (const ch of CHANNELS) {
      c.daily[ch.id].enq.forEach((n, i) => {
        for (let k = 0; k < n; k++) {
          const asset = rng.weighted(Object.keys(c.assets), Object.values(c.assets));
          make({ source: ch.source, channel: ch.id, campaign: c.id, paid: true, asset, receivedAt: receivedTime(c.days[i], c.days[i] === AS_AT && i === last) });
        }
      });
    }
    for (const [src, arr] of Object.entries(c.unpaidDaily)) {
      arr.forEach((n, i) => {
        for (let k = 0; k < n; k++) {
          const asset = rng.weighted(Object.keys(c.assets), Object.values(c.assets));
          make({ source: src === 'Walk-in' ? 'Walk-in / call' : src, channel: null, campaign: c.id, paid: false, asset, receivedAt: receivedTime(c.days[i], c.days[i] === AS_AT && i === last) });
        }
      });
    }
  }
  // 2. Enquiries not linked to any campaign.
  const allDays = dateRange(PERIOD.start, AS_AT);
  const ncPerDay = scatter(NON_CAMPAIGN.total, allDays.map((d) => (d === AS_AT ? LAST_DAY_SHARE : 1)), rng);
  ncPerDay.forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      const a = rng.weighted(leasable, leasable.map((x) => x.counts.vacant + x.counts.reserved));
      make({ source: rng.weighted(NON_CAMPAIGN.sources.map((s) => s[0]), NON_CAMPAIGN.sources.map((s) => s[1])), channel: null, campaign: null, paid: false, asset: a.id, receivedAt: receivedTime(allDays[i], allDays[i] === AS_AT) });
    }
  });
  out.sort((x, y) => tsOf(x.receivedAt) - tsOf(y.receivedAt));

  // 3. First contact. Inside working hours: a few hours. Outside: the next working morning.
  for (const r of out) {
    const t0 = tsOf(r.receivedAt);
    const first = isWorking(t0) ? t0 + Math.max(4, Math.min(480, lognormalMinutes(rng, 140, 0.9))) * 60000
      : nextWorkingMorning(t0) + Math.max(5, Math.min(240, lognormalMinutes(rng, 50, 0.8))) * 60000;
    // A few enquiries from the last two days were missed: nobody has replied yet, so the first-contact alert has something to show.
    r._first = NOW - t0 <= 2 * DAY && NOW - t0 > 3 * HOUR && rng.next() < 0.12 ? Infinity : first;
  }

  // 4–5. Viewings and signings. Each signed tenancy goes to a paid enquiry of the same campaign and channel that
  // viewed at least 2 days before signing. The rest of each channel's viewings go to other enquiries of that channel,
  // 2 to 21 days after they arrived. The daily viewing counts are then rebuilt FROM the records.
  const viewAt = (t) => { const d = ymd(new Date(t + MYT)); return tsOf(at(d, rng.pick([10, 11, 12, 14, 15, 16]), rng.pick([0, 30]))); };
  for (const s of signed) {
    const st = tsOf(at(s.date, 15, 0));
    let cand = out.filter((r) => r.campaign === s.campaign && r.channel === s.channel && !r._signed && st - tsOf(r.receivedAt) >= 6 * DAY && st - tsOf(r.receivedAt) <= 50 * DAY);
    const sameAsset = cand.filter((r) => r.asset === s.asset);
    if (sameAsset.length) cand = sameAsset;
    if (!cand.length) throw new Error(`no enquiry for signed ${s.id}`);
    const r = rng.pick(cand);
    const lo = Math.max(r._first + DAY, tsOf(r.receivedAt) + 2 * DAY), hi = st - 2 * DAY;
    r._view = viewAt(lo + rng.next() * Math.max(0, hi - lo));
    r._signed = st; r.asset = s.asset; r.unitId = s.unitId; r.lot = s.lot; r.rent = s.rent; r.signedId = s.id; r.leaseStart = s.leaseStart;
  }
  for (const c of campaigns) {
    for (const ch of CHANNELS) {
      const total = c.daily[ch.id].views.reduce((x, y) => x + y, 0);
      const mine = out.filter((r) => r.campaign === c.id && r.channel === ch.id);
      let need = total - mine.filter((r) => r._view).length;
      const pool = rng.shuffle(mine.filter((r) => !r._view && NOW - tsOf(r.receivedAt) >= 3 * DAY));
      for (const r of pool) {
        if (need <= 0) break;
        const t = viewAt(Math.max(r._first + DAY, tsOf(r.receivedAt) + rng.int(2, 21) * DAY));
        if (t >= NOW - 6 * HOUR) continue;
        r._view = t; need -= 1;
      }
      if (need > 0) throw new Error(`not enough enquiries for viewings ${c.id} ${ch.id}`);
      c.daily[ch.id].views = c.days.map((d) => mine.filter((r) => r._view && ymd(new Date(r._view + MYT)) === d).length);
    }
  }
  // Unpaid and walk-in enquiries are warmer: about one in four gets a viewing (they never touch the paid figures).
  for (const r of out.filter((x) => !x.paid)) {
    if (rng.next() < 0.25) {
      const t = viewAt(Math.max(r._first + DAY, tsOf(r.receivedAt) + rng.int(3, 12) * DAY));
      if (t < NOW - DAY) r._view = t;
    }
  }

  // 6. Negotiation: every Reserved unit is held by exactly one enquiry that has viewed.
  for (const u of units.filter((x) => x.status === 'Reserved')) {
    const viewed = out.filter((r) => r.asset === u.asset && r._view && !r._signed && !r._nego && NOW - r._view <= 35 * DAY && NOW - r._view >= DAY);
    let r = viewed.sort((x, y) => y._view - x._view)[0];
    if (!r) {
      // No viewing at this asset yet: an unpaid enquiry at this asset that has been contacted views now. Never a paid one.
      r = out.filter((x) => x.asset === u.asset && !x.paid && !x._view && x._first < NOW - 5 * DAY && NOW - tsOf(x.receivedAt) <= 40 * DAY).sort((x, y) => tsOf(y.receivedAt) - tsOf(x.receivedAt))[0];
      if (!r) {
        const day = ymd(addDays(dateUTC(AS_AT), -rng.int(12, 20)));
        r = make({ source: rng.pick(['WhatsApp', 'Walk-in / call']), channel: null, campaign: null, paid: false, asset: u.asset, receivedAt: at(day, rng.int(10, 16), rng.int(0, 59)) });
        r._first = tsOf(r.receivedAt) + rng.int(30, 180) * 60000;
      }
      r._view = Math.min(NOW - 2 * DAY, Math.max(r._first + 2 * DAY, NOW - rng.int(4, 9) * DAY));
    }
    r._nego = Math.min(NOW - 6 * HOUR, r._view + rng.int(1, 4) * DAY);
    r.unitId = u.id; r.lot = u.lot; r.rent = u.rent;
  }

  // 7. Status of everything else as at the demo clock.
  const pickReason = (list) => rng.weighted(list.map((x) => x[0]), list.map((x) => x[1]));
  for (const r of out) {
    const age = (NOW - tsOf(r.receivedAt)) / DAY;
    if (r._signed) { r.stage = 'Signed'; continue; }
    if (r._nego) { r.stage = 'Negotiation'; continue; }
    if (r._view && r._view <= NOW) {
      if (NOW - r._view <= 4 * DAY) r.stage = 'Viewing Scheduled'; // viewing held, outcome still to log
      else { r.stage = 'Lost'; r.lostReason = pickReason(LOST_REASONS_AFTER_VIEWING); r._lost = Math.min(NOW - HOUR, r._view + rng.int(2, 14) * DAY); }
      continue;
    }
    if (r._first > NOW) { r.stage = 'New'; continue; }
    if (age <= 3) { r.stage = age > 1.5 && rng.next() < 0.4 ? 'Qualified' : 'Contacted'; continue; }
    if (age <= 14) {
      const x = rng.next();
      if (x < 0.20) r.stage = 'Qualified';
      else if (x < 0.35) { r.stage = 'Viewing Scheduled'; r._view = tsOf(at(ymd(addDays(dateUTC(AS_AT), rng.int(1, 7))), rng.pick([10, 11, 14, 15, 16]), rng.pick([0, 30]))); r._viewFuture = true; }
      else if (x < 0.70) r.stage = 'Contacted';
      else { r.stage = 'Lost'; r.lostReason = pickReason(LOST_REASONS_BEFORE_VIEWING); r._lost = Math.min(NOW - HOUR, r._first + rng.int(3, 10) * DAY); }
      continue;
    }
    if (age <= 40 && rng.next() < 0.06) { r.stage = 'Qualified'; continue; } // still looking, moving in next year
    r.stage = 'Lost'; r.lostReason = pickReason(LOST_REASONS_BEFORE_VIEWING); r._lost = Math.min(NOW - HOUR, r._first + rng.int(5, 21) * DAY);
  }

  // 8. Units, names, officers, history.
  const bizQueue = rng.shuffle(BUSINESSES);
  const generated = rng.shuffle(NAME_TYPES.flatMap((t) => NAME_WORDS.map((w) => `${t} ${w}`))).filter((n) => !BUSINESSES.includes(n));
  const openFirst = out.slice().sort((x, y) => {
    const rank = (r) => (r.stage !== 'Lost' && (r.stage !== 'Signed' || r._signed >= tsOf(at('2026-10-01', 0, 0))) ? 0 : 1);
    return rank(x) - rank(y) || tsOf(y.receivedAt) - tsOf(x.receivedAt);
  });
  for (const r of openFirst) r.business = bizQueue.length ? bizQueue.pop() : generated.pop();
  out.sort((x, y) => tsOf(x.receivedAt) - tsOf(y.receivedAt));
  let n = 0;
  for (const r of out) {
    r.id = `ENQ-${String(5000 + ++n)}`;
    r.contact = rng.pick(CONTACTS);
    r.officer = ASSETS.find((a) => a.id === r.asset).officer;
    if (!r.unitId) {
      const open = r.stage !== 'Lost';
      const pool = unitsAt(r.asset, open ? ['Vacant'] : ['Vacant', 'Reserved', 'Occupied', 'Let']);
      const u = rng.pick(pool.length ? pool : unitsAt(r.asset, ['Vacant', 'Reserved', 'Occupied', 'Let']));
      r.unitId = u.id; r.lot = u.lot; r.rent = u.rent;
    }
    const first = r._first <= NOW ? r._first : null;
    r.firstResponseAt = first ? isoOf(first) : null;
    const h = [['New', r.receivedAt]];
    if (first) h.push(['Contacted', isoOf(first)]);
    const reachedQualified = ['Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed'].includes(r.stage) || (r.stage === 'Lost' && r._view);
    if (reachedQualified) {
      const q = Math.min(r._view ? Math.min(r._view, NOW) - DAY : NOW - 2 * HOUR, first + rng.int(1, 3) * DAY);
      h.push(['Qualified', isoOf(Math.max(first + HOUR, q))]);
    }
    if (r._view) {
      const booked = Math.max(tsOf(h[h.length - 1][1]) + HOUR, Math.min(NOW - HOUR, r._view - rng.int(2, 5) * DAY));
      h.push(['Viewing Scheduled', isoOf(booked)]);
      r.viewingAt = isoOf(r._view);
      r.viewingHeld = !r._viewFuture;
    }
    if (r._nego || r._signed) h.push(['Negotiation', isoOf(r._nego || Math.min(r._signed - DAY, r._view + rng.int(1, 5) * DAY))]);
    if (r._signed) { h.push(['Signed', isoOf(r._signed)]); r.signedAt = isoOf(r._signed); }
    if (r.stage === 'Lost') { h.push(['Lost', isoOf(Math.max(tsOf(h[h.length - 1][1]) + HOUR, r._lost))]); r.withdrawnAt = h[h.length - 1][1]; }
    r.history = h;
    if (r.stage !== 'Lost' && r.stage !== 'Signed') r.nextFollowUp = ymd(addDays(dateUTC(AS_AT), rng.int(0, 6)));
    for (const k of Object.keys(r)) if (k.startsWith('_')) delete r[k];
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
  const n = Number(size) || 100;
  let lo = Math.floor(n / 100) * 100;
  if (lo < 100) lo = 100;
  const hi = lo + 200;
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

function emailLocal(contact) {
  const cleaned = String(contact || '').replace(/^(encik|puan|cik|mr|ms|mrs|dato'?|datuk)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).map((part) => part.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
  return parts[0] || 'hello';
}

function businessSlug(business) {
  return String(business || '')
    .toLowerCase()
    .replace(/\b(sdn\.?\s*bhd\.?|bhd\.?|plt|enterprise|trading|sdn)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 28) || 'niaga';
}

function emailFor(enquiry, used) {
  const local = emailLocal(enquiry.contact);
  const domain = businessSlug(enquiry.business);
  const tokens = String(enquiry.contact || '')
    .replace(/^(encik|puan|cik|mr|ms|mrs|dato'?|datuk)\s+/i, '')
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((part) => part.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean);
  const candidates = [`${local}@${domain}.com.my`, ...tokens.map((token) => `${local}.${token}@${domain}.com.my`)];
  let email = candidates.find((item) => !used.has(item));
  if (!email) {
    const words = String(enquiry.business || '').toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 2);
    email = words.map((word) => `${local}.${word}@${domain}.com.my`).find((item) => !used.has(item));
  }
  if (!email) email = `${local}@${domain}.com.my`;
  used.add(email);
  return email;
}

function adForUnit(enquiry, unit, creative) {
  const use = (unit?.use || enquiry.use) === 'Office' ? 'Office' : 'Retail';
  const ads = creative.ads || [];
  const office = ads.find((ad) => /pejabat|office/i.test(ad));
  const retail = ads.find((ad) => /kedai|niaga|retail|lot kedai/i.test(ad));
  if (enquiry.campaign === 'sa' && enquiry.channel === 'fb') {
    if (use === 'Office') return ads[0];
    if (enquiry.asset === 'pas') return 'Ruang Niaga di Plaza Alam Sentral – Lokasi Utama Seksyen 14';
    return 'Lot Kedai Kompleks PKNS – Lokasi Strategik Seksyen 14';
  }
  if (use === 'Office') return office || ads[0];
  return retail || ads[ads.length - 1];
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
  const usedEmails = new Set();
  enquiries.forEach((enquiry) => {
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
    enquiry.contactDetails = { phone, email: emailFor(enquiry, usedEmails) };
    enquiry.phone = phone;
    enquiry.email = enquiry.contactDetails.email;
    enquiry.consent = { given: true, via: consentVia(enquiry.source), at: enquiry.receivedAt };
    const creative = enquiry.campaign && enquiry.channel ? AD_CREATIVES[enquiry.campaign]?.[enquiry.channel] : null;
    if (creative) {
      rng.pick(creative.ads);
      const ad = adForUnit(enquiry, unit, creative);
      enquiry.attribution = { adSet: creative.adSet, ad };
      enquiry.ad = ad;
    }
    if (enquiry.source === 'Website form') {
      const slug = UTM_CAMPAIGN[enquiry.campaign] || `${enquiry.campaign || 'web'}-2026`;
      enquiry.attribution = { ...(enquiry.attribution || {}), utm: `utm_source=facebook&utm_campaign=${slug}` };
    }
    if (preferredContact === 'WhatsApp' && enquiry.firstResponseAt) {
      const count = rng.int(3, 6);
      const officerLines = [
        `Lot ${enquiry.lot} masih kosong. Boleh saya hantar kad kadar?`,
        `Hi, this is PKNS leasing. ${enquiry.lot} is available to view this week.`,
        `Terima kasih atas pertanyaan anda. Saya semak kekosongan lot ${enquiry.lot}.`,
        `We can hold a viewing on a weekday morning if that suits you.`,
      ];
      const enquirerLines = [
        message,
        'Baik, boleh hantar butiran melalui WhatsApp.',
        'Can we visit on a weekday morning?',
        'Saya semak dengan rakan kongsi dahulu.',
        'Please send the floor plan as well.',
        'Terima kasih. Saya akan balas selepas mesyuarat.',
      ];
      enquiry.whatsapp = Array.from({ length: count }, (_, i) => {
        const from = i % 2 === 0 ? 'officer' : 'enquirer';
        const lines = from === 'officer' ? officerLines : enquirerLines;
        return {
          from,
          at: enquiry.firstResponseAt,
          text: lines[Math.floor(i / 2) % lines.length],
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
  attachZoneData(enquiries);
  return { asAt: AS_AT, months: MONTHS, assets: ASSETS, officers: OFFICERS, units, signed, campaigns, enquiries, website, social, visitors };
}

export { lastDayOf, monthOf, daysBetween };

import { CHANNELS, HERO, LEASING_OCT, AS_AT } from './config.js';
import { daysBetween, lastDayOf } from './generate.js';

const sum = (a) => a.reduce((s, v) => s + v, 0);
const HERO_STAGE_RANK = { none: -1, New: 0, Contacted: 1, Qualified: 2, 'Viewing Scheduled': 3, Negotiation: 4, Signed: 5 };

// What the live storyline adds on top of the generated data.
export function heroEffects(heroStage) {
  const rank = HERO_STAGE_RANK[heroStage ?? 'none'] ?? -1;
  return { enquiry: rank >= 0 ? 1 : 0, viewing: rank >= 3 ? 1 : 0, signed: rank >= 5 ? 1 : 0, lotStatus: rank >= 5 ? 'Occupied' : rank >= 4 ? 'Reserved' : 'Vacant' };
}

export function inRange(d, from, to) {
  return (!from || d >= from) && (!to || d <= to);
}

// Channel rows for a campaign over a date range. Hero effects land on SA Sentral, Facebook lead ads, on the as-at date.
export function campaignChannels(c, signedList, { from, to } = {}, heroStage) {
  const fx = heroEffects(heroStage);
  return CHANNELS.map((ch) => {
    const d = c.daily[ch.id];
    const idx = c.days.map((day, i) => (inRange(day, from, to) ? i : -1)).filter((i) => i >= 0);
    const pick = (arr) => sum(idx.map((i) => arr[i]));
    const row = { channel: ch.id, name: ch.name, spend: pick(d.spend), impressions: pick(d.imp), clicks: pick(d.clicks), enquiries: pick(d.enq), viewings: pick(d.views), signed: pick(d.signed) };
    row.firstYearValue = sum(signedList.filter((s) => s.campaign === c.id && s.channel === ch.id && inRange(s.date, from, to)).map((s) => s.rent * 12));
    if (c.id === HERO.campaign && ch.id === HERO.channel && inRange(AS_AT, from, to)) {
      row.enquiries += fx.enquiry; row.viewings += fx.viewing; row.signed += fx.signed; row.firstYearValue += fx.signed * HERO.rent * 12;
    }
    return withRatios(row);
  });
}

export function withRatios(row) {
  return {
    ...row,
    cpl: row.enquiries ? row.spend / row.enquiries : null,
    costPerViewing: row.viewings ? row.spend / row.viewings : null,
    costPerSigned: row.signed ? row.spend / row.signed : null,
    roas: row.spend ? row.firstYearValue / row.spend : null,
    ctr: row.impressions ? row.clicks / row.impressions : null,
  };
}

export function totalRow(rows) {
  const keys = ['spend', 'impressions', 'clicks', 'enquiries', 'viewings', 'signed', 'firstYearValue'];
  const t = Object.fromEntries(keys.map((k) => [k, sum(rows.map((r) => r[k] || 0))]));
  return withRatios(t);
}

export function unitStatus(u, heroStage) {
  if (u.asset === HERO.asset && u.lot === HERO.lot) return heroEffects(heroStage).lotStatus;
  return u.status;
}

export function statusCounts(units, heroStage) {
  const c = { Occupied: 0, Reserved: 0, Vacant: 0, 'Under redevelopment': 0 };
  for (const u of units) c[unitStatus(u, heroStage)] += 1;
  const lettable = units.length - c['Under redevelopment'];
  return { ...c, total: units.length, occupancy: lettable ? c.Occupied / lettable : null };
}

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function daysVacant(u, heroStage) {
  const st = unitStatus(u, heroStage);
  if ((st === 'Vacant' || st === 'Reserved') && u.vacantSince) return daysBetween(u.vacantSince, AS_AT);
  return null;
}

export function medianDaysVacant(units, heroStage) {
  return median(units.map((u) => daysVacant(u, heroStage)).filter((v) => v != null));
}

export function leasingKpis(units, heroStage) {
  const leased = units.filter((u) => unitStatus(u, heroStage) === 'Occupied' && u.leaseExpiry && u.rent);
  const totalRent = sum(leased.map((u) => u.rent));
  const yearsLeft = (u) => Math.max(0, daysBetween(AS_AT, u.leaseExpiry) / 365.25);
  const wale = sum(leased.map((u) => yearsLeft(u) * u.rent)) / totalRent;
  const bucket = (u) => (u.leaseExpiry <= '2026-12-31' ? 'Nov–Dec 2026' : u.leaseExpiry <= '2027-12-31' ? '2027' : '2028 and later');
  const expiry = {};
  for (const u of leased) expiry[bucket(u)] = (expiry[bucket(u)] || 0) + u.rent;
  const expiryPct = Object.fromEntries(['Nov–Dec 2026', '2027', '2028 and later'].map((k) => [k, (expiry[k] || 0) / totalRent]));
  const retail = leased.filter((u) => u.trade);
  const retailRent = sum(retail.map((u) => u.rent));
  const trade = {};
  for (const u of retail) trade[u.trade] = (trade[u.trade] || 0) + u.rent;
  const tradePct = Object.fromEntries(Object.entries(trade).map(([k, v]) => [k, v / retailRent]));
  const rentNext12 = sum(leased.filter((u) => u.leaseExpiry <= '2027-10-31').map((u) => u.rent)) / totalRent;
  return {
    wale, expiryPct, tradePct, rentNext12, monthlyContractedRent: totalRent,
    medianDaysVacant: medianDaysVacant(units, heroStage),
    renewalRate: LEASING_OCT.renewed / LEASING_OCT.expiring, ...LEASING_OCT,
  };
}

export function medianFirstResponseHours(enquiries) {
  const mins = enquiries.filter((e) => e.firstResponseAt).map((e) => (new Date(e.firstResponseAt) - new Date(e.receivedAt)) / 60000);
  return median(mins) / 60;
}

export function occupancyAtMonthEnd(units, month) {
  const end = lastDayOf(month);
  let occ = 0, lettable = 0;
  for (const u of units) {
    if (u.status === 'Under redevelopment') continue;
    lettable += 1;
    if (u.status === 'Occupied' && (!u.signedDate || u.signedDate <= end)) occ += 1;
  }
  return occ / lettable;
}

import { CHANNELS, LEASING_OCT, AS_AT, ZONES, WITHDRAWN_STAGE } from './config.js';
import { daysBetween, lastDayOf } from './generate.js';
import { workingMinutesBetween } from '../time.js';

const sum = (a) => a.reduce((s, v) => s + v, 0);

export { workingMinutesBetween };

export function inRange(d, from, to) {
  return (!from || d >= from) && (!to || d <= to);
}

// Channel rows for a campaign over a date range.
// Spend, impressions and clicks come from the campaign's daily arrays. Enquiries, viewings, signed and first-year value
// are COUNTED FROM THE ENQUIRY RECORDS in the store (including the hero and anything moved during the demo), so every
// dashboard number can be traced to the records behind it. `to` defaults to the demo clock, never a fixed date.
export function campaignChannels(c, records, { from, to } = {}) {
  const list = records || [];
  return CHANNELS.map((ch) => {
    const d = c.daily[ch.id];
    const idx = c.days.map((day, i) => (inRange(day, from, to) ? i : -1)).filter((i) => i >= 0);
    const pick = (arr) => sum(idx.map((i) => arr[i]));
    const mine = list.filter((r) => r.campaign === c.id && r.channel === ch.id);
    const day = (iso) => iso && iso.slice(0, 10);
    const signedRecs = mine.filter((r) => r.stage === 'Signed' && inRange(day(r.signedAt), from, to));
    const row = {
      channel: ch.id, name: ch.name, spend: pick(d.spend), impressions: pick(d.imp), clicks: pick(d.clicks),
      enquiries: mine.filter((r) => inRange(day(r.receivedAt), from, to)).length,
      viewings: mine.filter((r) => r.viewingHeld && inRange(day(r.viewingAt), from, to)).length,
      signed: signedRecs.length,
      firstYearValue: sum(signedRecs.map((r) => r.rent * 12)),
    };
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

// A unit's status follows its records: Negotiation holds it Reserved; Signed makes it Let until the lease starts,
// then Occupied. "Occupied" means the tenant is in. Units with no live record keep their register status.
export function unitStatus(u, records, now) {
  const list = records || [];
  const clock = (now || AS_AT).slice(0, 10);
  const r = list.find((x) => x.unitId === u.id && (x.stage === 'Signed' || x.stage === 'Negotiation') && (x.stage !== 'Signed' || x.leaseStart || u.leaseStart));
  if (r && r.stage === 'Negotiation') return 'Reserved';
  if (r && r.stage === 'Signed') return (r.leaseStart || u.leaseStart) > clock ? 'Let' : 'Occupied';
  return u.status;
}

// Occupancy = tenants in place. Committed occupancy also counts leases signed but not started.
export function statusCounts(units, records, now) {
  const c = { Occupied: 0, Let: 0, Reserved: 0, Vacant: 0, 'Under redevelopment': 0 };
  for (const u of units) c[unitStatus(u, records, now)] += 1;
  const lettable = units.length - c['Under redevelopment'];
  return { ...c, total: units.length, lettable, occupancy: lettable ? c.Occupied / lettable : null, committedOccupancy: lettable ? (c.Occupied + c.Let) / lettable : null };
}

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function daysVacant(u, records, now) {
  const st = unitStatus(u, records, now);
  const clock = (now || AS_AT).slice(0, 10);
  if ((st === 'Vacant' || st === 'Reserved') && u.vacantSince) return daysBetween(u.vacantSince, clock);
  return null;
}

export function medianDaysVacant(units, records, now) {
  return median(units.map((u) => daysVacant(u, records, now)).filter((v) => v != null));
}

export function leasingKpis(units, records, now) {
  const clock = (now || AS_AT).slice(0, 10);
  const leased = units.filter((u) => unitStatus(u, records, now) === 'Occupied' && u.leaseExpiry && u.rent);
  const totalRent = sum(leased.map((u) => u.rent));
  const yearsLeft = (u) => Math.max(0, daysBetween(clock, u.leaseExpiry) / 365.25);
  const wale = totalRent ? sum(leased.map((u) => yearsLeft(u) * u.rent)) / totalRent : null;
  const bucket = (u) => (u.leaseExpiry <= '2026-12-31' ? 'Nov–Dec 2026' : u.leaseExpiry <= '2027-12-31' ? '2027' : '2028 and later');
  const expiry = {};
  for (const u of leased) expiry[bucket(u)] = (expiry[bucket(u)] || 0) + u.rent;
  const expiryPct = Object.fromEntries(['Nov–Dec 2026', '2027', '2028 and later'].map((k) => [k, totalRent ? (expiry[k] || 0) / totalRent : null]));
  const retail = leased.filter((u) => u.trade);
  const retailRent = sum(retail.map((u) => u.rent));
  const trade = {};
  for (const u of retail) trade[u.trade] = (trade[u.trade] || 0) + u.rent;
  const tradePct = Object.fromEntries(Object.entries(trade).map(([k, v]) => [k, retailRent ? v / retailRent : null]));
  const rentNext12 = totalRent ? sum(leased.filter((u) => u.leaseExpiry <= '2027-10-31').map((u) => u.rent)) / totalRent : null;
  return {
    wale, expiryPct, tradePct, rentNext12, monthlyContractedRent: totalRent,
    medianDaysVacant: medianDaysVacant(units, records, now),
    renewalRate: LEASING_OCT.renewed / LEASING_OCT.expiring, ...LEASING_OCT,
  };
}

export function medianFirstResponseHours(enquiries, { from, to } = {}) {
  const mins = enquiries.filter((e) => e.firstResponseAt && inRange(e.receivedAt.slice(0, 10), from, to)).map((e) => workingMinutesBetween(e.receivedAt, e.firstResponseAt));
  return median(mins) / 60;
}

export function withinOneWorkingHourShare(enquiries, { from, to } = {}) {
  const mins = enquiries.filter((e) => e.firstResponseAt && inRange(e.receivedAt.slice(0, 10), from, to)).map((e) => workingMinutesBetween(e.receivedAt, e.firstResponseAt));
  if (!mins.length) return null;
  return mins.filter((m) => m <= 60).length / mins.length;
}

export function occupancyAtMonthEnd(units, month) {
  const end = lastDayOf(month);
  let occ = 0, lettable = 0;
  for (const u of units) {
    if (u.status === 'Under redevelopment') continue;
    lettable += 1;
    if ((u.status === 'Occupied' || u.status === 'Let') && (!u.leaseStart || !u.signedDate || u.leaseStart <= end)) occ += 1;
  }
  return occ / lettable;
}

export function zoneOf(stage) {
  if (stage === WITHDRAWN_STAGE) return 'withdrawn';
  const zone = ZONES.find((item) => item.stages.includes(stage));
  return zone ? zone.id : 'withdrawn';
}

// Live selectors. Screens should memoise these with useMemo on `data` and `state`.
// Every figure is computed here or in metrics.js. Pass live state in; do not copy numbers into components.

import {
  HERO, AS_AT, CHANNELS, PIPELINE_STAGES, LEASING_BY_MONTH, MONTHS, WEBSITE_OCT, TOP_POSTS, OFFICERS, AD_CREATIVES,
} from './config.js';
import { allocate, ymd, addDays, dateUTC, daysBetween } from './rng.js';
import { lastDayOf } from './generate.js';
import {
  heroEffects, inRange, campaignChannels, withRatios, totalRow, unitStatus, statusCounts,
  leasingKpis, medianDaysVacant, medianFirstResponseHours, occupancyAtMonthEnd, daysVacant,
} from './metrics.js';

const OPEN_STAGES = PIPELINE_STAGES.filter((s) => s !== 'Signed' && s !== 'Lost');
const PAID_CHANNELS = new Set(['fb', 'ig', 'gads', 'boost']);
const PAGE_ASSETS = {
  'kpsa-fb': ['kpsa'],
  'sacc-fb': ['sacc'],
  'pas-fb': ['pas'],
  'pas-ig': ['pas'],
  'bangi-fb': ['bangi'],
  'mu-fb': ['mu', 'mu2'],
};

function norm(state) {
  const s = state || {};
  return {
    heroStage: s.heroStage ?? null,
    heroReceivedAt: s.heroReceivedAt ?? null,
    heroLog: s.heroLog || [],
    heroSigned: s.heroSigned ?? null,
    moves: s.moves || {},
    notes: s.notes || {},
    followUps: s.followUps || {},
    officers: s.officers || {},
    customTypes: s.customTypes || [],
    customAssets: s.customAssets || [],
    flash: s.flash || 0,
  };
}

function ratio(n, d) {
  return d ? n / d : null;
}

function leaseExpiryFrom(start) {
  const d = dateUTC(start);
  const exp = new Date(Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate()));
  return ymd(addDays(exp, -1));
}

function monthRange(month) {
  return { from: `${month}-01`, to: lastDayOf(month) };
}

function previousMonth(month) {
  const keys = MONTHS.map((m) => m.key);
  const i = keys.indexOf(month);
  return i > 0 ? keys[i - 1] : null;
}

function singleMonth(range) {
  if (!range?.from || !range?.to) return null;
  const month = range.from.slice(0, 7);
  if (range.from === `${month}-01` && range.to === lastDayOf(month)) return month;
  return null;
}

function pair(current, previous) {
  const change = current == null || previous == null ? null : current - previous;
  return { current, previous: previous ?? null, change };
}

function covers(campaign, assetId) {
  return Object.prototype.hasOwnProperty.call(campaign.assets, assetId);
}

function filterChannels(rows, channels) {
  if (!channels) return rows;
  const list = Array.isArray(channels) ? channels : [channels];
  if (!list.length) return rows;
  return rows.filter((r) => list.includes(r.channel));
}

function splitChannelRows(rows, campaign, assetId) {
  const ids = Object.keys(campaign.assets);
  const weights = ids.map((id) => campaign.assets[id]);
  const idx = ids.indexOf(assetId);
  return rows.map((r) => ({
    ...r,
    spend: allocate(r.spend, weights)[idx],
    impressions: allocate(r.impressions, weights)[idx],
    clicks: allocate(r.clicks, weights)[idx],
    enquiries: allocate(r.enquiries, weights)[idx],
    viewings: allocate(r.viewings, weights)[idx],
    signed: 0,
    firstYearValue: 0,
  }));
}

// Enquiry and viewing effects land on the hero asset only. Signed value is applied from liveSigned.
function addHeroActivity(rows, campaign, state, range, assetId) {
  const fx = heroEffects(state.heroStage);
  if (campaign.id !== HERO.campaign || !fx.enquiry) return rows;
  if (assetId && assetId !== HERO.asset) return rows;
  if (!inRange(AS_AT, range.from, range.to)) return rows;
  return rows.map((r) => (r.channel === HERO.channel
    ? withRatios({ ...r, enquiries: r.enquiries + fx.enquiry, viewings: r.viewings + fx.viewing })
    : r));
}

// campaignChannels prices the hero at HERO.rent. Use the confirmed rent when the dialog captured one.
function adjustHeroRent(rows, campaign, state, range) {
  const fx = heroEffects(state.heroStage);
  if (!fx.signed || campaign.id !== HERO.campaign || !inRange(AS_AT, range.from, range.to)) return rows;
  const rent = state.heroSigned?.rent ?? HERO.rent;
  const delta = (rent - HERO.rent) * 12;
  if (!delta) return rows;
  return rows.map((r) => (r.channel === HERO.channel
    ? withRatios({ ...r, firstYearValue: r.firstYearValue + delta })
    : r));
}

export function liveAssets(data, state) {
  const s = norm(state);
  return [...data.assets, ...s.customAssets];
}

export function liveUnits(data, state) {
  const s = norm(state);
  const byUnit = new Map();
  for (const e of data.enquiries) {
    const mv = s.moves[e.id];
    if (!mv || (mv.stage !== 'Negotiation' && mv.stage !== 'Signed') || !e.unitId) continue;
    byUnit.set(e.unitId, mv);
  }
  return data.units.map((u) => {
    if (u.asset === HERO.asset && u.lot === HERO.lot) {
      const status = heroEffects(s.heroStage).lotStatus;
      if (s.heroStage === 'Signed') {
        const rent = s.heroSigned?.rent ?? HERO.rent;
        const leaseStart = s.heroSigned?.start ?? HERO.signedTerms.start;
        return {
          ...u,
          status,
          rent,
          leaseStart,
          leaseExpiry: leaseExpiryFrom(leaseStart),
          signedDate: AS_AT,
          signedId: 'T-HERO',
        };
      }
      return status === u.status ? u : { ...u, status };
    }
    const mv = byUnit.get(u.id);
    if (!mv) return u;
    if (mv.stage === 'Negotiation') return { ...u, status: 'Reserved' };
    return {
      ...u,
      status: 'Occupied',
      rent: mv.rent ?? u.rent,
      leaseStart: mv.start || u.leaseStart || null,
      leaseExpiry: mv.start ? leaseExpiryFrom(mv.start) : u.leaseExpiry,
      signedDate: AS_AT,
    };
  });
}

function heroRecord(data, s) {
  if (!s.heroStage) return null;
  const unit = data.units.find((u) => u.asset === HERO.asset && u.lot === HERO.lot);
  const receivedAt = s.heroReceivedAt || `${AS_AT}T00:00:00+08:00`;
  const history = s.heroLog.length
    ? s.heroLog.map((h) => [h.stage, h.at])
    : [[s.heroStage, receivedAt]];
  const notes = s.notes[HERO.id] || [];
  const noteTimes = notes.map((n) => n.at).filter(Boolean).sort();
  const lostEntry = [...s.heroLog].reverse().find((h) => h.lostReason);
  const officer = s.officers[HERO.id] || HERO.officer;
  const nextFollowUp = Object.prototype.hasOwnProperty.call(s.followUps, HERO.id) ? s.followUps[HERO.id] : null;
  return {
    id: HERO.id,
    hero: true,
    business: HERO.business,
    contact: HERO.contact,
    title: HERO.title,
    phone: HERO.phone,
    email: HERO.email,
    source: HERO.source,
    channel: HERO.channel,
    contactChannel: 'Facebook lead form',
    campaign: HERO.campaign,
    asset: HERO.asset,
    unitId: unit?.id || `${HERO.asset}:${HERO.lot}`,
    lot: HERO.lot,
    use: HERO.use,
    size: HERO.size,
    psf: HERO.psf,
    rent: HERO.rent,
    confirmedRent: s.heroStage === 'Signed' ? (s.heroSigned?.rent ?? HERO.rent) : null,
    stage: s.heroStage,
    officer,
    receivedAt,
    firstResponseAt: noteTimes[0] || null,
    history,
    nextFollowUp,
    lostReason: lostEntry?.lostReason || null,
    ad: HERO.ad,
    preferredSize: HERO.preferredSize,
    budget: HERO.budget,
    notes,
    log: [],
    signedId: s.heroStage === 'Signed' ? 'T-HERO' : null,
    leadForm: {
      businessType: 'services',
      spaceType: 'Office',
      preferredSize: '1,000–1,500 sq ft',
      budget: 'Up to RM3,500 a month',
      moveIn: 'December 2026',
      preferredContact: 'WhatsApp',
      message: 'Saya mencari pejabat sekitar 1,200 kaki persegi di Shah Alam untuk 8 staf. Boleh atur lawatan minggu ini?',
    },
    contactDetails: { phone: HERO.phone, email: HERO.email },
    consent: { given: true, via: 'Lead form', at: receivedAt },
    attribution: { adSet: AD_CREATIVES.sa.fb.adSet, ad: HERO.ad },
    whatsapp: noteTimes[0] ? [
      { from: 'officer', at: noteTimes[0], text: 'Encik Faizal, saya Aina. Lot 4-07 di SA Sentral masih kosong.' },
      { from: 'enquirer', at: noteTimes[0], text: 'Saya mencari pejabat sekitar 1,200 kaki persegi di Shah Alam untuk 8 staf. Boleh atur lawatan minggu ini?' },
      { from: 'officer', at: noteTimes[0], text: 'Boleh. Saya cadangkan lawatan minggu ini.' },
    ] : [],
  };
}

export function liveEnquiries(data, state) {
  const s = norm(state);
  const rows = data.enquiries.map((e) => {
    const mv = s.moves[e.id];
    const hasNotes = Object.prototype.hasOwnProperty.call(s.notes, e.id);
    const hasOfficer = Object.prototype.hasOwnProperty.call(s.officers, e.id);
    const hasFollow = Object.prototype.hasOwnProperty.call(s.followUps, e.id);
    if (!mv && !hasNotes && !hasOfficer && !hasFollow) return e;
    const notes = hasNotes ? s.notes[e.id] : [];
    const officer = hasOfficer ? s.officers[e.id] : e.officer;
    const nextFollowUp = hasFollow ? s.followUps[e.id] : e.nextFollowUp;
    let firstResponseAt = e.firstResponseAt;
    if (!firstResponseAt && notes.length) {
      const times = notes.map((n) => n.at).filter(Boolean).sort();
      firstResponseAt = times[0] || null;
    }
    return {
      ...e,
      stage: mv ? mv.stage : e.stage,
      history: mv ? [...e.history, [mv.stage, mv.at || AS_AT]] : e.history,
      officer,
      nextFollowUp,
      lostReason: mv?.lostReason || e.lostReason,
      rent: mv?.stage === 'Signed' && mv.rent != null ? mv.rent : e.rent,
      notes,
      firstResponseAt,
    };
  });
  const hero = heroRecord(data, s);
  return hero ? [hero, ...rows] : rows;
}

export function liveSigned(data, state) {
  const s = norm(state);
  const extra = [];
  if (heroEffects(s.heroStage).signed) {
    extra.push({
      id: 'T-HERO',
      hero: true,
      campaign: HERO.campaign,
      channel: HERO.channel,
      asset: HERO.asset,
      use: HERO.use,
      rent: s.heroSigned?.rent ?? HERO.rent,
      date: AS_AT,
      lot: HERO.lot,
      unitId: `${HERO.asset}:${HERO.lot}`,
    });
  }
  for (const e of data.enquiries) {
    const mv = s.moves[e.id];
    if (!mv || mv.stage !== 'Signed' || e.stage === 'Signed') continue;
    if (!e.channel || !e.campaign || !PAID_CHANNELS.has(e.channel)) continue;
    extra.push({
      id: `T-LIVE-${e.id}`,
      liveGenerated: true,
      campaign: e.campaign,
      channel: e.channel,
      asset: e.asset,
      use: e.use || null,
      rent: mv.rent ?? e.rent,
      date: AS_AT,
      lot: e.lot,
      unitId: e.unitId,
    });
  }
  return [...data.signed, ...extra];
}

export function campaignRows(data, state, campaignId, opts = {}) {
  const s = norm(state);
  const { from, to, channels, assetId } = opts;
  const campaign = data.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return [];
  if (assetId && !covers(campaign, assetId)) return [];
  const range = { from, to };

  if (assetId) {
    let rows = splitChannelRows(campaignChannels(campaign, data.signed, range, null), campaign, assetId);
    const signed = liveSigned(data, s).filter((rec) => rec.asset === assetId && rec.campaign === campaign.id && inRange(rec.date, from, to));
    rows = rows.map((r) => {
      const add = signed.filter((rec) => rec.channel === r.channel);
      const firstYearValue = add.reduce((sum, rec) => sum + rec.rent * 12, 0);
      return withRatios({ ...r, signed: add.length, firstYearValue });
    });
    return filterChannels(addHeroActivity(rows, campaign, s, range, assetId), channels);
  }

  const liveGen = liveSigned(data, s).filter((rec) => rec.liveGenerated);
  let rows = campaignChannels(campaign, [...data.signed, ...liveGen], range, s.heroStage);
  rows = rows.map((r) => {
    const add = liveGen.filter((rec) => rec.campaign === campaign.id && rec.channel === r.channel && inRange(rec.date, from, to));
    if (!add.length) return r;
    return withRatios({ ...r, signed: r.signed + add.length });
  });
  return filterChannels(adjustHeroRent(rows, campaign, s, range), channels);
}

export function unpaidInRange(campaign, range = {}, assetId = null) {
  const { from, to } = range;
  const ids = Object.keys(campaign.assets);
  const weights = ids.map((id) => campaign.assets[id]);
  const idx = assetId ? ids.indexOf(assetId) : -1;
  const bySource = {};
  let total = 0;
  for (const [src, arr] of Object.entries(campaign.unpaidDaily || {})) {
    let n = 0;
    campaign.days.forEach((d, i) => {
      if (inRange(d, from, to)) n += arr[i];
    });
    const part = idx >= 0 ? allocate(n, weights)[idx] : n;
    bySource[src] = part;
    total += part;
  }
  return { total, bySource };
}

function campaignsInScope(data, { campaignId, assetId }) {
  return data.campaigns.filter((c) => {
    if (campaignId && c.id !== campaignId) return false;
    if (assetId && !covers(c, assetId)) return false;
    return true;
  });
}

export function assetMarketing(data, state, assetId, range = {}) {
  const s = norm(state);
  const { from, to } = range;
  const pieces = [];
  const byCampaign = [];
  let unpaid = 0;
  const unpaidBySource = {};
  for (const c of data.campaigns) {
    if (!covers(c, assetId)) continue;
    const rows = campaignRows(data, s, c.id, { from, to, assetId });
    const t = totalRow(rows);
    const u = unpaidInRange(c, { from, to }, assetId);
    unpaid += u.total;
    for (const [src, n] of Object.entries(u.bySource)) unpaidBySource[src] = (unpaidBySource[src] || 0) + n;
    pieces.push(t);
    byCampaign.push({ id: c.id, name: c.name, short: c.short, ...t, unpaid: u.total, unpaidBySource: u.bySource });
  }
  return { assetId, ...totalRow(pieces), unpaid, unpaidBySource, byCampaign };
}

function rentExpiring(units, heroStage) {
  const leased = units.filter((u) => unitStatus(u, heroStage) === 'Occupied' && u.leaseExpiry && u.rent);
  if (!leased.length) return null;
  return leasingKpis(units, heroStage).rentNext12;
}

function isEventSpace(asset) {
  return asset.type === 'Event space' || Array.isArray(asset.spaces);
}

export function portfolioRows(data, state, month = '2026-10') {
  const s = norm(state);
  const range = monthRange(month);
  const units = liveUnits(data, s);
  const enquiries = liveEnquiries(data, s);
  const rows = liveAssets(data, s).map((asset) => {
    if (isEventSpace(asset)) {
      return {
        id: asset.id,
        name: asset.name,
        short: asset.short,
        type: asset.type,
        location: asset.location,
        area: asset.area,
        entity: asset.entity,
        grouping: asset.grouping,
        note: asset.note || null,
        eventSpace: true,
        statusText: 'Priced per day',
        units: null,
        spaces: asset.spaces?.length || 0,
        occupied: null,
        reserved: null,
        vacant: null,
        redev: null,
        occupancy: null,
        lettable: null,
        medianDaysVacant: null,
        paidEnquiries: 0,
        viewings: 0,
        openPipeline: enquiries.filter((e) => e.asset === asset.id && OPEN_STAGES.includes(e.stage)).length,
        spend: 0,
        cpl: null,
        signed: 0,
        firstYearValue: 0,
        roas: null,
        rentExpiringNext12: null,
      };
    }
    const assetUnits = units.filter((u) => u.asset === asset.id);
    const counts = statusCounts(assetUnits, s.heroStage);
    const marketing = assetMarketing(data, s, asset.id, range);
    const redevOnly = counts.total > 0 && counts['Under redevelopment'] === counts.total;
    return {
      id: asset.id,
      name: asset.name,
      short: asset.short,
      type: asset.type,
      location: asset.location,
      area: asset.area,
      entity: asset.entity,
      grouping: asset.grouping,
      note: asset.note || null,
      eventSpace: false,
      statusText: redevOnly ? 'Under redevelopment' : null,
      units: counts.total,
      spaces: null,
      occupied: counts.Occupied,
      reserved: counts.Reserved,
      vacant: counts.Vacant,
      redev: counts['Under redevelopment'],
      occupancy: counts.occupancy,
      lettable: counts.total - counts['Under redevelopment'],
      medianDaysVacant: medianDaysVacant(assetUnits, s.heroStage),
      paidEnquiries: marketing.enquiries,
      viewings: marketing.viewings,
      openPipeline: enquiries.filter((e) => e.asset === asset.id && OPEN_STAGES.includes(e.stage)).length,
      spend: marketing.spend,
      cpl: marketing.cpl,
      signed: marketing.signed,
      firstYearValue: marketing.firstYearValue,
      roas: marketing.roas,
      rentExpiringNext12: rentExpiring(assetUnits, s.heroStage),
    };
  });
  const counts = statusCounts(units, s.heroStage);
  const marketing = totalRow(rows.filter((r) => !r.eventSpace).map((r) => ({
    spend: r.spend,
    impressions: 0,
    clicks: 0,
    enquiries: r.paidEnquiries,
    viewings: r.viewings,
    signed: r.signed,
    firstYearValue: r.firstYearValue,
  })));
  const kpis = leasingKpis(units, s.heroStage);
  rows.push({
    total: true,
    id: 'total',
    name: 'Total',
    eventSpace: false,
    assets: rows.length,
    eventSpaces: rows.filter((r) => r.eventSpace).reduce((sum, r) => sum + (r.spaces || 0), 0),
    units: counts.total,
    occupied: counts.Occupied,
    reserved: counts.Reserved,
    vacant: counts.Vacant,
    redev: counts['Under redevelopment'],
    occupancy: counts.occupancy,
    lettable: counts.total - counts['Under redevelopment'],
    medianDaysVacant: medianDaysVacant(units, s.heroStage),
    paidEnquiries: marketing.enquiries,
    viewings: marketing.viewings,
    openPipeline: rows.reduce((sum, r) => sum + (r.openPipeline || 0), 0),
    spend: marketing.spend,
    cpl: marketing.cpl,
    signed: marketing.signed,
    firstYearValue: marketing.firstYearValue,
    roas: marketing.roas,
    rentExpiringNext12: kpis.rentNext12,
    newLeases: marketing.signed,
  });
  return rows;
}

export const LEASE_WINDOWS = ['≤3 months', '3–12 months', '>12 months', 'none'];

// ≤3 months ends 31 Jan 2027 (as-at + 3 months). 3–12 months ends 31 Oct 2027, the same bound as rent expiring next 12 months.
export function leaseExpiryWindow(unit) {
  const expiry = unit?.leaseExpiry;
  if (!expiry) return 'none';
  if (expiry <= '2027-01-31') return '≤3 months';
  if (expiry <= '2027-10-31') return '3–12 months';
  return '>12 months';
}

function floorsTopToBottom(asset, units) {
  const listed = [];
  for (const group of asset.mix || []) {
    for (const floor of group.floors || []) {
      if (!listed.includes(floor)) listed.push(floor);
    }
  }
  const known = new Set(listed);
  const extra = [];
  for (const unit of units) {
    if (!known.has(unit.floor) && !extra.includes(unit.floor)) extra.push(unit.floor);
  }
  const order = [...listed.slice().reverse(), ...extra];
  const byLot = (a, b) => String(a.lot).localeCompare(String(b.lot), 'en', { numeric: true });
  return order
    .map((floor) => ({
      floor,
      units: units.filter((unit) => unit.floor === floor).slice().sort(byLot),
    }))
    .filter((row) => row.units.length);
}

export function assetDetail(data, state, assetId) {
  const s = norm(state);
  const asset = liveAssets(data, s).find((item) => item.id === assetId) || null;
  if (!asset) return null;
  const eventSpace = isEventSpace(asset);
  const units = liveUnits(data, s).filter((unit) => unit.asset === asset.id);
  const enquiries = liveEnquiries(data, s).filter((enquiry) => enquiry.asset === asset.id);
  const open = enquiries.filter((enquiry) => OPEN_STAGES.includes(enquiry.stage));
  const counts = eventSpace ? null : statusCounts(units, s.heroStage);
  const nla = eventSpace || !units.length ? null : units.reduce((sum, unit) => sum + (Number(unit.size) || 0), 0);
  const marketing = assetMarketing(data, s, asset.id, {});
  const campaign = data.campaigns.find((item) => item.short && item.short === asset.grouping) || null;
  const openFor = (unit) => open.filter((enquiry) => enquiry.unitId === unit.id || enquiry.lot === unit.lot);
  const campaignName = marketing.byCampaign.map((item) => item.short).filter(Boolean).join(', ') || null;
  const enrich = (unit) => {
    const matches = openFor(unit);
    return {
      ...unit,
      status: unitStatus(unit, s.heroStage),
      daysVacant: daysVacant(unit, s.heroStage),
      openEnquiries: matches.length,
      openEnquiryIds: matches.map((enquiry) => enquiry.id),
      leaseWindow: leaseExpiryWindow(unit),
      campaign: campaignName,
    };
  };
  const enriched = units.map(enrich);
  return {
    asset,
    eventSpace,
    counts,
    nla,
    spaceCount: asset.spaces?.length || 0,
    medianDaysVacant: eventSpace ? null : medianDaysVacant(units, s.heroStage),
    officer: OFFICERS[asset.officer] || null,
    campaign,
    marketing,
    units: enriched,
    floors: eventSpace ? [] : floorsTopToBottom(asset, enriched),
    openEnquiries: open,
    enquiries,
    spaces: (asset.spaces || []).map((space) => ({ ...space })),
  };
}

export function visitorSummary(data, assetId, range = {}) {
  const { from, to } = range;
  const days = data.visitors?.days || [];
  const spend = data.visitors?.spend || [];
  const spendByDate = new Map(days.map((day, index) => [day, spend[index] || 0]));
  const daily = (data.visitors?.byAsset?.[assetId] || [])
    .filter((day) => inRange(day.date, from, to))
    .map((day) => {
      const dow = dateUTC(day.date).getUTCDay();
      return {
        date: day.date,
        visitors: day.total,
        main: day.main,
        car: day.car,
        side: day.side,
        spend: spendByDate.get(day.date) || 0,
        weekend: dow === 0 || dow === 6,
      };
    });
  const total = daily.reduce((sum, day) => sum + day.visitors, 0);
  const main = daily.reduce((sum, day) => sum + day.main, 0);
  const car = daily.reduce((sum, day) => sum + day.car, 0);
  const side = daily.reduce((sum, day) => sum + day.side, 0);
  const weekdays = daily.filter((day) => !day.weekend);
  const weekends = daily.filter((day) => day.weekend);
  const average = (list) => (list.length ? list.reduce((sum, day) => sum + day.visitors, 0) / list.length : null);
  const share = (part) => (total ? part / total : null);
  return {
    assetId,
    daily,
    total,
    weekdayAverage: average(weekdays),
    weekendAverage: average(weekends),
    totalShare: total ? 1 : null,
    entrances: [
      { name: 'Main', visitors: main, share: share(main) },
      { name: 'Car park', visitors: car, share: share(car) },
      { name: 'Side', visitors: side, share: share(side) },
    ],
  };
}

export function filteredEnquiries(data, state, filters = {}) {
  const s = norm(state);
  let list = liveEnquiries(data, s);
  const asset = filters.asset || filters.assetId || '';
  const campaign = filters.campaign || filters.campaignId || '';
  if (asset) list = list.filter((e) => e.asset === asset);
  if (campaign) list = list.filter((e) => e.campaign === campaign);
  if (filters.source) list = list.filter((e) => e.source === filters.source);
  if (filters.officer) list = list.filter((e) => e.officer === filters.officer);
  if (filters.channel) list = list.filter((e) => e.channel === filters.channel);
  return list;
}

export function pipelineSummary(data, state, filters = {}) {
  const list = filteredEnquiries(data, state, filters);
  const counts = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, 0]));
  let openValue = 0;
  for (const e of list) {
    counts[e.stage] = (counts[e.stage] || 0) + 1;
    if (OPEN_STAGES.includes(e.stage)) openValue += e.rent || 0;
  }
  const open = OPEN_STAGES.reduce((sum, stage) => sum + (counts[stage] || 0), 0);
  return { counts, open, openValue, total: list.length };
}

function scaleMix(total, mix) {
  const names = Object.keys(mix);
  const counts = allocate(total, names.map((name) => mix[name]));
  return names.map((name, i) => ({ name, sessions: counts[i] }));
}

function scalePages(rangeSessions) {
  const pages = WEBSITE_OCT.topPages;
  const octTotal = pages.reduce((sum, page) => sum + page[1], 0);
  const scaled = Math.round(octTotal * rangeSessions / WEBSITE_OCT.sessions);
  const counts = allocate(scaled, pages.map((page) => page[1]));
  return pages.map((page, i) => ({ name: page[0], sessions: counts[i] }));
}

function usersInRange(data, from, to) {
  let users = 0;
  for (const [month, monthUsers] of Object.entries(data.website.usersMonthly)) {
    const start = `${month}-01`;
    const end = lastDayOf(month);
    if (from && end < from) continue;
    if (to && start > to) continue;
    const full = (!from || from <= start) && (!to || to >= end);
    if (full) {
      users += monthUsers;
      continue;
    }
    const monthSessions = data.website.monthly[month] || 0;
    let inRangeSessions = 0;
    data.website.days.forEach((d, i) => {
      if (d.slice(0, 7) === month && inRange(d, from, to)) inRangeSessions += data.website.sessions[i];
    });
    users += monthSessions ? Math.round(monthUsers * inRangeSessions / monthSessions) : 0;
  }
  return users;
}

function websiteBlock(data, range, filtered) {
  const { from, to } = range;
  const days = [];
  const dailySessions = [];
  data.website.days.forEach((d, i) => {
    if (inRange(d, from, to)) {
      days.push(d);
      dailySessions.push(data.website.sessions[i]);
    }
  });
  const sessions = dailySessions.reduce((sum, n) => sum + n, 0);
  return {
    wholeSite: true,
    filteredLabel: filtered ? 'Whole site · not filtered by asset or campaign' : null,
    sessions,
    users: usersInRange(data, from, to),
    sources: scaleMix(sessions, WEBSITE_OCT.sources),
    days,
    dailySessions,
    topPages: scalePages(sessions),
  };
}

function pageVisible(page, assetId) {
  if (!assetId) return true;
  if (page.id.startsWith('pkns-')) return true;
  const assets = PAGE_ASSETS[page.id];
  return assets ? assets.includes(assetId) : false;
}

function endMonthInRange(range) {
  const month = singleMonth(range);
  if (month) return month;
  const to = range.to || AS_AT;
  return to.slice(0, 7);
}

export function organicEngagements(reach, erPercent) {
  return Math.round(reach * (erPercent / 100));
}

function socialRows(data, range, assetId) {
  const month = singleMonth(range);
  const prev = month ? previousMonth(month) : null;
  const shownMonth = endMonthInRange(range);
  return data.social.filter((page) => pageVisible(page, assetId)).map((page) => {
    let reach = 0;
    page.days.forEach((d, i) => {
      if (inRange(d, range.from, range.to)) reach += page.reach[i];
    });
    const followers = page.followersByMonth[shownMonth] ?? page.followers;
    const followerChange = month && prev && page.followersByMonth[prev] != null
      ? page.followersByMonth[month] - page.followersByMonth[prev]
      : null;
    return {
      id: page.id,
      page: page.page,
      platform: page.platform,
      followers,
      followerChange,
      reach,
      engagements: organicEngagements(reach, page.er),
      er: page.er,
    };
  });
}

function topPostsFor(channel) {
  if (!channel) return TOP_POSTS.map((p) => ({ ...p }));
  if (channel === 'fb') return TOP_POSTS.filter((p) => p.channel === 'Facebook').map((p) => ({ ...p }));
  if (channel === 'ig') return TOP_POSTS.filter((p) => p.channel === 'Instagram').map((p) => ({ ...p }));
  if (channel === 'boost') return TOP_POSTS.filter((p) => p.boosted > 0).map((p) => ({ ...p }));
  return [];
}

export function marketingSummary(data, state, filters = {}) {
  const s = norm(state);
  const assetId = filters.assetId || filters.asset || null;
  const campaignId = filters.campaignId || filters.campaign || null;
  const channel = filters.channel || null;
  const ranged = filters.from !== undefined || filters.to !== undefined;
  const from = ranged ? filters.from : '2026-10-01';
  const to = ranged ? filters.to : '2026-10-31';
  const range = { from, to };
  const scope = campaignsInScope(data, { campaignId, assetId });

  const allPieces = [];
  for (const c of scope) allPieces.push(...campaignRows(data, s, c.id, { from, to, assetId: assetId || undefined }));
  const pieces = channel ? allPieces.filter((r) => r.channel === channel) : allPieces;
  const paid = totalRow(pieces);
  const paidScope = totalRow(allPieces);

  let unpaidTotal = 0;
  const unpaidBySource = {};
  for (const c of scope) {
    const u = unpaidInRange(c, range, assetId || null);
    unpaidTotal += u.total;
    for (const [src, n] of Object.entries(u.bySource)) unpaidBySource[src] = (unpaidBySource[src] || 0) + n;
  }

  const byChannel = CHANNELS
    .filter((ch) => !channel || ch.id === channel)
    .map((ch) => ({ channel: ch.id, name: ch.name, ...totalRow(allPieces.filter((r) => r.channel === ch.id)) }));

  const gads = byChannel.find((r) => r.channel === 'gads') || totalRow([]);
  const google = {
    ...gads,
    cpc: gads.clicks ? gads.spend / gads.clicks : null,
    conversions: gads.enquiries || 0,
    costPerConversion: gads.cpl ?? null,
    campaigns: scope
    .map((c) => {
      const row = campaignRows(data, s, c.id, { from, to, assetId: assetId || undefined, channels: ['gads'] })[0];
      if (!row || (channel && channel !== 'gads')) return null;
      return {
        id: c.id,
        name: c.name,
        short: c.short,
        ...row,
        cpc: row.clicks ? row.spend / row.clicks : null,
        conversions: row.enquiries,
        costPerConversion: row.cpl,
      };
    })
    .filter(Boolean),
  };

  const paidSocial = ['fb', 'ig', 'boost']
    .filter((id) => !channel || channel === id)
    .map((id) => {
      const ch = CHANNELS.find((c) => c.id === id);
      return { channel: id, name: ch.name, ...totalRow(pieces.filter((r) => r.channel === id)) };
    });

  const social = socialRows(data, range, assetId);
  return {
    range,
    assetId,
    campaignId,
    channel,
    paid,
    paidScope,
    byChannel,
    google,
    paidSocial,
    unpaid: { total: unpaidTotal, bySource: unpaidBySource },
    ownedToPaid: ratio(unpaidTotal, paidScope.enquiries),
    website: websiteBlock(data, range, Boolean(assetId || campaignId)),
    social,
    engagements: social.reduce((sum, page) => sum + page.engagements, 0),
    topPosts: topPostsFor(channel),
  };
}

function countsAtMonthEnd(units, month) {
  const end = lastDayOf(month);
  const c = { Occupied: 0, Reserved: 0, Vacant: 0, 'Under redevelopment': 0 };
  for (const u of units) {
    if (u.status === 'Under redevelopment') {
      c['Under redevelopment'] += 1;
      continue;
    }
    const occupiedThen = u.status === 'Occupied' && (!u.signedDate || u.signedDate <= end);
    if (occupiedThen) c.Occupied += 1;
    else if (u.status === 'Reserved') c.Reserved += 1;
    else c.Vacant += 1;
  }
  return c;
}

function sourceCounts(summary) {
  const byId = Object.fromEntries(summary.byChannel.map((r) => [r.channel, r.enquiries]));
  return {
    'Facebook lead ads': byId.fb || 0,
    Instagram: byId.ig || 0,
    'Google Ads': byId.gads || 0,
    'Boosted posts': byId.boost || 0,
    'Website form': summary.unpaid.bySource['Website form'] || 0,
    'Walk-in': summary.unpaid.bySource['Walk-in'] || 0,
    Referral: summary.unpaid.bySource.Referral || 0,
  };
}

export function reportBlocks(data, state, month) {
  const s = norm(state);
  const prev = previousMonth(month);
  const current = marketingSummary(data, s, monthRange(month));
  const previous = prev ? marketingSummary(data, s, monthRange(prev)) : null;
  const leasing = LEASING_BY_MONTH[month];
  const leasingPrev = prev ? LEASING_BY_MONTH[prev] : null;
  const unitsNow = liveUnits(data, s);
  const liveCounts = statusCounts(unitsNow, s.heroStage);
  const occupancy = month === '2026-10' ? liveCounts.occupancy : occupancyAtMonthEnd(data.units, month);
  const occupancyPrev = prev ? occupancyAtMonthEnd(data.units, prev) : null;
  const vacant = month === '2026-10' ? liveCounts.Vacant : countsAtMonthEnd(data.units, month).Vacant;
  const vacantPrev = prev ? countsAtMonthEnd(data.units, prev).Vacant : null;
  const newLeases = (m) => liveSigned(data, s).filter((rec) => rec.date.slice(0, 7) === m).length;
  const response = (summaryMonth) => {
    const list = liveEnquiries(data, s).filter((e) => (e.receivedAt || '').slice(0, 7) === summaryMonth);
    const hours = medianFirstResponseHours(list);
    return Number.isFinite(hours) ? hours : null;
  };
  const flow = (summary) => summary && ({
    enquiryToViewing: ratio(summary.paid.viewings, summary.paid.enquiries),
    viewingToSigned: ratio(summary.paid.signed, summary.paid.viewings),
    enquiryToLease: ratio(summary.paid.signed, summary.paid.enquiries),
    ownedToPaid: summary.ownedToPaid,
  });
  const curFlow = flow(current);
  const prevFlow = flow(previous);
  const web = (m) => websiteBlock(data, monthRange(m), false);
  const soc = (m) => socialRows(data, monthRange(m), null);
  const webCur = web(month);
  const webPrev = prev ? web(prev) : null;
  const socCur = soc(month);
  const socPrev = prev ? soc(prev) : null;
  const snapshot = month === '2026-10' ? leasingKpis(unitsNow, s.heroStage) : null;
  const topPost = TOP_POSTS.slice().sort((a, b) => b.reach - a.reach)[0];

  return {
    month,
    previousMonth: prev,
    block1: {
      occupancy: pair(occupancy, occupancyPrev),
      vacant: pair(vacant, vacantPrev),
      newLeases: pair(newLeases(month), prev ? newLeases(prev) : null),
      expiring: pair(leasing.expiring, leasingPrev ? leasingPrev.expiring : null),
      renewed: pair(leasing.renewed, leasingPrev ? leasingPrev.renewed : null),
      renewalRate: pair(
        ratio(leasing.renewed, leasing.expiring),
        leasingPrev ? ratio(leasingPrev.renewed, leasingPrev.expiring) : null,
      ),
      reversionPct: pair(leasing.reversionPct, leasingPrev ? leasingPrev.reversionPct : null),
      snapshot: snapshot ? {
        medianDaysVacant: snapshot.medianDaysVacant,
        wale: snapshot.wale,
        expiryPct: snapshot.expiryPct,
        rentNext12: snapshot.rentNext12,
        tradePct: snapshot.tradePct,
      } : null,
      future: ['Footfall', 'Tenant sales psf'],
    },
    block2: {
      spend: pair(current.paid.spend, previous?.paid.spend),
      paidEnquiries: pair(current.paid.enquiries, previous?.paid.enquiries),
      viewings: pair(current.paid.viewings, previous?.paid.viewings),
      signed: pair(current.paid.signed, previous?.paid.signed),
      firstYearValue: pair(current.paid.firstYearValue, previous?.paid.firstYearValue),
      cpl: pair(current.paid.cpl, previous?.paid.cpl),
      costPerViewing: pair(current.paid.costPerViewing, previous?.paid.costPerViewing),
      costPerSigned: pair(current.paid.costPerSigned, previous?.paid.costPerSigned),
      roas: pair(current.paid.roas, previous?.paid.roas),
      enquiryToViewing: pair(curFlow.enquiryToViewing, prevFlow?.enquiryToViewing),
      viewingToSigned: pair(curFlow.viewingToSigned, prevFlow?.viewingToSigned),
      enquiryToLease: pair(curFlow.enquiryToLease, prevFlow?.enquiryToLease),
      bySource: { current: sourceCounts(current), previous: previous ? sourceCounts(previous) : null },
      medianFirstResponse: pair(response(month), prev ? response(prev) : null),
      ownedToPaid: pair(curFlow.ownedToPaid, prevFlow?.ownedToPaid),
      unpaid: pair(current.unpaid.total, previous?.unpaid.total),
    },
    block3: {
      sessions: pair(webCur.sessions, webPrev?.sessions),
      users: pair(webCur.users, webPrev?.users),
      sources: { current: webCur.sources, previous: webPrev?.sources || null },
      pages: socCur.map((page) => ({
        ...page,
        previousFollowers: socPrev?.find((p) => p.id === page.id)?.followers ?? null,
        previousReach: socPrev?.find((p) => p.id === page.id)?.reach ?? null,
      })),
      engagements: pair(
        socCur.reduce((sum, page) => sum + page.engagements, 0),
        socPrev ? socPrev.reduce((sum, page) => sum + page.engagements, 0) : null,
      ),
      topPost,
    },
  };
}

export function contactLog(data, state, enquiryId) {
  const s = norm(state);
  const enquiry = liveEnquiries(data, s).find((e) => e.id === enquiryId);
  if (!enquiry) return [];
  const generated = (enquiry.log || []).map((entry) => ({ ...entry }));
  const live = (s.notes[enquiryId] || []).map((n) => ({
    type: n.type,
    text: n.text,
    at: n.at,
    by: n.by,
    live: true,
  }));
  const time = (entry) => {
    const t = new Date(entry.at).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  return [...generated, ...live].sort((a, b) => time(a) - time(b));
}

function mondayOf(iso) {
  const d = dateUTC(iso);
  const dow = d.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return ymd(addDays(d, -back));
}

// Monday–Sunday buckets. Partial first and last weeks keep the dates that fall inside the range.
export function campaignWeeks(data, state, campaignId, range = {}) {
  const s = norm(state);
  const campaign = data.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return [];
  const from = range.from || campaign.start;
  const to = range.to || campaign.end;
  const buckets = new Map();
  campaign.days.forEach((day, i) => {
    if (!inRange(day, from, to)) return;
    const start = mondayOf(day);
    let bucket = buckets.get(start);
    if (!bucket) {
      bucket = { start, first: day, last: day, spend: 0, enquiries: 0 };
      buckets.set(start, bucket);
    }
    if (day < bucket.first) bucket.first = day;
    if (day > bucket.last) bucket.last = day;
    for (const ch of CHANNELS) {
      const daily = campaign.daily[ch.id];
      bucket.spend += daily.spend[i] || 0;
      bucket.enquiries += daily.enq[i] || 0;
    }
  });
  const fx = heroEffects(s.heroStage);
  if (campaign.id === HERO.campaign && fx.enquiry && inRange(AS_AT, from, to)) {
    const start = mondayOf(AS_AT);
    const bucket = buckets.get(start);
    if (bucket) bucket.enquiries += fx.enquiry;
    else buckets.set(start, { start, first: AS_AT, last: AS_AT, spend: 0, enquiries: fx.enquiry });
  }
  return [...buckets.values()].sort((a, b) => a.start.localeCompare(b.start)).map((bucket) => {
    const sunday = ymd(addDays(dateUTC(bucket.start), 6));
    return { ...bucket, partial: bucket.first !== bucket.start || bucket.last !== sunday };
  });
}

// Step rates sit between the bars: each rate is this step ÷ the previous step.
export function funnelSteps(row) {
  const impressions = row?.impressions || 0;
  const clicks = row?.clicks || 0;
  const enquiries = row?.enquiries || 0;
  const viewings = row?.viewings || 0;
  const signed = row?.signed || 0;
  return [
    { id: 'impressions', label: 'Impressions', value: impressions, rate: null },
    { id: 'clicks', label: 'Clicks', value: clicks, rate: ratio(clicks, impressions) },
    { id: 'enquiries', label: 'Paid enquiries', value: enquiries, rate: ratio(enquiries, clicks) },
    { id: 'viewings', label: 'Viewings', value: viewings, rate: ratio(viewings, enquiries) },
    { id: 'signed', label: 'Signed', value: signed, rate: ratio(signed, viewings) },
  ];
}

export function daysInStage(enquiry) {
  if (!enquiry) return null;
  const history = enquiry.history || [];
  const current = [...history].reverse().find((entry) => entry[0] === enquiry.stage);
  const entered = current ? current[1] : enquiry.receivedAt;
  if (!entered) return null;
  return daysBetween(String(entered).slice(0, 10), AS_AT);
}

export function firstResponseMinutes(enquiry) {
  if (!enquiry?.firstResponseAt || !enquiry.receivedAt) return null;
  const minutes = (new Date(enquiry.firstResponseAt) - new Date(enquiry.receivedAt)) / 60000;
  if (!Number.isFinite(minutes)) return null;
  return Math.max(0, Math.round(minutes));
}

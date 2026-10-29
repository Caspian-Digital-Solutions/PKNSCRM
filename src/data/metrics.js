import { AS_OF } from './config.js';
import { addDays } from './rng.js';

export const FORMULAS = {
  ampSpend: 'Sum of spend line amounts in the filter scope.',
  activations: 'Activations with status Completed or Reported whose end date falls in the period.',
  attendance: 'Sum of activation attendance for activations that overlap the period.',
  newProfiles: 'Profiles whose first seen date falls in the period.',
  database: 'Total profiles in the asset scope with first seen on or before the end of the period.',
  consented: 'Profiles with marketing opt-in, counted and shown as a percentage of database size.',
  costAttendee: 'AMP spend on activations ÷ total attendance.',
  costProfile: 'AMP spend ÷ new profiles.',
  costLead: 'AMP spend ÷ profiles tagged with that lead type in the period.',
  returning: 'Returning profiles ÷ (new profiles + returning profiles).',
  rating: 'Mean of survey ratings, weighted by the number of responses.',
  utilisation: 'Actual spend in overlapping 2026 quarters ÷ approved budget for those quarters.',
  engagement: 'Engagements ÷ reach.',
};

export const QUARTERS = [
  { id: 'Q1', from: '2026-01-01', to: '2026-03-31' },
  { id: 'Q2', from: '2026-04-01', to: '2026-06-30' },
  { id: 'Q3', from: '2026-07-01', to: '2026-09-30' },
  { id: 'Q4', from: '2026-10-01', to: '2026-12-31' },
];

export function inRange(iso, from, to) {
  const day = String(iso || '').slice(0, 10);
  return day >= from && day <= to;
}

export function overlaps(start, end, from, to) {
  return start <= to && end >= from;
}

export function monthKey(iso) {
  return String(iso || '').slice(0, 7);
}

export function monthsBetween(from, to) {
  const out = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const end = monthKey(to);
  while (`${year}-${String(month).padStart(2, '0')}` <= end) {
    out.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) { month = 1; year += 1; }
  }
  return out;
}

export function safeDiv(num, den) {
  const top = Number(num);
  const bottom = Number(den);
  if (!bottom || !Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  return top / bottom;
}

export function channelMatch(profile, channels) {
  if (!channels.length) return true;
  return channels.includes(profile.sourceChannelFirst) || (profile.socialNetwork && channels.includes(profile.socialNetwork));
}

export function assetMatch(profile, assetIds, unrestricted) {
  if (unrestricted) return true;
  return (profile.assetIds || []).some((id) => assetIds.includes(id));
}

export function budgetAmount(budgets, edits, assetId, from, to) {
  return QUARTERS.reduce((sum, quarter) => {
    if (quarter.from > to || quarter.to < from) return sum;
    const key = `2026|${assetId}|${quarter.id}`;
    if (edits && edits[key] != null && edits[key] !== '') return sum + Number(edits[key] || 0);
    const row = budgets.find((item) => item.assetId === assetId && item.quarter === quarter.id && item.year === 2026);
    return sum + (row?.approvedRM || 0);
  }, 0);
}

export function spendTotal(lines) {
  return lines.reduce((sum, line) => sum + (Number(line.amountRM) || 0), 0);
}

export function activationFigures(activations, spendLines) {
  const ids = new Set(activations.map((act) => act.id));
  const linkedSpend = spendLines.filter((line) => line.activationId && ids.has(line.activationId));
  const attendance = activations.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0);
  const fresh = activations.reduce((sum, act) => sum + (act.outcomes?.newProfiles || 0), 0);
  const returning = activations.reduce((sum, act) => sum + (act.outcomes?.returningProfiles || 0), 0);
  let weight = 0;
  let rated = 0;
  for (const act of activations) {
    const n = act.outcomes?.surveyResponses || 0;
    if (!n || act.outcomes.avgRating == null) continue;
    weight += n;
    rated += n * act.outcomes.avgRating;
  }
  return {
    attendance,
    newFromActivations: fresh,
    returning,
    returningRate: safeDiv(returning, fresh + returning),
    avgRating: weight ? rated / weight : null,
    activationSpend: spendTotal(linkedSpend),
    costPerAttendee: safeDiv(spendTotal(linkedSpend), attendance),
    completed: activations.filter((act) => (act.status === 'Completed' || act.status === 'Reported')).length,
  };
}

export function profileStats(profiles, from, to, mode) {
  let database = 0;
  let fresh = 0;
  let consented = 0;
  let engaged = 0;
  const leads = {};
  for (const profile of profiles) {
    if (profile.firstSeen <= to) database += 1;
    if (inRange(profile.firstSeen, from, to)) fresh += 1;
    const active = profile.firstSeen <= to && profile.lastSeen >= from;
    if (active) engaged += 1;
    const opted = profile.consent?.marketingOptIn && !profile.consent.unknown && !profile.anonymised;
    if (opted && profile.consent.consentDate <= to && profile.firstSeen <= to) consented += 1;
    if (active) {
      for (const lead of profile.leadTypes || []) leads[lead] = (leads[lead] || 0) + 1;
    }
    void mode;
  }
  return { database, fresh, consented, engaged, leads, consentPct: safeDiv(consented, database) };
}

export function upcomingWindow() {
  return { from: addDays(new Date(`${AS_OF}T00:00:00Z`), 1).toISOString().slice(0, 10), to: addDays(new Date(`${AS_OF}T00:00:00Z`), 30).toISOString().slice(0, 10) };
}

export function costPerLead(spend, count) {
  return safeDiv(spend, count);
}

export function engagementRate(engagements, reach) {
  return safeDiv(engagements, reach);
}

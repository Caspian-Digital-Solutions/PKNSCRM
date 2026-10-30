import { AGE_BANDS, ASSET_COLOURS, CHILD_BANDS, LEAD_TYPES, SOURCE_CHANNELS } from './config.js';
import { monthKey, monthsBetween, safeDiv } from './metrics.js';

export const HOUSEHOLDS = ['Single', 'Couple', 'Family with kids', 'Multi-generational'];

export function householdType(profile) {
  const kids = (profile.childrenCount || 0) > 0;
  const size = Number(profile.householdSize) || (kids ? 3 : 1);
  if (kids && size >= 5) return 'Multi-generational';
  if (kids) return 'Family with kids';
  if (size <= 1) return 'Single';
  if (size === 2) return 'Couple';
  return 'Multi-generational';
}

export function tally(list, pick, order) {
  const map = new Map((order || []).map((name) => [name, 0]));
  for (const item of list) {
    const raw = pick(item);
    const keys = Array.isArray(raw) ? raw : [raw];
    for (const key of keys) {
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  const rows = [...map.entries()].map(([name, value]) => ({ name, value }));
  if (order) return order.map((name) => rows.find((row) => row.name === name) || { name, value: 0 });
  return rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name)));
}

export function audiencePack(people, from, to, assets) {
  const months = monthsBetween(from, to);
  const channelOf = (profile) => (SOURCE_CHANNELS.includes(profile.sourceChannelFirst) ? profile.sourceChannelFirst : 'Manual entry');
  const base = Object.fromEntries(SOURCE_CHANNELS.map((name) => [name, 0]));
  for (const profile of people) {
    if (profile.firstSeen < months[0]) base[channelOf(profile)] += 1;
  }
  const cumulative = [];
  const cursor = { ...base };
  for (const month of months) {
    for (const profile of people) {
      if (monthKey(profile.firstSeen) === month) cursor[channelOf(profile)] += 1;
    }
    cumulative.push({ month, ...cursor });
  }
  const fresh = people.filter((profile) => profile.firstSeen >= from && profile.firstSeen <= to);
  const returning = people.filter((profile) => profile.firstSeen < from && profile.lastSeen >= from);
  const consented = people.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
  const families = people.filter((profile) => profile.childrenCount > 0);
  const activations = people.reduce((sum, profile) => sum + (profile.totalActivationsAttended || 0), 0);
  const spark = (pick) => months.map((month) => people.filter((profile) => pick(profile, month)).length);
  const depth = ['1', '2', '3', '4', '5', '6+'].map((name) => ({
    name,
    value: people.filter((profile) => {
      const n = profile.totalActivationsAttended || 0;
      if (name === '6+') return n >= 6;
      return n === Number(name);
    }).length,
  }));
  return {
    months,
    total: people.length,
    fresh: fresh.length,
    returning: returning.length,
    consented: consented.length,
    consentPct: safeDiv(consented.length, people.length),
    familiesPct: safeDiv(families.length, people.length),
    avgActivations: people.length ? activations / people.length : null,
    sparks: {
      total: spark((profile, month) => profile.firstSeen.slice(0, 7) <= month),
      fresh: spark((profile, month) => monthKey(profile.firstSeen) === month),
      returning: spark((profile, month) => profile.firstSeen.slice(0, 7) < month && profile.lastSeen.slice(0, 7) >= month),
      consented: spark((profile, month) => profile.consent?.marketingOptIn && profile.firstSeen.slice(0, 7) <= month),
      families: spark((profile, month) => profile.childrenCount > 0 && profile.firstSeen.slice(0, 7) <= month),
      avg: months.map(() => (people.length ? activations / people.length : 0)),
    },
    growth: cumulative,
    consent: [
      { name: 'Opted in', value: consented.length, colour: '#10B981' },
      { name: 'Not opted in', value: people.filter((profile) => !profile.consent?.unknown && !profile.consent?.marketingOptIn).length, colour: '#9CA3AF' },
      { name: 'Consent unknown', value: people.filter((profile) => profile.consent?.unknown).length, colour: '#F59E0B' },
    ],
    age: tally(people, (profile) => profile.ageBand, AGE_BANDS),
    gender: tally(people, (profile) => profile.gender, ['Female', 'Male', 'Prefer not to say']),
    household: tally(people, householdType, HOUSEHOLDS),
    leads: tally(people, (profile) => profile.leadTypes, LEAD_TYPES),
    children: tally(people.filter((profile) => profile.childrenCount > 0), (profile) => profile.childrenAgeBands, CHILD_BANDS),
    interests: tally(people, (profile) => profile.interests).slice(0, 9),
    areas: tally(people, (profile) => profile.area).slice(0, 10),
    depth,
    assets: (assets || []).map((asset) => ({
      name: asset.shortCode || asset.name,
      fullName: asset.name,
      value: people.filter((profile) => (profile.assetIds || []).includes(asset.id)).length,
      colour: ASSET_COLOURS[asset.id],
      id: asset.id,
    })),
  };
}

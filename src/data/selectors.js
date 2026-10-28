import { ROLES } from '../access.js';
import { rangeFor, previousRange, splitList } from '../filters.js';
import { SOURCE_CHANNELS } from './config.js';
import {
  liveActivations, liveAssets, liveAudit, liveBudgets, liveForms, liveImports, liveOperators,
  liveProfiles, liveSegments, liveSpend,
} from './live.js';
import {
  budgetAmount, channelMatch, costPerLead, engagementRate, inRange, monthsBetween,
  overlaps, profileStats, safeDiv, spendTotal, activationFigures, FORMULAS, monthKey, upcomingWindow,
} from './metrics.js';

function allowedAssetIds(data, state) {
  const assets = liveAssets(data, state);
  if (state.role === 'operator') {
    const role = ROLES.operator;
    const operator = liveOperators(data, state).find((item) => item.id === role.operatorId);
    return (operator?.assetIds || []).filter((id) => assets.some((asset) => asset.id === id));
  }
  return assets.map((asset) => asset.id);
}

export function parseScope(data, state, search) {
  const range = rangeFor(search || {});
  const prev = previousRange(range.from, range.to);
  const assets = liveAssets(data, state);
  const allowed = allowedAssetIds(data, state);
  let assetIds = splitList(search?.asset);
  if (!assetIds.length) assetIds = allowed.slice();
  else assetIds = assetIds.filter((id) => allowed.includes(id));
  const operatorIds = splitList(search?.operator);
  if (operatorIds.length) {
    const fromOps = assets.filter((asset) => operatorIds.includes(asset.operatorId || '')).map((asset) => asset.id);
    assetIds = assetIds.filter((id) => fromOps.includes(id));
  }
  const unrestricted = !search?.asset && !operatorIds.length && state.role !== 'operator';
  return {
    ...range,
    prev,
    assetIds,
    allowed,
    unrestricted,
    operatorIds,
    types: splitList(search?.type),
    channels: splitList(search?.channel),
    assets,
  };
}

function activationIn(act, scope, from, to, { dateMode }) {
  if (!scope.assetIds.includes(act.assetId)) return false;
  if (scope.types.length && !scope.types.includes(act.type)) return false;
  if (dateMode === 'end') return inRange(act.endDate, from, to);
  if (dateMode === 'upcoming') return act.startDate >= from && act.startDate <= to;
  if (dateMode === 'none') return true;
  return overlaps(act.startDate, act.endDate, from, to);
}

export function filterProfiles(profiles, scope, from, to, { stock = false } = {}) {
  const out = [];
  for (const profile of profiles) {
    if (profile.anonymised) continue;
    if (!(profile.assetIds || []).some((id) => scope.assetIds.includes(id))) continue;
    if (!channelMatch(profile, scope.channels)) continue;
    if (stock ? profile.firstSeen <= to : (profile.firstSeen <= to && profile.lastSeen >= from)) out.push(profile);
  }
  return out;
}

function channelOk(act, scope, spend) {
  if (!scope.channels.length) return true;
  if (scope.channels.some((channel) => (act.captureChannels || []).includes(channel))) return true;
  return spend.some((line) => line.activationId === act.id && scope.channels.includes(line.channel));
}

function spendIn(line, scope, from, to, activationsById) {
  if (!scope.assetIds.includes(line.assetId)) return false;
  if (!inRange(line.date, from, to)) return false;
  if (scope.types.length) {
    if (!line.activationId) return false;
    const act = activationsById.get(line.activationId);
    if (!act || !scope.types.includes(act.type)) return false;
  }
  if (scope.channels.length) {
    const digital = scope.channels.includes(line.channel);
    const act = line.activationId ? activationsById.get(line.activationId) : null;
    const capture = act && scope.channels.some((channel) => (act.captureChannels || []).includes(channel));
    if (!digital && !capture) return false;
  }
  return true;
}

function withCapture(activations, profiles) {
  const map = new Map();
  for (const profile of profiles) {
    for (const link of profile.links || []) {
      let bucket = map.get(link.activationId);
      if (!bucket) map.set(link.activationId, bucket = new Set());
      bucket.add(profile.sourceChannelFirst);
      if (profile.socialNetwork) bucket.add(profile.socialNetwork);
    }
  }
  return activations.map((act) => ({ ...act, captureChannels: [...(map.get(act.id) || [])] }));
}

function kpisFor(scope, from, to, activations, spend, profiles, budgets, edits) {
  const overlapping = activations.filter((act) => activationIn(act, scope, from, to, { dateMode: 'overlap' }) && channelOk(act, scope, spend));
  const completed = activations.filter((act) => activationIn(act, scope, from, to, { dateMode: 'end' }) && (act.status === 'Completed' || act.status === 'Reported') && channelOk(act, scope, spend));
  const lines = spend.filter((line) => spendIn(line, scope, from, to, new Map(activations.map((act) => [act.id, act]))));
  const figures = activationFigures(overlapping, lines);
  const stats = profileStats(profiles.filter((profile) => channelMatch(profile, scope.channels) && (scope.unrestricted || (profile.assetIds || []).some((id) => scope.assetIds.includes(id)))), from, to);
  const ampSpend = spendTotal(lines);
  const budget = scope.assetIds.reduce((sum, id) => sum + budgetAmount(budgets, edits, id, from, to), 0);
  const budgetSpend = lines.filter((line) => line.date >= '2026-01-01' && line.date <= '2026-12-31').reduce((sum, line) => sum + line.amountRM, 0);
  return {
    ampSpend,
    activationsCompleted: completed.length,
    attendance: figures.attendance,
    newProfiles: stats.fresh,
    database: stats.database,
    consented: stats.consented,
    consentPct: stats.consentPct,
    costPerAttendee: figures.costPerAttendee,
    costPerNewProfile: safeDiv(ampSpend, stats.fresh),
    returningRate: figures.returningRate,
    avgRating: figures.avgRating,
    budget,
    budgetSpend,
    utilisation: safeDiv(budgetSpend, budget),
    leads: stats.leads,
    costPerTenant: costPerLead(ampSpend, stats.leads['Prospective tenant'] || 0),
    costPerBuyer: costPerLead(ampSpend, stats.leads['Prospective buyer'] || 0),
    engaged: stats.engaged,
  };
}

function byAsset(scope, activations, spend, profiles, budgets, edits, from, to) {
  return scope.assets.filter((asset) => scope.assetIds.includes(asset.id)).map((asset) => {
    const acts = activations.filter((act) => act.assetId === asset.id && overlaps(act.startDate, act.endDate, from, to) && (!scope.types.length || scope.types.includes(act.type)) && channelOk(act, scope, spend));
    const lines = spend.filter((line) => line.assetId === asset.id && inRange(line.date, from, to) && (!scope.types.length || (line.activationId && acts.some((act) => act.id === line.activationId))));
    const mine = profiles.filter((profile) => (profile.assetIds || []).includes(asset.id) && channelMatch(profile, scope.channels));
    const figures = activationFigures(acts, lines);
    const fresh = mine.filter((profile) => inRange(profile.firstSeen, from, to)).length;
    const returning = figures.returning;
    const budget = budgetAmount(budgets, edits, asset.id, from, to);
    const budgetSpend = lines.filter((line) => line.date >= '2026-01-01').reduce((sum, line) => sum + line.amountRM, 0);
    const ampSpend = spendTotal(lines);
    return {
      id: asset.id,
      asset: asset.name,
      operator: asset.operatorId ? (scope.operators.find((item) => item.id === asset.operatorId)?.name || '–') : 'PKNS-run',
      activations: acts.length,
      ampSpend,
      activationSpend: figures.activationSpend,
      attendance: figures.attendance,
      newProfiles: fresh,
      returningProfiles: returning,
      costPerAttendee: figures.costPerAttendee,
      costPerNewProfile: safeDiv(ampSpend, fresh),
      avgRating: figures.avgRating,
      budget,
      utilisation: safeDiv(budgetSpend, budget),
      consented: mine.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown).length,
      tenantLeads: mine.filter((profile) => profile.firstSeen <= to && profile.lastSeen >= from && (profile.leadTypes || []).includes('Prospective tenant')).length,
      buyerLeads: mine.filter((profile) => profile.firstSeen <= to && profile.lastSeen >= from && (profile.leadTypes || []).includes('Prospective buyer')).length,
    };
  });
}

export function buildView(data, state, search) {
  const scope = parseScope(data, state, search);
  scope.operators = liveOperators(data, state);
  const profiles = liveProfiles(data, state).filter((profile) => !profile.anonymised);
  const activations = withCapture(liveActivations(data, state), profiles);
  const spend = liveSpend(data, state);
  const budgets = liveBudgets(data, state);
  const from = scope.from;
  const to = scope.to;
  const kpis = kpisFor(scope, from, to, activations, spend, profiles, budgets, state.budgetEdits);
  const prev = kpisFor(scope, scope.prev.from, scope.prev.to, activations, spend, profiles, budgets, state.budgetEdits);
  const channelActs = activations.filter((act) => activationIn(act, scope, from, to, { dateMode: 'overlap' }) && channelOk(act, scope, spend));
  const months = monthsBetween(from, to);
  const monthly = months.map((month) => {
    const start = `${month}-01`;
    const end = `${month}-31`;
    const monthActs = channelActs.filter((act) => monthKey(act.startDate) === month);
    return {
      month,
      attendance: monthActs.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0),
      newProfiles: profiles.filter((profile) => channelMatch(profile, scope.channels) && (scope.unrestricted || (profile.assetIds || []).some((id) => scope.assetIds.includes(id))) && monthKey(profile.firstSeen) === month).length,
      start,
      end,
    };
  });
  const categories = [...new Set(spend.map((line) => line.category))];
  const spendMonthly = months.map((month) => {
    const row = { month };
    for (const category of categories) {
      row[category] = spend.filter((line) => spendIn(line, scope, `${month}-01`, `${month}-31`, new Map(activations.map((act) => [act.id, act]))) && line.category === category).reduce((sum, line) => sum + line.amountRM, 0);
    }
    return row;
  });
  const growth = months.map((month) => {
    const row = { month };
    for (const source of SOURCE_CHANNELS) row[source] = 0;
    for (const profile of profiles) {
      if (monthKey(profile.firstSeen) !== month) continue;
      if (!channelMatch(profile, scope.channels)) continue;
      if (!(profile.assetIds || []).some((id) => scope.assetIds.includes(id))) continue;
      const source = SOURCE_CHANNELS.includes(profile.sourceChannelFirst) ? profile.sourceChannelFirst : 'Manual entry';
      row[source] += 1;
    }
    return row;
  });
  const window = upcomingWindow();
  const upcoming = activations.filter((act) => activationIn(act, scope, window.from, window.to, { dateMode: 'upcoming' }) && act.status !== 'Completed' && act.status !== 'Reported');
  const awaiting = activations.filter((act) => scope.assetIds.includes(act.assetId) && act.status === 'Completed' && (!scope.types.length || scope.types.includes(act.type)));
  return {
    scope,
    formulas: FORMULAS,
    kpis,
    prev,
    activations: channelActs,
    allActivations: activations,
    spend,
    profiles,
    budgets,
    forms: liveForms(data, state),
    segments: liveSegments(data, state),
    imports: liveImports(data, state),
    audit: liveAudit(data, state),
    monthly,
    spendMonthly,
    spendCategories: categories,
    growth,
    byAsset: byAsset(scope, activations, spend, profiles, budgets, state.budgetEdits, from, to),
    upcoming,
    awaiting,
    operators: scope.operators,
    assets: scope.assets,
  };
}

export function digitalRows(data, scope) {
  return data.digital.filter((row) => scope.assetIds.includes(row.assetId) && row.month >= scope.from.slice(0, 7) && row.month <= scope.to.slice(0, 7) && (!scope.channels.length || scope.channels.includes(row.channel)));
}

export function postsIn(data, scope) {
  return data.posts.filter((post) => scope.assetIds.includes(post.assetId) && inRange(post.date, scope.from, scope.to) && (!scope.channels.length || scope.channels.includes(post.channel)));
}

export function adsIn(data, scope) {
  return data.adCampaigns.filter((row) => scope.assetIds.includes(row.assetId) && `${row.month}-01` <= scope.to && `${row.month}-28` >= scope.from && (!scope.channels.length || scope.channels.includes('Google Ads')));
}

export function scopedSpend(spend, activations, scope) {
  const map = new Map(activations.map((act) => [act.id, act]));
  return spend.filter((line) => spendIn(line, scope, scope.from, scope.to, map));
}

export { engagementRate, safeDiv, spendTotal };

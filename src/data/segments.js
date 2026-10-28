function includes(list, value) {
  return (list || []).includes(value);
}

export function festiveAssetCount(profile, activationById) {
  const assets = new Set();
  for (const link of profile.links || []) {
    const act = activationById.get(link.activationId);
    if (act?.type === 'Festive') assets.add(act.assetId);
  }
  return assets.size;
}

export function activationTypesFor(profile, activationById) {
  const types = new Set();
  for (const link of profile.links || []) {
    const act = activationById.get(link.activationId);
    if (act?.type) types.add(act.type);
  }
  return types;
}

export function matchCondition(profile, condition, activationById) {
  const { field, op, value } = condition;
  if (field === 'ageBand') return profile.ageBand === value;
  if (field === 'gender') return profile.gender === value;
  if (field === 'area') return profile.area === value;
  if (field === 'postcode') return profile.postcode === value;
  if (field === 'childrenAgeBand') return includes(profile.childrenAgeBands, value);
  if (field === 'hasChildren') return (profile.childrenCount > 0) === (value === 'Yes' || value === true);
  if (field === 'interest') return includes(profile.interests, value);
  if (field === 'leadType') return includes(profile.leadTypes, value);
  if (field === 'source') return profile.sourceChannelFirst === value || profile.socialNetwork === value;
  if (field === 'legacy') return profile.importedFromLegacy === (value === 'Yes' || value === true);
  if (field === 'interestedRent') return profile.interestedRent === value;
  if (field === 'interestedBuy') return profile.interestedBuy === value;
  if (field === 'asset') return includes(profile.assetIds, value);
  if (field === 'activationType') return activationTypesFor(profile, activationById).has(value);
  if (field === 'festiveAssets') return festiveAssetCount(profile, activationById) >= Number(value);
  if (field === 'activationsAttended') {
    const n = profile.totalActivationsAttended || 0;
    if (op === 'gte') return n >= Number(value);
    if (op === 'lte') return n <= Number(value);
    return n === Number(value);
  }
  if (field === 'firstSeen') {
    if (op === 'before') return profile.firstSeen < value;
    if (op === 'after') return profile.firstSeen > value;
    return profile.firstSeen === value;
  }
  return false;
}

export function matchSegment(profile, segment, activationById) {
  const groups = segment.groups || [];
  const results = groups.map((group) => {
    const checks = (group.conditions || []).map((condition) => matchCondition(profile, condition, activationById));
    if (!checks.length) return true;
    return group.match === 'or' ? checks.some(Boolean) : checks.every(Boolean);
  });
  if (!results.length) return true;
  return segment.match === 'or' ? results.some(Boolean) : results.every(Boolean);
}

export function segmentCounts(segment, profiles, activationById) {
  let matching = 0;
  let consented = 0;
  for (const profile of profiles) {
    if (!matchSegment(profile, segment, activationById)) continue;
    matching += 1;
    if (profile.consent?.marketingOptIn && !profile.consent.unknown && !profile.anonymised) consented += 1;
  }
  return { matching, consented, excluded: matching - consented };
}

export function summariseRules(segment) {
  const parts = [];
  for (const group of segment.groups || []) {
    const bits = (group.conditions || []).map((condition) => `${condition.field} ${condition.op} ${condition.value}`);
    if (bits.length) parts.push(bits.join(group.match === 'or' ? ' OR ' : ' AND '));
  }
  return parts.join(segment.match === 'or' ? ' OR ' : ' AND ');
}

export const CONDITION_FIELDS = [
  { id: 'ageBand', label: 'Age band', ops: ['eq'], kind: 'select' },
  { id: 'gender', label: 'Gender', ops: ['eq'], kind: 'select' },
  { id: 'area', label: 'Area', ops: ['eq'], kind: 'select' },
  { id: 'postcode', label: 'Postcode', ops: ['eq'], kind: 'text' },
  { id: 'childrenAgeBand', label: 'Children age band', ops: ['includes'], kind: 'select' },
  { id: 'hasChildren', label: 'Has children', ops: ['eq'], kind: 'select' },
  { id: 'interest', label: 'Interest', ops: ['includes'], kind: 'select' },
  { id: 'leadType', label: 'Lead type', ops: ['includes'], kind: 'select' },
  { id: 'asset', label: 'Engaged with asset', ops: ['includes'], kind: 'select' },
  { id: 'activationType', label: 'Attended activation type', ops: ['includes'], kind: 'select' },
  { id: 'activationsAttended', label: 'Activations attended', ops: ['gte', 'lte'], kind: 'number' },
  { id: 'festiveAssets', label: 'Festive assets attended', ops: ['gte'], kind: 'number' },
  { id: 'firstSeen', label: 'First seen', ops: ['before', 'after'], kind: 'date' },
  { id: 'source', label: 'Source channel', ops: ['eq'], kind: 'select' },
  { id: 'interestedRent', label: 'Interested in renting', ops: ['eq'], kind: 'select' },
  { id: 'legacy', label: 'Legacy imported', ops: ['eq'], kind: 'select' },
];

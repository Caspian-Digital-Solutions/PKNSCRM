function mergeActivation(act, patch) {
  if (!patch) return act;
  return {
    ...act,
    ...patch,
    outcomes: { ...act.outcomes, ...(patch.outcomes || {}) },
    qrCodes: patch.qrCodes || act.qrCodes,
  };
}

export function liveAssets(data, state) {
  const patches = state.assetPatches || {};
  const base = data.assets.map((asset) => (patches[asset.id] ? { ...asset, ...patches[asset.id] } : asset));
  return [...base, ...(state.assetsAdded || [])];
}

export function liveOperators(data, state) {
  const patches = state.operatorPatches || {};
  const base = data.operators.map((item) => (patches[item.id] ? { ...item, ...patches[item.id], assetIds: patches[item.id].assetIds || item.assetIds } : item));
  return [...base, ...(state.operatorsAdded || [])];
}

export function liveActivations(data, state) {
  const patches = state.activationPatches || {};
  const deleted = state.activationDeleted || {};
  return [...data.activations, ...(state.activationsAdded || [])]
    .filter((act) => !deleted[act.id])
    .map((act) => mergeActivation(act, patches[act.id]));
}

export function liveSpend(data, state) {
  const patches = state.spendPatches || {};
  const deleted = state.spendDeleted || {};
  return [...data.spend, ...(state.spendAdded || [])]
    .filter((line) => !deleted[line.id])
    .map((line) => (patches[line.id] ? { ...line, ...patches[line.id] } : line));
}

export function liveQrCodes(data, state) {
  const byId = new Map();
  for (const qr of data.qrCodes || []) byId.set(qr.id, qr);
  for (const patch of Object.values(state.activationPatches || {})) {
    for (const qr of patch.qrCodes || []) byId.set(qr.id, { ...(byId.get(qr.id) || {}), ...qr });
  }
  for (const [id, patch] of Object.entries(state.qrPatches || {})) {
    const current = byId.get(id) || { id };
    byId.set(id, { ...current, ...patch, style: { ...(current.style || {}), ...(patch.style || {}) } });
  }
  return [...byId.values(), ...(state.qrAdded || [])];
}

export function liveForms(data, state) {
  const patches = state.formPatches || {};
  return [...data.forms, ...(state.formsAdded || [])].map((form) => (patches[form.id] ? { ...form, ...patches[form.id], consentBlock: { ...form.consentBlock, ...(patches[form.id].consentBlock || {}) } } : form));
}

export function liveProfiles(data, state) {
  const patches = state.profilePatches || {};
  const deleted = state.profileDeleted || {};
  const added = state.profilesAdded || [];
  if (!added.length && !Object.keys(patches).length && !Object.keys(deleted).length) return data.profiles;
  const list = [];
  for (const profile of data.profiles) {
    if (deleted[profile.id]) continue;
    const patch = patches[profile.id];
    if (!patch) list.push(profile);
    else {
      list.push({
        ...profile,
        ...patch,
        links: patch.links || profile.links,
        assetIds: patch.assetIds || profile.assetIds,
        activationIds: patch.activationIds || profile.activationIds,
        leadTypes: patch.leadTypes || profile.leadTypes,
        interests: patch.interests || profile.interests,
        childrenAgeBands: patch.childrenAgeBands || profile.childrenAgeBands,
        consent: { ...profile.consent, ...(patch.consent || {}) },
      });
    }
  }
  for (const profile of added) if (!deleted[profile.id]) list.push(profile);
  return list;
}

export function liveBudgets(data, state) {
  return data.budgets.map((row) => {
    const key = `${row.year}|${row.assetId}|${row.quarter}`;
    if (state.budgetEdits && state.budgetEdits[key] != null) return { ...row, approvedRM: Number(state.budgetEdits[key]) };
    return row;
  });
}

export function liveSegments(data, state) {
  const patches = state.segmentPatches || {};
  return [...data.segments, ...(state.segmentsAdded || [])].map((item) => (patches[item.id] ? { ...item, ...patches[item.id] } : item));
}

export function liveImports(data, state) {
  return [...(state.importsAdded || []), ...data.imports];
}

export function liveAudit(data, state) {
  return [...(state.auditExtra || []), ...data.audit];
}

export function liveUsers(data, state) {
  return [...data.users, ...(state.usersAdded || [])];
}

export function liveFields(data, state) {
  const patches = state.fieldPatches || {};
  return [...data.fields.map((field) => (patches[field.id] ? { ...field, ...patches[field.id] } : field)), ...(state.fieldsAdded || [])];
}

export function findProfile(data, state, id) {
  if (!id || state.profileDeleted?.[id]) return null;
  const patch = state.profilePatches?.[id];
  const added = (state.profilesAdded || []).find((item) => item.id === id);
  const base = added || data.profiles.find((item) => item.id === id);
  if (!base) return null;
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    links: patch.links || base.links,
    consent: { ...base.consent, ...(patch.consent || {}) },
    assetIds: patch.assetIds || base.assetIds,
    activationIds: patch.activationIds || base.activationIds,
    leadTypes: patch.leadTypes || base.leadTypes,
  };
}

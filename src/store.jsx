import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { generate } from './data/generate.js';
import { AS_OF_ISO } from './data/config.js';

const DATA = generate();
const KEY = 'pkns-amp-hub-v1';

export function freshState(role = null) {
  return {
    role,
    now: AS_OF_ISO,
    rev: 0,
    seq: 1,
    assetsAdded: [],
    assetPatches: {},
    operatorPatches: {},
    operatorsAdded: [],
    activationsAdded: [],
    activationPatches: {},
    activationDeleted: {},
    spendAdded: [],
    spendPatches: {},
    spendDeleted: {},
    formsAdded: [],
    formPatches: {},
    qrAdded: [],
    qrPatches: {},
    submissionsAdded: [],
    submissionPatches: {},
    profilesAdded: [],
    profilePatches: {},
    profileDeleted: {},
    budgetEdits: {},
    segmentsAdded: [],
    segmentPatches: {},
    importsAdded: [],
    auditExtra: [],
    usersAdded: [],
    fieldsAdded: [],
    fieldPatches: {},
    revealed: {},
    retentionMonths: 36,
    autoAnonymise: true,
    deletionRequests: [],
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return freshState();
    return { ...freshState(), ...JSON.parse(raw) };
  } catch {
    return freshState();
  }
}

function withAudit(state, entry) {
  return { ...state, auditExtra: [{ id: `AUD-L${state.seq}`, timestamp: state.now, ...entry }, ...state.auditExtra] };
}

function reducer(state, action) {
  switch (action.type) {
    case 'role':
      return withAudit({ ...state, role: action.role, seq: state.seq + 1 }, {
        userName: action.userName, role: action.roleName, action: 'Changed role', targetType: 'User', targetId: action.role, details: `Switched role to ${action.roleName}`,
      });
    case 'logout':
      return { ...state, role: null };
    case 'reset':
      return freshState(state.role);
    case 'audit':
      return withAudit({ ...state, seq: state.seq + 1 }, action.entry);
    case 'reveal':
      return withAudit({ ...state, seq: state.seq + 1, revealed: { ...state.revealed, [action.id]: true } }, action.entry);
    case 'addAsset':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, assetsAdded: [...state.assetsAdded, action.asset] };
    case 'patchAsset':
      return { ...state, rev: state.rev + 1, assetPatches: { ...state.assetPatches, [action.id]: { ...(state.assetPatches[action.id] || {}), ...action.patch } } };
    case 'patchOperator':
      return { ...state, rev: state.rev + 1, operatorPatches: { ...state.operatorPatches, [action.id]: { ...(state.operatorPatches[action.id] || {}), ...action.patch } } };
    case 'addOperator':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, operatorsAdded: [...state.operatorsAdded, action.operator] };
    case 'addActivation':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, activationsAdded: [...state.activationsAdded, action.activation] };
    case 'patchActivation':
      return {
        ...state,
        rev: state.rev + 1,
        activationPatches: { ...state.activationPatches, [action.id]: { ...(state.activationPatches[action.id] || {}), ...action.patch, outcomes: { ...(state.activationPatches[action.id]?.outcomes || {}), ...(action.patch.outcomes || {}) } } },
      };
    case 'addSpend':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, spendAdded: [...state.spendAdded, action.line] };
    case 'patchSpend':
      return { ...state, rev: state.rev + 1, spendPatches: { ...state.spendPatches, [action.id]: { ...(state.spendPatches[action.id] || {}), ...action.patch } } };
    case 'deleteSpend':
      return { ...state, rev: state.rev + 1, spendDeleted: { ...state.spendDeleted, [action.id]: true } };
    case 'addForm':
      return { ...state, rev: state.rev + 1, formsAdded: [...state.formsAdded, action.form] };
    case 'patchForm':
      return { ...state, rev: state.rev + 1, formPatches: { ...state.formPatches, [action.id]: { ...(state.formPatches[action.id] || {}), ...action.patch } } };
    case 'addQr':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, qrAdded: [...(state.qrAdded || []), action.qr] };
    case 'patchQr':
      return { ...state, rev: state.rev + 1, qrPatches: { ...(state.qrPatches || {}), [action.id]: { ...(state.qrPatches?.[action.id] || {}), ...action.patch, style: { ...(state.qrPatches?.[action.id]?.style || {}), ...(action.patch.style || {}) } } } };
    case 'patchSubmission':
      return withAudit({
        ...state,
        rev: state.rev + 1,
        seq: state.seq + 1,
        submissionPatches: { ...(state.submissionPatches || {}), [action.id]: { ...(state.submissionPatches?.[action.id] || {}), ...action.patch } },
      }, action.entry);
    case 'applySubmission': {
      const next = { ...state, rev: state.rev + 1, seq: state.seq + 1 };
      if (action.created) next.profilesAdded = [...state.profilesAdded, action.created];
      if (action.merged) next.profilePatches = { ...state.profilePatches, [action.merged.id]: action.merged.patch };
      if (action.activationId) {
        next.activationPatches = {
          ...state.activationPatches,
          [action.activationId]: {
            ...(state.activationPatches[action.activationId] || {}),
            outcomes: action.outcomes || state.activationPatches[action.activationId]?.outcomes,
            qrCodes: action.qrCodes || state.activationPatches[action.activationId]?.qrCodes,
          },
        };
      }
      if (action.formId && action.formPatch) {
        next.formPatches = { ...state.formPatches, [action.formId]: { ...(state.formPatches[action.formId] || {}), ...action.formPatch } };
      }
      if (action.qrId && action.qrPatch) {
        next.qrPatches = { ...(state.qrPatches || {}), [action.qrId]: { ...(state.qrPatches?.[action.qrId] || {}), ...action.qrPatch } };
      }
      if (action.submission) next.submissionsAdded = [action.submission, ...(state.submissionsAdded || [])];
      next.auditExtra = [{ id: `AUD-L${state.seq}`, timestamp: state.now, ...action.audit }, ...state.auditExtra];
      return next;
    }
    case 'patchProfile':
      return withAudit({
        ...state,
        rev: state.rev + 1,
        seq: state.seq + 1,
        profilePatches: { ...state.profilePatches, [action.id]: { ...(state.profilePatches[action.id] || {}), ...action.patch, consent: { ...(state.profilePatches[action.id]?.consent || {}), ...(action.patch.consent || {}) } } },
      }, action.entry);
    case 'deleteProfile':
      return withAudit({
        ...state,
        rev: state.rev + 1,
        seq: state.seq + 1,
        profileDeleted: { ...state.profileDeleted, [action.id]: true },
        deletionRequests: [{ id: `DEL-${action.id}`, profileId: action.id, requestedBy: action.entry.userName, requestedAt: '2026-10-28', status: 'Completed', note: 'Delete on request' }, ...state.deletionRequests],
      }, action.entry);
    case 'requestDeletion':
      return withAudit({
        ...state,
        seq: state.seq + 1,
        deletionRequests: [{ id: `DEL-${action.id}-${state.seq}`, profileId: action.id, requestedBy: action.entry.userName, requestedAt: '2026-10-28', status: 'Pending', note: 'Delete on request' }, ...state.deletionRequests],
      }, action.entry);
    case 'budget':
      return { ...state, rev: state.rev + 1, budgetEdits: { ...state.budgetEdits, [action.key]: action.amount } };
    case 'addSegment':
      return { ...state, rev: state.rev + 1, seq: state.seq + 1, segmentsAdded: [...state.segmentsAdded, action.segment] };
    case 'patchSegment':
      return { ...state, rev: state.rev + 1, segmentPatches: { ...state.segmentPatches, [action.id]: action.segment } };
    case 'addImport': {
      const profilePatches = { ...(state.profilePatches || {}) };
      for (const merge of action.merges || []) {
        profilePatches[merge.id] = { ...(profilePatches[merge.id] || {}), ...merge.patch };
      }
      return withAudit({
        ...state,
        rev: state.rev + 1,
        seq: state.seq + 1,
        importsAdded: [action.job, ...state.importsAdded],
        profilesAdded: [...state.profilesAdded, ...(action.profiles || [])],
        profilePatches,
      }, action.entry);
    }
    case 'addUser':
      return { ...state, usersAdded: [...state.usersAdded, action.user] };
    case 'addField':
      return { ...state, rev: state.rev + 1, fieldsAdded: [...state.fieldsAdded, action.field] };
    case 'patchField':
      return { ...state, fieldPatches: { ...state.fieldPatches, [action.id]: { ...(state.fieldPatches[action.id] || {}), ...action.patch } } };
    case 'retention':
      return { ...state, retentionMonths: action.months, autoAnonymise: action.autoAnonymise };
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      const { revealed, ...rest } = state;
      sessionStorage.setItem(KEY, JSON.stringify(rest));
      void revealed;
    } catch { /* demo still runs in memory */ }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch, data: DATA }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { generate } from './data/generate.js';
import { AS_AT } from './data/config.js';
import { defaultTriggers } from './data/zones.js';

const DATA = generate();
const KEY = 'pkns-hub-demo-v2';

export const ROLES = {
  marketing: {
    id: 'marketing', name: 'Marketing', landing: 'marketing',
    blurb: 'Campaigns, channels, content and cost per enquiry',
    person: 'Farah Idris', title: 'Digital Marketing', initials: 'FI',
    sees: 'Campaigns and channel results',
  },
  leasing: {
    id: 'leasing', name: 'Leasing', landing: 'asset',
    blurb: 'Enquiries, viewings, units and tenancies',
    person: 'Aina Rahman', title: 'Leasing Officer, Section 14', initials: 'AR',
    sees: 'Enquiries, units and tenancies',
  },
  management: {
    id: 'management', name: 'Management', landing: 'portfolio',
    blurb: 'Portfolio occupancy, spend and return',
    person: 'Hisham Karim', title: 'General Manager, Asset Management', initials: 'HK',
    sees: 'Portfolio occupancy, spend and return',
  },
};

// Screen access matrix (Confluence page 04, section 3).
// Enquiry detail and the list route stay out of the nav. The nav item is Enquiries (#/pipeline).
export const SCREENS = [
  { id: 'portfolio', n: 2, name: 'Overview', roles: ['marketing', 'leasing', 'management'], milestone: 'M1' },
  { id: 'asset', n: 3, name: 'Assets', roles: ['marketing', 'leasing', 'management'], milestone: 'M2' },
  { id: 'marketing', n: 4, name: 'Marketing', roles: ['marketing', 'management'], milestone: 'M2' },
  { id: 'campaign', n: 5, name: 'Campaigns', roles: ['marketing', 'leasing', 'management'], milestone: 'M1' },
  { id: 'pipeline', n: 6, name: 'Enquiries', roles: ['marketing', 'leasing', 'management'], milestone: 'M1' },
  { id: 'enquiries', n: 6, name: 'Enquiries', roles: ['marketing', 'leasing', 'management'], hidden: true },
  { id: 'enquiry', n: 7, name: 'Enquiry detail', roles: ['marketing', 'leasing', 'management'], hidden: true },
  { id: 'report', n: 10, name: 'Reports', roles: ['marketing', 'management'], milestone: 'M2' },
  { id: 'visitors', n: 9, name: 'Visitors', roles: ['marketing', 'management'], milestone: 'M2' },
  { id: 'settings', n: 8, name: 'Settings', roles: ['management'], milestone: 'M2' },
];

// Date is the as-at date; the clock is the presenter's current time in Malaysia.
function asAtNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return `${AS_AT}T${hour}:${pick('minute')}:${pick('second')}+08:00`;
}

export function freshState(role = null) {
  return {
    role,
    heroStage: null,
    heroReceivedAt: null,
    heroLog: [],
    heroSigned: null,
    moves: {},
    notes: {},
    followUps: {},
    officers: {},
    customTypes: [],
    customAssets: [],
    triggers: defaultTriggers(),
    requirementDone: {},
    documents: {},
    handover: {},
    flash: 0,
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...freshState(), ...JSON.parse(raw) } : freshState();
  } catch {
    return freshState();
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'role':
      return { ...state, role: action.role };
    case 'logout':
      return { ...state, role: null };
    case 'simulateHero': {
      if (state.heroStage) return state;
      const at = asAtNow();
      return {
        ...state,
        heroStage: 'New',
        heroReceivedAt: at,
        heroLog: [{ stage: 'New', at }],
        flash: state.flash + 1,
      };
    }
    case 'heroStage': {
      const at = asAtNow();
      const entry = { stage: action.stage, at };
      if (action.lostReason) entry.lostReason = action.lostReason;
      return {
        ...state,
        heroStage: action.stage,
        heroLog: [...state.heroLog, entry],
        heroSigned: action.signed ? action.signed : state.heroSigned,
        flash: state.flash + 1,
      };
    }
    case 'move': {
      const rec = { stage: action.stage, at: asAtNow() };
      if (action.lostReason) rec.lostReason = action.lostReason;
      if (action.rent != null) rec.rent = action.rent;
      if (action.start) rec.start = action.start;
      return {
        ...state,
        moves: { ...state.moves, [action.id]: rec },
        flash: state.flash + 1,
      };
    }
    case 'note': {
      const note = { ...action.note };
      if (!note.at) note.at = asAtNow();
      const prev = state.notes[action.id] || [];
      return {
        ...state,
        notes: { ...state.notes, [action.id]: [...prev, note] },
        flash: state.flash + 1,
      };
    }
    case 'followUp':
      return {
        ...state,
        followUps: { ...state.followUps, [action.id]: action.date },
        flash: state.flash + 1,
      };
    case 'reassign':
      return {
        ...state,
        officers: { ...state.officers, [action.id]: action.officer },
        flash: state.flash + 1,
      };
    case 'addType': {
      const name = (action.name || '').trim();
      if (!name) return state;
      return { ...state, customTypes: [...state.customTypes, name], flash: state.flash + 1 };
    }
    case 'addAsset':
      if (!action.asset) return state;
      return { ...state, customAssets: [...state.customAssets, action.asset], flash: state.flash + 1 };
    case 'setTrigger':
      return { ...state, triggers: { ...defaultTriggers(), ...state.triggers, [action.id]: Boolean(action.on) }, flash: state.flash + 1 };
    case 'requirementDone':
      return {
        ...state,
        requirementDone: {
          ...state.requirementDone,
          [action.id]: { ...(state.requirementDone[action.id] || {}), [action.req]: true },
        },
        flash: state.flash + 1,
      };
    case 'documents':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.id]: { ...(state.documents[action.id] || {}), ...action.documents },
        },
        flash: state.flash + 1,
      };
    case 'handover':
      return {
        ...state,
        handover: { ...state.handover, [action.id]: { status: 'handed', at: asAtNow() } },
        flash: state.flash + 1,
      };
    case 'reset':
      return freshState(state.role);
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: demo still works in memory */ }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch, data: DATA }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

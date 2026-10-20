import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { generate } from './data/generate.js';

const DATA = generate();
const KEY = 'pkns-hub-demo-v1';

export const ROLES = {
  marketing: { id: 'marketing', name: 'Marketing', landing: 'marketing', blurb: 'Campaigns, channels, content and cost per enquiry' },
  leasing: { id: 'leasing', name: 'Leasing', landing: 'asset', blurb: 'Enquiries, viewings, units and tenancies' },
  management: { id: 'management', name: 'Management', landing: 'portfolio', blurb: 'Portfolio occupancy, spend and return' },
};

// Screen access matrix (Confluence page 04, section 3).
export const SCREENS = [
  { id: 'portfolio', n: 2, name: 'Portfolio overview', roles: ['marketing', 'leasing', 'management'], milestone: 'M1 · Fri 23 Oct' },
  { id: 'asset', n: 3, name: 'Asset detail', roles: ['marketing', 'leasing', 'management'], milestone: 'M2 · Mon 26 Oct' },
  { id: 'marketing', n: 4, name: 'Marketing dashboard', roles: ['marketing', 'management'], milestone: 'M2 · Mon 26 Oct' },
  { id: 'campaign', n: 5, name: 'Campaigns', roles: ['marketing', 'leasing', 'management'], milestone: 'M1 · Fri 23 Oct' },
  { id: 'pipeline', n: 6, name: 'Enquiry pipeline', roles: ['marketing', 'leasing', 'management'], milestone: 'M1 · Fri 23 Oct' },
  { id: 'report', n: 10, name: 'Management report', roles: ['marketing', 'management'], milestone: 'M2 · Mon 26 Oct' },
  { id: 'visitors', n: 9, name: 'Visitors (future phase)', roles: ['marketing', 'management'], milestone: 'M2 · Mon 26 Oct' },
  { id: 'settings', n: 8, name: 'Settings', roles: ['management'], milestone: 'M2 · Mon 26 Oct' },
];

const initial = { role: null, heroStage: null, heroLog: [], sitcAdded: false, moves: {}, notes: {} };

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'role': return { ...state, role: action.role };
    case 'logout': return { ...state, role: null };
    case 'heroStage': return { ...state, heroStage: action.stage, heroLog: [...state.heroLog, [action.stage, new Date().toISOString()]] };
    case 'sitc': return { ...state, sitcAdded: action.value };
    case 'move': return { ...state, moves: { ...state.moves, [action.id]: action.stage } };
    case 'note': return { ...state, notes: { ...state.notes, [action.id]: [...(state.notes[action.id] || []), action.note] } };
    case 'reset': return { ...initial, role: state.role };
    default: return state;
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

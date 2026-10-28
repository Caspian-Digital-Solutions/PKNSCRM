import { AS_OF } from './data/config.js';
import { addDays, dateUTC } from './data/rng.js';

export const GLOBAL_KEYS = ['preset', 'from', 'to', 'asset', 'operator', 'type', 'channel'];

export const PRESETS = [
  { id: 'month', label: 'This month', from: '2026-10-01', to: AS_OF },
  { id: 'last-month', label: 'Last month', from: '2026-09-01', to: '2026-09-30' },
  { id: 'quarter', label: 'This quarter', from: '2026-10-01', to: AS_OF },
  { id: 'ytd', label: 'YTD', from: '2026-01-01', to: AS_OF },
  { id: 'l12', label: 'Last 12 months', from: '2025-11-01', to: AS_OF },
  { id: 'custom', label: 'Custom' },
];

const ymd = (date) => date.toISOString().slice(0, 10);

export function previousRange(from, to) {
  const length = Math.round((dateUTC(to) - dateUTC(from)) / 86400000) + 1;
  const prevTo = ymd(addDays(dateUTC(from), -1));
  const prevFrom = ymd(addDays(dateUTC(prevTo), -(length - 1)));
  return { from: prevFrom, to: prevTo };
}

export function rangeFor(search) {
  const preset = search.preset || 'l12';
  const found = PRESETS.find((item) => item.id === preset);
  if (!found || found.id === 'custom') {
    return {
      preset: 'custom',
      from: search.from || '2025-10-29',
      to: search.to || AS_OF,
    };
  }
  return { preset, from: found.from, to: found.to };
}

export function splitList(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function globalQuery(search) {
  const query = {};
  for (const key of GLOBAL_KEYS) if (search?.[key]) query[key] = search[key];
  return query;
}

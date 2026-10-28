const nf0 = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v) => (v == null ? '–' : nf0.format(v));
export const rm = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : `RM ${nf0.format(Number(v))}`);
export function rmAxis(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    const body = k >= 100 ? String(Math.round(k)) : (Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return `${sign}RM ${body}k`;
  }
  return `${sign}RM ${nf0.format(abs)}`;
}
export const rm2 = (v) => (v == null ? '–' : 'RM' + nf2.format(v));
// Round half up on the decimal value (toFixed alone shows 10.35 as 10.3).
const round = (v, d) => Math.round(v * 10 ** d + 1e-9) / 10 ** d;
export const pct = (v, d = 1) => (v == null ? '–' : round(v * 100, d).toFixed(d) + '%');
export const x = (v) => (v == null ? '–' : round(v, 1).toFixed(1) + 'x');
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function klParts(iso) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00+08:00` : iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    weekday: get('weekday'),
    day: String(Number(get('day')) || get('day')),
    month: MONTHS_SHORT[Number(get('month')) - 1] || '',
    year: get('year'),
    hour,
    minute: get('minute'),
  };
}

export const asAtLabel = (iso) => {
  if (!iso) return 'Data as at';
  const part = klParts(iso);
  return `Data as at ${part.weekday} ${part.day} ${part.month} ${part.year}, ${part.hour}:${part.minute}`;
};

export const weekdayDate = (iso) => {
  if (!iso) return '';
  const part = klParts(iso);
  return `${part.weekday} ${part.day} ${part.month} ${part.year}`;
};

export const bookedWhen = (iso, clock) => {
  if (!iso) return '';
  const part = klParts(iso);
  const timeText = clock || (String(iso).length > 10 ? `${part.hour}:${part.minute}` : '');
  return timeText ? `${part.weekday} ${part.day} ${part.month}, ${timeText}` : `${part.weekday} ${part.day} ${part.month}`;
};

export const date = (iso) => {
  if (!iso) return '–';
  const part = klParts(iso);
  return `${part.day} ${part.month} ${part.year}`;
};
export const dayMonth = (iso) => {
  if (!iso) return '–';
  const part = klParts(iso);
  return `${part.day} ${part.month}`;
};
export const dateTime = (iso) => {
  if (!iso) return '–';
  const part = klParts(iso);
  if (iso.length === 10) return `${part.day} ${part.month}`;
  return `${part.day} ${part.month}, ${part.hour}:${part.minute}`;
};
export const tooltipDate = (iso) => {
  if (!iso) return '–';
  const part = klParts(iso);
  if (iso.length === 10) return `${part.weekday} ${part.day} ${part.month} ${part.year}`;
  return `${part.weekday} ${part.day} ${part.month} ${part.year}, ${part.hour}:${part.minute}`;
};
export const time = (iso) => {
  if (!iso || iso.length === 10) return '–';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kuala_Lumpur' });
};
export const ratio = (v) => (v == null ? '–' : round(v, 2).toFixed(2));
export const years = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), 2).toFixed(2)} years`);
export const hours = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), 1).toFixed(1)} h`);
export const workingHours = (v) => {
  const text = hours(v);
  return text === '–' ? text : text.replace(/ h$/, ' working hours');
};
export const snapshotLabel = (iso) => {
  if (!iso) return 'Snapshot';
  const part = klParts(iso);
  return `Snapshot as at ${part.weekday} ${part.day} ${part.month} ${part.year}, ${part.hour}:${part.minute}`;
};
export function monthSelectLabel(label, key, now) {
  const end = String(now || '').slice(0, 10);
  if (key && end.startsWith(key) && end < `${key}-31`) return `${label} (to ${dayMonth(end)})`;
  return label;
}
export const dec1 = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : round(Number(v), 1).toFixed(1));
// Values already stored as a percent (4.2 means 4.2%, not 420%).
export const pctPlain = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), d).toFixed(d)}%`);
export const pctStored = (v, d = 1) => {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  const n = round(Number(v), d);
  const body = `${n.toFixed(d)}%`;
  return n > 0 ? `+${body}` : body;
};

const MINUS = '\u2212';

function withMinus(text) {
  return String(text).replace(/-/g, MINUS);
}

export function signedChange(value, format) {
  if (value == null || !Number.isFinite(Number(value))) return '–';
  const text = withMinus(format(value));
  if (Number(value) > 0 && text[0] !== '+' && text[0] !== MINUS) return `+${text}`;
  return text;
}

const VALUE_FORMATS = { num, rm, rm2, pct, x, ratio, years, hours, pctStored };

function shownNumber(value, format) {
  const fn = VALUE_FORMATS[format] || num;
  const text = fn(value);
  if (text == null || text === '–') return null;
  const body = String(text).replace(/^RM/, '');
  const negative = body.startsWith('-') || body.startsWith(MINUS);
  const digits = body.replace(/^[+\u2212-]/, '').replace(/[^0-9.]/g, '');
  if (!digits || !Number.isFinite(Number(digits))) return null;
  return negative ? -Number(digits) : Number(digits);
}

function shownPlaces(value, format) {
  const fn = VALUE_FORMATS[format] || num;
  const text = String(fn(value)).replace(/^RM/, '').replace(/^[+\u2212-]/, '');
  const match = text.match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

// Difference of the numbers a reader sees, so the change column matches the subtraction.
export function displayedDelta(current, previous, format) {
  const a = shownNumber(current, format);
  const b = shownNumber(previous, format);
  if (a == null || b == null) return null;
  return round(a - b, shownPlaces(current, format));
}

export function delta(current, previous, format) {
  const diff = displayedDelta(current, previous, format);
  if (diff == null) return '–';
  const places = shownPlaces(current, format);
  if (format === 'rm' || format === 'rm2') {
    const body = (format === 'rm2' ? nf2 : nf0).format(Math.abs(diff));
    if (diff < 0) return `${MINUS}RM${body}`;
    if (diff > 0) return `+RM${body}`;
    return `RM${body}`;
  }
  if (format === 'pct' || format === 'pctStored') {
    const body = Math.abs(diff).toFixed(places);
    if (diff < 0) return `${MINUS}${body} pts`;
    if (diff > 0) return `+${body} pts`;
    return `${(0).toFixed(places)} pts`;
  }
  return signedChange(diff, VALUE_FORMATS[format] || num);
}

export function duration(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return '–';
  const m = Math.max(0, Math.round(Number(minutes)));
  if (m < 1) return 'under 1 min';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (!h) return `${m} min`;
  if (!rem) return `${h} h`;
  return `${h} h ${rem} min`;
}

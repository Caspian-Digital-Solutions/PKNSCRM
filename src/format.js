const nf0 = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v) => (v == null ? '–' : nf0.format(v));
export const rm = (v) => (v == null ? '–' : 'RM' + nf0.format(v));
export const rm2 = (v) => (v == null ? '–' : 'RM' + nf2.format(v));
// Round half up on the decimal value (toFixed alone shows 10.35 as 10.3).
const round = (v, d) => Math.round(v * 10 ** d + 1e-9) / 10 ** d;
export const pct = (v, d = 1) => (v == null ? '–' : round(v * 100, d).toFixed(d) + '%');
export const x = (v) => (v == null ? '–' : round(v, 1).toFixed(1) + 'x');
export const date = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T00:00:00+08:00' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }) : '–');
export const dayMonth = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T00:00:00+08:00' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' }) : '–');
export const time = (iso) => {
  if (!iso || iso.length === 10) return '–';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kuala_Lumpur' });
};
export const ratio = (v) => (v == null ? '–' : round(v, 2).toFixed(2));
export const years = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), 2).toFixed(2)} years`);
export const hours = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), 1).toFixed(1)} h`);
export const dec1 = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : round(Number(v), 1).toFixed(1));
// Values already stored as a percent (4.2 means 4.2%, not 420%).
export const pctPlain = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? '–' : `${round(Number(v), d).toFixed(d)}%`);
export const pctStored = (v, d = 1) => {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  const n = round(Number(v), d);
  const body = `${n.toFixed(d)}%`;
  return n > 0 ? `+${body}` : body;
};

export function signedChange(value, format) {
  if (value == null || !Number.isFinite(Number(value))) return '–';
  const text = format(value);
  if (Number(value) > 0 && text[0] !== '+' && text[0] !== '-') return `+${text}`;
  return text;
}

export function duration(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return '–';
  const m = Math.max(0, Math.round(Number(minutes)));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (!h) return `${m} min`;
  if (!rem) return `${h} h`;
  return `${h} h ${rem} min`;
}

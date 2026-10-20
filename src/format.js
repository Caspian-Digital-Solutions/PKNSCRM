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

export function duration(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return '–';
  const m = Math.max(0, Math.round(Number(minutes)));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (!h) return `${m} min`;
  if (!rem) return `${h} h`;
  return `${h} h ${rem} min`;
}

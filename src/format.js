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

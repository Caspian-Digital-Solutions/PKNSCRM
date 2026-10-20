// Deterministic random numbers, so every load produces the same dummy data.
export function makeRng(seed = 20261028) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((s, w) => s + w, 0);
      let x = next() * total;
      for (let i = 0; i < items.length; i++) {
        x -= weights[i];
        if (x <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
  return r;
}

// Split an integer total across buckets in proportion to weights, so the parts always add back up exactly.
export function allocate(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let rest = total - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((x, y) => y[0] - x[0]);
  for (let k = 0; k < rest; k++) floors[order[k % order.length][1]] += 1;
  return floors;
}

// Spread a small integer total across many buckets in proportion to weights (systematic sampling).
// Exact total, evenly spread over time. allocate() alone piles small counts into the heaviest days.
export function scatter(total, weights, rng) {
  const out = new Array(weights.length).fill(0);
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!total || !sum) return out;
  const step = sum / total;
  let point = rng.next() * step, acc = 0, i = 0;
  for (let k = 0; k < total; k++, point += step) {
    while (i < weights.length - 1 && acc + weights[i] < point) acc += weights[i++];
    out[i] += 1;
  }
  return out;
}

export const ymd = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
export const dateUTC = (s) => new Date(s + 'T00:00:00Z');
export const daysBetween = (a, b) => Math.round((dateUTC(b) - dateUTC(a)) / 86400000);

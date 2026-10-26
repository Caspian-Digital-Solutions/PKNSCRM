// npm run verify:consistency  —  node scripts/verify-consistency.mjs
// Proves that every count on every screen comes from the same enquiry records, then plays the hero
// storyline and prints the figures before and after signing. Exits 1 on any failed check.
import { generate } from '../src/data/generate.js';
import { campaignChannels, totalRow, statusCounts, medianFirstResponseHours } from '../src/data/metrics.js';
import { DEMO_START, HERO } from '../src/data/config.js';

const sum = (a) => a.reduce((s, v) => s + v, 0);
let failed = 0;
const check = (label, ok, detail = '') => { if (!ok) failed += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };
const eq = (label, got, want) => check(label, got === want, `got ${got}, expected ${want}`);

const d = generate();
const recs = d.enquiries;
const NOW = new Date(DEMO_START).getTime();
const day = (iso) => iso && iso.slice(0, 10);

// 1. Records versus campaign arrays, channel by channel.
for (const c of d.campaigns) for (const ch of ['fb', 'ig', 'gads', 'boost']) {
  const mine = recs.filter((r) => r.campaign === c.id && r.channel === ch);
  eq(`${c.short} ${ch} enquiries = records`, mine.length, sum(c.daily[ch].enq));
  eq(`${c.short} ${ch} viewings = records`, mine.filter((r) => r.viewingHeld).length, sum(c.daily[ch].views));
  eq(`${c.short} ${ch} signed = records`, mine.filter((r) => r.stage === 'Signed').length, sum(c.daily[ch].signed));
}
// 2. Nothing happens after the demo clock; every history is in order; nobody signs before viewing.
check('no timestamp after the demo clock', recs.every((r) => r.history.every(([, t]) => new Date(t).getTime() <= NOW)));
check('every history in time order', recs.every((r) => r.history.every(([, t], i) => i === 0 || t >= r.history[i - 1][1])));
check('every signing comes after a viewing', recs.filter((r) => r.stage === 'Signed').every((r) => r.viewingHeld && r.viewingAt < r.signedAt));
check('one enquiry per Reserved unit', new Set(recs.filter((r) => r.stage === 'Negotiation').map((r) => r.unitId)).size === recs.filter((r) => r.stage === 'Negotiation').length);
check('no business name twice', new Set(recs.map((r) => r.business)).size === recs.length);
check('no "sk" in any ad or post', !JSON.stringify(d).includes(' sk'));

// 3. The figures, before the hero.
function figures(records, now) {
  const oct = { from: '2026-10-01', to: day(now) };
  const full = { to: day(now) };
  const rowsOct = d.campaigns.map((c) => totalRow(campaignChannels(c, records, oct)));
  const t = { spend: sum(rowsOct.map((r) => r.spend)), enq: sum(rowsOct.map((r) => r.enquiries)), fy: sum(rowsOct.map((r) => r.firstYearValue)), signed: sum(rowsOct.map((r) => r.signed)) };
  const sa = totalRow(campaignChannels(d.campaigns.find((c) => c.id === 'sa'), records, full));
  const fb = campaignChannels(d.campaigns.find((c) => c.id === 'sa'), records, full).find((r) => r.channel === 'fb');
  const units = statusCounts(d.units, records, now);
  const g = d.campaigns.map((c) => campaignChannels(c, records, oct).find((r) => r.channel === 'gads'));
  const gS = sum(g.map((r) => r.spend)), gC = sum(g.map((r) => r.clicks)), gI = sum(g.map((r) => r.impressions));
  const sepRows = d.campaigns.map((c) => totalRow(campaignChannels(c, records, { from: '2026-09-01', to: '2026-09-28' })));
  const octRecs = records.filter((r) => day(r.receivedAt) >= '2026-10-01');
  const open = records.filter((r) => !['Signed', 'Lost'].includes(r.stage));
  return {
    'Records': records.length,
    'October paid enquiries (Overview = List filter = Report paid line)': t.enq,
    'October paid, records count': octRecs.filter((r) => r.paid).length,
    'October received, all sources (Report)': `${octRecs.length} = ${octRecs.filter((r) => r.paid).length} paid + ${octRecs.filter((r) => !r.paid && r.campaign).length} unpaid from campaigns + ${octRecs.filter((r) => !r.campaign).length} not linked to a campaign`,
    'Comparison period 1–28 Sep: paid enquiries / spend': `${sum(sepRows.map((r) => r.enquiries))} / ${sum(sepRows.map((r) => r.spend))}`,
    'Google Ads October: spend / CTR / CPC': `${gS} / ${(gC / gI * 100).toFixed(1)}% / ${(gS / gC).toFixed(2)}`,
    'Entered Prospect in October (Report)': records.filter((r) => r.history.some(([s, t]) => s === 'Qualified' && t >= '2026-10-01')).length,
    'October spend': t.spend, 'October CPL': (t.spend / t.enq).toFixed(2), 'October first-year rent': t.fy, 'October ROAS': (t.fy / t.spend).toFixed(1) + 'x', 'New leases (October)': t.signed,
    'SA Sentral full campaign enquiries / viewings / signed': `${sa.enquiries} / ${sa.viewings} / ${sa.signed}`,
    'SA Sentral CPL / cost per viewing / cost per signed': `${sa.cpl.toFixed(2)} / ${sa.costPerViewing.toFixed(2)} / ${sa.costPerSigned.toFixed(2)}`,
    'SA Sentral first-year value / ROAS': `${sa.firstYearValue} / ${sa.roas.toFixed(1)}x`,
    'SA Sentral Facebook lead ads': `${fb.enquiries} / ${fb.viewings} / ${fb.signed}`,
    'Units occupied / let not started / reserved / vacant': `${units.Occupied} / ${units.Let} / ${units.Reserved} / ${units.Vacant}`,
    'Occupancy / committed occupancy': `${(units.occupancy * 100).toFixed(1)}% / ${(units.committedOccupancy * 100).toFixed(1)}%`,
    'Open enquiries': open.length,
    'Suspect / Prospect / Customer (handover pending) / Withdrawn in October': [
      records.filter((r) => ['New', 'Contacted'].includes(r.stage)).length,
      records.filter((r) => ['Qualified', 'Viewing Scheduled', 'Negotiation'].includes(r.stage)).length,
      records.filter((r) => r.stage === 'Signed' && (r.leaseStart || '9') > day(now)).length,
      records.filter((r) => r.stage === 'Lost' && day(r.withdrawnAt) >= '2026-10-01').length,
    ].join(' / '),
    'Median first response, October (working hours)': medianFirstResponseHours(records, { from: '2026-10-01' }).toFixed(1),
  };
}
const before = figures(recs, DEMO_START);
eq('Overview paid enquiries equals the records count', before['October paid enquiries (Overview = List filter = Report paid line)'], before['October paid, records count']);

// 4. The hero storyline on the demo clock.
const unit = d.units.find((u) => u.asset === HERO.asset && u.lot === HERO.lot);
const hero = {
  id: 'ENQ-HERO', business: HERO.business, source: HERO.source, channel: HERO.channel, campaign: HERO.campaign, paid: true,
  asset: HERO.asset, unitId: unit.id, lot: HERO.lot, rent: HERO.rent, stage: 'Signed',
  receivedAt: '2026-10-28T10:00:00+08:00', firstResponseAt: '2026-10-28T10:01:00+08:00',
  viewingAt: '2026-10-29T11:00:00+08:00', viewingHeld: true, signedAt: '2026-10-30T15:00:00+08:00', leaseStart: '2026-12-01',
  history: [['New', '2026-10-28T10:00:00+08:00'], ['Contacted', '2026-10-28T10:01:00+08:00'], ['Qualified', '2026-10-28T10:03:00+08:00'],
    ['Viewing Scheduled', '2026-10-28T10:05:00+08:00'], ['Negotiation', '2026-10-29T12:05:00+08:00'], ['Signed', '2026-10-30T15:00:00+08:00']],
};
const after = figures([...recs, hero], '2026-10-30T15:00:00+08:00');
check('hero signs after the viewing', hero.viewingAt < hero.signedAt);
eq('Suite 4-07 is Let, not Occupied, after signing', statusCounts([unit], [hero], '2026-10-30T15:00:00+08:00').Let, 1);

console.log('\nFigure: before the hero  →  after signing');
for (const k of Object.keys(before)) console.log(`${k}: ${before[k]}  →  ${after[k]}`);
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);

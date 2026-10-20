// Reconciles the generated dummy data against Confluence page 06. Exits non-zero on any mismatch.
import { generate } from '../src/data/generate.js';
import { campaignChannels, totalRow, statusCounts, leasingKpis, medianFirstResponseHours } from '../src/data/metrics.js';
import { ASSETS, CAMPAIGNS, STAGE_COUNTS } from '../src/data/config.js';

const D = generate();
let fails = 0;
const check = (label, got, want) => {
  const ok = typeof want === 'number' ? Math.abs(got - want) < 0.005 : got === want;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${got}${ok ? '' : `  (expected ${want})`}`);
};

for (const a of ASSETS) {
  const c = statusCounts(D.units.filter((u) => u.asset === a.id));
  check(`${a.short} units`, c.total, a.mix.reduce((s, g) => s + g.n, 0));
  check(`${a.short} occupied/reserved/vacant/redev`, [c.Occupied, c.Reserved, c.Vacant, c['Under redevelopment']].join('/'), [a.counts.occupied, a.counts.reserved, a.counts.vacant, a.counts.redev].join('/'));
}
const p = statusCounts(D.units);
check('Portfolio units', p.total, 838);
check('Portfolio occupied/reserved/vacant/redev', [p.Occupied, p.Reserved, p.Vacant, p['Under redevelopment']].join('/'), '549/31/108/150');
check('Portfolio occupancy %', Math.round(p.occupancy * 1000) / 10, 79.8);
const hero = D.units.find((u) => u.id === 'kpsa:4-07');
check('Hero lot 4-07 status / size / rent', `${hero.status}/${hero.use}/${hero.size}/${hero.rent}`, 'Vacant/Office/1200/3360');

const expect = { sa: [48000, 420, 96, 14, 604800, 114.29, 12.6], mpk: [15000, 118, 26, 4, 201600, 127.12, 13.4], bangi: [9000, 96, 19, 3, 108000, 93.75, 12.0], kl: [12000, 74, 15, 2, 132000, 162.16, 11.0], s13: [8000, 64, 13, 2, 82800, 125.0, 10.4] };
const all = [];
for (const c of D.campaigns) {
  const rows = campaignChannels(c, D.signed);
  rows.forEach((r) => { const want = c.channels[r.channel]; check(`${c.short} ${r.channel} spend/imp/clicks/enq/views/signed`, [r.spend, r.impressions, r.clicks, r.enquiries, r.viewings, r.signed].join('/'), want.join('/')); });
  const t = totalRow(rows);
  all.push(t);
  const [sp, enq, v, s, fyv, cpl, roas] = expect[c.id];
  check(`${c.short} totals spend/enq/views/signed/FYV`, [t.spend, t.enquiries, t.viewings, t.signed, t.firstYearValue].join('/'), [sp, enq, v, s, fyv].join('/'));
  check(`${c.short} CPL`, Math.round(t.cpl * 100) / 100, cpl);
  check(`${c.short} ROAS`, Math.round(t.roas * 10) / 10, roas);
}
const g = totalRow(all);
check('All campaigns spend/enq/views/signed/FYV', [g.spend, g.enquiries, g.viewings, g.signed, g.firstYearValue].join('/'), '92000/772/169/25/1129200');
check('All campaigns CPL', Math.round(g.cpl * 100) / 100, 119.17);
check('All campaigns ROAS', Math.round(g.roas * 10) / 10, 12.3);
const octGoogle = D.campaigns.reduce((s, c) => s + campaignChannels(c, D.signed, { from: '2026-10-01', to: '2026-10-31' }).find((r) => r.channel === 'gads').spend, 0);
check('Google Ads spend, October (all campaigns)', octGoogle, 14500);

const sa = D.campaigns.find((c) => c.id === 'sa');
const after = totalRow(campaignChannels(sa, D.signed, {}, 'Signed'));
check('SA Sentral after hero signed enq/views/signed', [after.enquiries, after.viewings, after.signed].join('/'), '421/97/15');
check('SA Sentral after hero CPL', Math.round(after.cpl * 100) / 100, 114.01);
check('SA Sentral after hero cost per viewing', Math.round(after.costPerViewing * 100) / 100, 494.85);
check('SA Sentral after hero cost per signed', Math.round(after.costPerSigned * 100) / 100, 3200);
check('SA Sentral after hero ROAS', Math.round(after.roas * 10) / 10, 13.4);
check('Portfolio occupancy after hero signed', Math.round(statusCounts(D.units, 'Signed').occupancy * 1000) / 10, 79.9);

for (const [stage, n] of Object.entries(STAGE_COUNTS)) check(`Pipeline ${stage}`, D.enquiries.filter((e) => e.stage === stage).length, n);
check('Signed this month (October)', D.signed.filter((s) => s.date.startsWith('2026-10')).length, 9);

const k = leasingKpis(D.units);
console.log('\nComputed leasing figures (write these back to page 06 section 7):');
console.log('  WALE (years, by rent):', k.wale.toFixed(2));
console.log('  Lease expiry profile:', Object.entries(k.expiryPct).map(([a, b]) => `${a} ${(b * 100).toFixed(1)}%`).join('; '));
console.log('  Rent expiring next 12 months:', (k.rentNext12 * 100).toFixed(1) + '%');
console.log('  Median days vacant:', k.medianDaysVacant);
console.log('  Retail trade mix:', Object.entries(k.tradePct).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${(b * 100).toFixed(0)}%`).join(', '));
console.log('  Median first response (hours):', medianFirstResponseHours(D.enquiries).toFixed(1));
console.log('  Enquiries total:', D.enquiries.length, ' sources:', JSON.stringify(D.enquiries.reduce((m, e) => ((m[e.source] = (m[e.source] || 0) + 1), m), {})));
console.log(`\n${fails ? fails + ' FAILED' : 'ALL CHECKS PASSED'}`);
process.exit(fails ? 1 : 0);

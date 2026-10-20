// Reconciles the generated dummy data against Confluence page 06. Exits non-zero on any mismatch.
import { generate } from '../src/data/generate.js';
import { campaignChannels, totalRow, statusCounts, leasingKpis, medianFirstResponseHours } from '../src/data/metrics.js';
import { ASSETS, CAMPAIGNS, STAGE_COUNTS } from '../src/data/config.js';
import {
  liveUnits, liveEnquiries, campaignRows, assetMarketing, portfolioRows, pipelineSummary, marketingSummary, reportBlocks, contactLog,
} from '../src/data/selectors.js';
import { DEFINITIONS } from '../src/data/definitions.js';

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

const money2 = (v) => Math.round(v * 100) / 100;
const roas1 = (v) => Math.round(v * 10) / 10;
const pct1 = (v) => Math.round(v * 1000) / 10;
const OCT = { from: '2026-10-01', to: '2026-10-31' };

function allCampaigns(state, range) {
  return totalRow(D.campaigns.flatMap((c) => campaignRows(D, state, c.id, range)));
}
function portfolioCounts(state) {
  const c = statusCounts(liveUnits(D, state), state.heroStage ?? null);
  return [c.Occupied, c.Reserved, c.Vacant, c['Under redevelopment']].join('/');
}
function expectStage(label, state, sa, fb, full, oct, units) {
  const rows = campaignRows(D, state, 'sa', {});
  const t = totalRow(rows);
  const f = rows.find((r) => r.channel === 'fb');
  check(`${label} SA enq/views/signed`, [t.enquiries, t.viewings, t.signed].join('/'), sa.funnel);
  check(`${label} SA CPL`, money2(t.cpl), sa.cpl);
  check(`${label} SA cost per viewing`, money2(t.costPerViewing), sa.cpv);
  check(`${label} SA cost per signed`, money2(t.costPerSigned), sa.cps);
  check(`${label} SA first-year value`, t.firstYearValue, sa.fyv);
  check(`${label} SA ROAS`, roas1(t.roas), sa.roas);
  check(`${label} SA Facebook enq/views/signed`, [f.enquiries, f.viewings, f.signed].join('/'), fb);
  const g = allCampaigns(state, {});
  check(`${label} all-campaign enq/views/signed`, [g.enquiries, g.viewings, g.signed].join('/'), full.funnel);
  check(`${label} all-campaign CPL`, money2(g.cpl), full.cpl);
  check(`${label} all-campaign ROAS`, roas1(g.roas), full.roas);
  check(`${label} all-campaign first-year value`, g.firstYearValue, full.fyv);
  const o = allCampaigns(state, OCT);
  check(`${label} October enq/views/signed`, [o.enquiries, o.viewings, o.signed].join('/'), oct.funnel);
  check(`${label} October spend`, o.spend, 34206);
  check(`${label} October first-year value`, o.firstYearValue, oct.fyv);
  check(`${label} October CPL`, money2(o.cpl), oct.cpl);
  check(`${label} October ROAS`, roas1(o.roas), oct.roas);
  check(`${label} portfolio units`, portfolioCounts(state), units);
}

expectStage('Before', {},
  { funnel: '420/96/14', cpl: 114.29, cpv: 500, cps: 3428.57, fyv: 604800, roas: 12.6 },
  '210/41/6',
  { funnel: '772/169/25', cpl: 119.17, roas: 12.3, fyv: 1129200 },
  { funnel: '282/63/9', fyv: 424080, cpl: 121.3, roas: 12.4 },
  '549/31/108/150');
expectStage('New', { heroStage: 'New' },
  { funnel: '421/96/14', cpl: 114.01, cpv: 500, cps: 3428.57, fyv: 604800, roas: 12.6 },
  '211/41/6',
  { funnel: '773/169/25', cpl: 119.02, roas: 12.3, fyv: 1129200 },
  { funnel: '283/63/9', fyv: 424080, cpl: 120.87, roas: 12.4 },
  '549/31/108/150');
expectStage('Viewing Scheduled', { heroStage: 'Viewing Scheduled' },
  { funnel: '421/97/14', cpl: 114.01, cpv: 494.85, cps: 3428.57, fyv: 604800, roas: 12.6 },
  '211/42/6',
  { funnel: '773/170/25', cpl: 119.02, roas: 12.3, fyv: 1129200 },
  { funnel: '283/64/9', fyv: 424080, cpl: 120.87, roas: 12.4 },
  '549/31/108/150');
expectStage('Negotiation', { heroStage: 'Negotiation' },
  { funnel: '421/97/14', cpl: 114.01, cpv: 494.85, cps: 3428.57, fyv: 604800, roas: 12.6 },
  '211/42/6',
  { funnel: '773/170/25', cpl: 119.02, roas: 12.3, fyv: 1129200 },
  { funnel: '283/64/9', fyv: 424080, cpl: 120.87, roas: 12.4 },
  '549/32/107/150');
expectStage('Signed', { heroStage: 'Signed' },
  { funnel: '421/97/15', cpl: 114.01, cpv: 494.85, cps: 3200, fyv: 645120, roas: 13.4 },
  '211/42/7',
  { funnel: '773/170/26', cpl: 119.02, roas: 12.7, fyv: 1169520 },
  { funnel: '283/64/10', fyv: 464400, cpl: 120.87, roas: 13.6 },
  '550/31/107/150');

check('Signed occupancy', pct1(statusCounts(liveUnits(D, { heroStage: 'Signed' }), 'Signed').occupancy), 79.9);
check('Negotiation occupancy', pct1(statusCounts(liveUnits(D, { heroStage: 'Negotiation' }), 'Negotiation').occupancy), 79.8);
const signedLot = liveUnits(D, { heroStage: 'Signed' }).find((u) => u.id === 'kpsa:4-07');
check('Hero lot after signed', `${signedLot.status}/${signedLot.rent}/${signedLot.leaseStart}/${signedLot.leaseExpiry}`, 'Occupied/3360/2026-12-01/2028-11-30');
check('Hero lot in negotiation', liveUnits(D, { heroStage: 'Negotiation' }).find((u) => u.id === 'kpsa:4-07').status, 'Reserved');

const heroRows = liveEnquiries(D, { heroStage: 'Signed' });
const heroEnquiry = heroRows.find((e) => e.id === 'ENQ-HERO');
check('Live enquiries include the hero', heroRows.length, 121);
check('Hero stage / asset / lot', `${heroEnquiry.stage}/${heroEnquiry.asset}/${heroEnquiry.lot}`, 'Signed/kpsa/4-07');
check('Hero channel / campaign / source', `${heroEnquiry.channel}/${heroEnquiry.campaign}/${heroEnquiry.source}`, 'fb/sa/Facebook Lead Ad');
check('Hero officer', heroEnquiry.officer, 'aina');
check('Hero business', heroEnquiry.business, 'Teras Niaga Consulting Sdn Bhd');
check('Pipeline New before', pipelineSummary(D, {}).counts.New, 18);
check('Pipeline Signed before', pipelineSummary(D, {}).counts.Signed, 9);
check('Pipeline New while the hero is new', pipelineSummary(D, { heroStage: 'New' }).counts.New, 19);
check('Pipeline Signed after the hero signs', pipelineSummary(D, { heroStage: 'Signed' }).counts.Signed, 10);
check('Pipeline New once the hero has left it', pipelineSummary(D, { heroStage: 'Viewing Scheduled' }).counts.New, 18);
const openBefore = pipelineSummary(D, {}).openValue;
check('Open pipeline adds the hero asking rent', pipelineSummary(D, { heroStage: 'New' }).openValue - openBefore, 3360);
check('Open pipeline excludes a signed hero', pipelineSummary(D, { heroStage: 'Signed' }).openValue, openBefore);

for (const c of D.campaigns) {
  const pack = (rows) => rows.map((r) => [r.channel, r.spend, r.impressions, r.clicks, r.enquiries, r.viewings, r.signed, r.firstYearValue].join('/')).join('|');
  check(`${c.short} selector matches campaign channels`, pack(campaignRows(D, {}, c.id, {})), pack(campaignChannels(c, D.signed, {}, null)));
}
for (const state of [{}, { heroStage: 'Signed' }]) {
  const tag = state.heroStage || 'before';
  for (const c of D.campaigns) {
    const ids = Object.keys(c.assets);
    const sum = totalRow(ids.map((id) => totalRow(campaignRows(D, state, c.id, { assetId: id }))));
    const all = totalRow(campaignRows(D, state, c.id, {}));
    check(`${c.short} ${tag} asset spend`, sum.spend, all.spend);
    check(`${c.short} ${tag} asset enquiries`, sum.enquiries, all.enquiries);
    check(`${c.short} ${tag} asset viewings`, sum.viewings, all.viewings);
    check(`${c.short} ${tag} asset signed`, sum.signed, all.signed);
    check(`${c.short} ${tag} asset first-year value`, sum.firstYearValue, all.firstYearValue);
    const unpaidSum = ids.reduce((s, id) => s + (assetMarketing(D, state, id, {}).byCampaign.find((row) => row.id === c.id)?.unpaid || 0), 0);
    const unpaidAll = Object.values(c.unpaidDaily).reduce((s, arr) => s + arr.reduce((a, b) => a + b, 0), 0);
    check(`${c.short} ${tag} asset unpaid`, unpaidSum, unpaidAll);
  }
}

const portfolioTotal = (state) => portfolioRows(D, state, '2026-10').find((r) => r.total);
const p0 = portfolioTotal({});
check('Portfolio October spend', p0.spend, 34206);
check('Portfolio October enquiries', p0.paidEnquiries, 282);
check('Portfolio October signed', p0.signed, 9);
check('Portfolio October first-year value', p0.firstYearValue, 424080);
check('Portfolio October CPL', money2(p0.cpl), 121.3);
check('Portfolio October ROAS', roas1(p0.roas), 12.4);
check('Portfolio October units / occupied', `${p0.units}/${p0.occupied}`, '838/549');
check('Portfolio October occupancy', pct1(p0.occupancy), 79.8);
const p1 = portfolioTotal({ heroStage: 'Signed' });
check('Portfolio after enquiries / signed', `${p1.paidEnquiries}/${p1.signed}`, '283/10');
check('Portfolio after first-year value', p1.firstYearValue, 464400);
check('Portfolio after CPL', money2(p1.cpl), 120.87);
check('Portfolio after ROAS', roas1(p1.roas), 13.6);
check('Portfolio after occupied / vacant', `${p1.occupied}/${p1.vacant}`, '550/107');
check('Portfolio after occupancy', pct1(p1.occupancy), 79.9);
const assetBody = portfolioRows(D, {}, '2026-10').filter((r) => !r.total);
check('Asset rows sum spend', assetBody.reduce((s, r) => s + r.spend, 0), p0.spend);
check('Asset rows sum enquiries', assetBody.reduce((s, r) => s + r.paidEnquiries, 0), p0.paidEnquiries);
check('Asset rows sum signed', assetBody.reduce((s, r) => s + r.signed, 0), p0.signed);
check('Asset rows sum first-year value', assetBody.reduce((s, r) => s + r.firstYearValue, 0), p0.firstYearValue);

const mover = D.enquiries.find((e) => e.channel && e.campaign && e.stage === 'New' && e.rent && e.unitId);
const moveState = { moves: { [mover.id]: { stage: 'Signed', at: '2026-10-31T15:00:00+08:00', rent: mover.rent, start: '2026-12-01' } } };
const beforeCamp = totalRow(campaignRows(D, {}, mover.campaign, {}));
const afterCamp = totalRow(campaignRows(D, moveState, mover.campaign, {}));
check('Live signing adds one tenancy', afterCamp.signed - beforeCamp.signed, 1);
check('Live signing leaves enquiries', afterCamp.enquiries, beforeCamp.enquiries);
check('Live signing leaves viewings', afterCamp.viewings, beforeCamp.viewings);
check('Live signing adds first-year value', afterCamp.firstYearValue - beforeCamp.firstYearValue, mover.rent * 12);
const beforeCh = campaignRows(D, {}, mover.campaign, {}).find((r) => r.channel === mover.channel);
const afterCh = campaignRows(D, moveState, mover.campaign, {}).find((r) => r.channel === mover.channel);
check('Live signing is on its channel', afterCh.signed - beforeCh.signed, 1);
check('Live signing channel value', afterCh.firstYearValue - beforeCh.firstYearValue, mover.rent * 12);
const beforeAsset = assetMarketing(D, {}, mover.asset, {});
const afterAsset = assetMarketing(D, moveState, mover.asset, {});
check('Live signing is on its asset', afterAsset.signed - beforeAsset.signed, 1);
check('Live signing asset value', afterAsset.firstYearValue - beforeAsset.firstYearValue, mover.rent * 12);
const movedUnit = liveUnits(D, moveState).find((u) => u.id === mover.unitId);
check('Live signing occupies the unit', `${movedUnit.status}/${movedUnit.rent}/${movedUnit.leaseStart}/${movedUnit.leaseExpiry}`, `Occupied/${mover.rent}/2026-12-01/2028-11-30`);

const negotiator = D.enquiries.find((e) => e.channel && e.stage === 'Contacted' && e.unitId && e.id !== mover.id);
const negState = { moves: { [negotiator.id]: { stage: 'Negotiation', at: '2026-10-31T12:00:00+08:00' } } };
check('Negotiation does not add a signing', totalRow(campaignRows(D, negState, negotiator.campaign, {})).signed, totalRow(campaignRows(D, {}, negotiator.campaign, {})).signed);
check('Negotiation reserves the unit', liveUnits(D, negState).find((u) => u.id === negotiator.unitId).status, 'Reserved');
const loser = D.enquiries.find((e) => e.channel && e.stage === 'Qualified' && e.id !== mover.id && e.id !== negotiator.id);
const lostState = { moves: { [loser.id]: { stage: 'Lost', at: '2026-10-31T16:00:00+08:00', lostReason: 'Price' } } };
check('Lost leaves signed unchanged', totalRow(campaignRows(D, lostState, loser.campaign, {})).signed, totalRow(campaignRows(D, {}, loser.campaign, {})).signed);
check('Lost leaves enquiries unchanged', totalRow(campaignRows(D, lostState, loser.campaign, {})).enquiries, totalRow(campaignRows(D, {}, loser.campaign, {})).enquiries);
check('Lost updates the board', liveEnquiries(D, lostState).find((e) => e.id === loser.id).stage, 'Lost');

const logCount = D.enquiries.reduce((s, e) => s + e.log.length, 0);
const stageCount = D.enquiries.reduce((s, e) => s + e.history.filter((h) => h[0] !== 'New').length, 0);
check('Every enquiry has a contact log', D.enquiries.every((e) => Array.isArray(e.log)), true);
check('Contact log entries match stages reached', logCount, stageCount);
check('Contacted entries sit on the first response', D.enquiries.filter((e) => e.firstResponseAt).every((e) => e.log.some((l) => l.at === e.firstResponseAt && (l.type === 'Call' || l.type === 'WhatsApp'))), true);
check('Lost entries use the record reason', D.enquiries.filter((e) => e.stage === 'Lost').every((e) => e.log.some((l) => l.text.includes(e.lostReason))), true);
const sample = D.enquiries[0];
const noted = contactLog(D, { notes: { [sample.id]: [{ type: 'Call', text: 'Called back.', at: '2026-10-31T18:00:00+08:00', by: 'aina' }] } }, sample.id);
check('Contact log keeps generated entries and adds the live note', noted.length, sample.log.length + 1);
check('Live note is in the contact log', noted.some((l) => l.text === 'Called back.'), true);

const roasDef = DEFINITIONS.find((d) => d.id === 'roas');
check('ROAS demo-assumption note', roasDef.note, "Demo assumption: first-year rental value of signed tenancies ÷ paid spend. PKNS's preferred definition to be confirmed.");
check('Every definition has a formula and source', DEFINITIONS.every((d) => d.id && d.name && d.formula && d.source), true);

const report = reportBlocks(D, {}, '2026-10');
check('Report October spend', report.block2.spend.current, p0.spend);
check('Report October enquiries', report.block2.paidEnquiries.current, p0.paidEnquiries);
check('Report October signed', report.block2.signed.current, p0.signed);
check('Report October first-year value', report.block2.firstYearValue.current, p0.firstYearValue);
check('Report October CPL', money2(report.block2.cpl.current), 121.3);
check('Report October ROAS', roas1(report.block2.roas.current), 12.4);
check('Report October renewals', `${report.block1.renewed.current}/${report.block1.expiring.current}`, '34/52');
check('Report October renewal rate', pct1(report.block1.renewalRate.current), 65.4);
check('Report October reversion', report.block1.reversionPct.current, 4.2);
const reportAfter = reportBlocks(D, { heroStage: 'Signed' }, '2026-10');
check('Report after enquiries', reportAfter.block2.paidEnquiries.current, 283);
check('Report after CPL', money2(reportAfter.block2.cpl.current), 120.87);
check('Report after signed', reportAfter.block2.signed.current, 10);
check('Report after ROAS', roas1(reportAfter.block2.roas.current), 13.6);
check('September marketing ignores an October hero', reportAfter.block2.paidEnquiries.previous, report.block2.paidEnquiries.previous);

const dash = marketingSummary(D, { heroStage: 'Signed' }, OCT);
check('Google Ads October spend', dash.google.spend, 14500);
check('Google Ads October CTR', pct1(dash.google.ctr), 3.8);
check('Google Ads October CPC', money2(dash.google.cpc), 1.41);
check('October website sessions', dash.website.sessions, 85000);
check('October website users', dash.website.users, 61000);
check('Main Facebook followers', dash.social.find((p) => p.id === 'pkns-fb').followers, 55200);
check('Main Instagram followers', dash.social.find((p) => p.id === 'pkns-ig').followers, 9650);

const k = leasingKpis(D.units);
console.log('\nComputed leasing figures (write these back to page 06 section 7):');
console.log('  WALE (years, by rent):', k.wale.toFixed(2));
console.log('  Lease expiry profile:', Object.entries(k.expiryPct).map(([a, b]) => `${a} ${(b * 100).toFixed(1)}%`).join('; '));
console.log('  Rent expiring next 12 months:', (k.rentNext12 * 100).toFixed(1) + '%');
console.log('  Median days vacant:', k.medianDaysVacant);
console.log('  Retail trade mix:', Object.entries(k.tradePct).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${(b * 100).toFixed(0)}%`).join(', '));
console.log('  Median first response (hours):', medianFirstResponseHours(D.enquiries).toFixed(1));
console.log('  Enquiries total:', D.enquiries.length, ' sources:', JSON.stringify(D.enquiries.reduce((m, e) => ((m[e.source] = (m[e.source] || 0) + 1), m), {})));

const signedUnits = liveUnits(D, { heroStage: 'Signed' });
const kSigned = leasingKpis(signedUnits, 'Signed');
console.log('\nAfter the hero is signed (recomputed; add these to page 06):');
console.log('  WALE (years, by rent):', kSigned.wale.toFixed(2));
console.log('  Lease expiry profile:', Object.entries(kSigned.expiryPct).map(([a, b]) => `${a} ${(b * 100).toFixed(1)}%`).join('; '));
console.log('  Rent expiring next 12 months:', (kSigned.rentNext12 * 100).toFixed(1) + '%');
console.log('  Median days vacant:', kSigned.medianDaysVacant);
console.log('  Median first response (hours):', medianFirstResponseHours(liveEnquiries(D, { heroStage: 'Signed' })).toFixed(1));
console.log(`\n${fails ? fails + ' FAILED' : 'ALL CHECKS PASSED'}`);
process.exit(fails ? 1 : 0);

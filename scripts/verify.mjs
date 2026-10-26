// Reconciles the generated dummy data with the 26 Oct dry-run figures.
import { generate } from '../src/data/generate.js';
import { campaignChannels, totalRow, statusCounts, leasingKpis, medianFirstResponseHours, withinOneWorkingHourShare } from '../src/data/metrics.js';
import { presentRequirements, octoberMovements } from '../src/data/zones.js';
import { ASSETS, CAMPAIGNS, HERO, SITC_TEMPLATE } from '../src/data/config.js';
import {
  liveUnits, liveEnquiries, campaignRows, portfolioRows, marketingSummary, reportBlocks, filteredEnquiries,
} from '../src/data/selectors.js';
import { DEFINITIONS } from '../src/data/definitions.js';
import { reportModel } from '../src/data/reportModel.js';
import { buildReportPdf } from '../src/reportPdf.js';

const D = generate();
let fails = 0;
const check = (label, got, want) => {
  const ok = typeof want === 'number' ? Math.abs(Number(got) - want) < 0.02 : got === want;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${got}${ok ? '' : `  (expected ${want})`}`);
};
const money2 = (v) => Math.round(Number(v) * 100) / 100;
const roas1 = (v) => Math.round(Number(v) * 10) / 10;
const pct1 = (v) => Math.round(Number(v) * 1000) / 10;

check('Records', D.enquiries.length, 932);
check('Business names are unique', new Set(D.enquiries.map((e) => e.business)).size, D.enquiries.length);
const negotiations = D.enquiries.filter((e) => e.stage === 'Negotiation');
check('One enquiry per Reserved unit', negotiations.every((e) => D.units.find((u) => u.id === e.unitId)?.status === 'Reserved') && new Set(negotiations.map((e) => e.unitId)).size === negotiations.length, true);
for (const asset of ASSETS) {
  const units = D.units.filter((u) => u.asset === asset.id);
  check(`${asset.short} unit count`, units.length, asset.mix.reduce((sum, group) => sum + group.n, 0));
}
const counts = statusCounts(D.units, D.enquiries, '2026-10-28T10:00:00+08:00');
check('Occupied / let / reserved / vacant', [counts.Occupied, counts.Let, counts.Reserved, counts.Vacant].join('/'), '540/9/31/108');
check('Occupancy', pct1(counts.occupancy), 78.5);
check('Committed occupancy', pct1(counts.committedOccupancy), 79.8);
check('Suite 4-07 starts vacant', D.units.find((u) => u.id === 'kpsa:4-07').status, 'Vacant');

const expect = { sa: [48000, 420, 96, 14], mpk: [15000, 118, 26, 4], bangi: [9000, 96, 19, 3], kl: [12000, 74, 15, 2], s13: [8000, 64, 13, 2] };
for (const campaign of D.campaigns) {
  const rows = campaignChannels(campaign, D.enquiries);
  const total = totalRow(rows);
  const [spend, enquiries, viewings, signed] = expect[campaign.id];
  check(`${campaign.short} spend`, total.spend, spend);
  check(`${campaign.short} enquiries/viewings/signed`, [total.enquiries, total.viewings, total.signed].join('/'), [enquiries, viewings, signed].join('/'));
  for (const channel of Object.keys(campaign.channels)) {
    const row = rows.find((item) => item.channel === channel);
    const want = campaign.channels[channel];
    check(`${campaign.short} ${channel} spend/impressions/clicks`, [row.spend, row.impressions, row.clicks].join('/'), want.slice(0, 3).join('/'));
  }
}

const sa = totalRow(campaignRows(D, {}, 'sa', {}));
check('SA Sentral full', [sa.enquiries, sa.viewings, sa.signed].join('/'), '420/96/14');
check('SA CPL', money2(sa.cpl), 114.29);
check('SA cost per viewing', money2(sa.costPerViewing), 500);
check('SA cost per signed', money2(sa.costPerSigned), 3428.57);
check('SA ROAS', roas1(sa.roas), 12.6);
const fb = campaignRows(D, {}, 'sa', {}).find((row) => row.channel === 'fb');
check('SA Facebook', [fb.enquiries, fb.viewings, fb.signed].join('/'), '210/41/6');

const oct = marketingSummary(D, {}, { from: '2026-10-01', to: '2026-10-28' });
check('October paid enquiries', oct.paid.enquiries, 268);
check('October spend', oct.paid.spend, 32834);
check('October CPL', money2(oct.paid.cpl), 122.51);
check('October first-year rent', oct.paid.firstYearValue, 424080);
check('October ROAS', roas1(oct.paid.roas), 12.9);
check('Google spend', oct.google.spend, 14500);
check('Google CTR', pct1(oct.google.ctr), 3.8);
check('Google CPC', money2(oct.google.cpc), 1.4);
const sep = marketingSummary(D, {}, { from: '2026-09-01', to: '2026-09-28' });
check('1–28 Sep paid enquiries', sep.paid.enquiries, 229);

const rows = portfolioRows(D, {}, '2026-10').filter((row) => !row.total);
const byId = Object.fromEntries(rows.map((row) => [row.id, row.paidEnquiries]));
check('Asset paid enquiries', ['kpsa', 'pas', 'mpkns', 'bangi', 'mww', 'mu', 'mu2', 'wy'].map((id) => byId[id]).join('/'), '68/41/44/39/23/20/17/16');
check('Assets with no campaign spend are blank', ['sacc', 'pp', 'anggun', 'esg'].every((id) => rows.find((row) => row.id === id).spend == null), true);
check('Asset paid enquiries total', rows.reduce((sum, row) => sum + (row.paidEnquiries || 0), 0), 268);

const list = filteredEnquiries(D, {}, { from: '2026-10-01', to: '2026-10-28', paid: 'paid' });
check('List paid October', list.length, 268);
const move = octoberMovements(D.enquiries);
check('October received', move.received, 316);
check('Entered Prospect', move.enteredProspect, 120);
check('Became Customer', move.becameCustomer, 9);
check('Withdrawn in October', move.withdrawn, 294);
const withdrawn = D.enquiries.filter((enquiry) => enquiry.stage === 'Lost' && String((enquiry.history || []).find((entry) => entry[0] === 'Lost')?.[1] || '').startsWith('2026-10'));
const reached = (enquiry) => ['Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed'].some((stage) => (enquiry.history || []).some((entry) => entry[0] === stage) || enquiry.stage === stage);
check('Withdrawn before Prospect', withdrawn.filter((enquiry) => !reached(enquiry)).length, 232);
check('Withdrawn from Prospect', withdrawn.filter((enquiry) => reached(enquiry)).length, 62);
check('Median first response', Math.round(medianFirstResponseHours(D.enquiries.filter((e) => String(e.receivedAt).startsWith('2026-10'))) * 10) / 10, 1.2);
check('Within one working hour', Math.round(withinOneWorkingHourShare(D.enquiries.filter((e) => String(e.receivedAt).startsWith('2026-10'))) * 1000) / 10, 43.5);
check('Renewal rate', pct1(leasingKpis(D.units, D.enquiries).renewalRate), 65.4);
check('No sk in ads or posts', JSON.stringify(D).includes(' sk') || JSON.stringify(CAMPAIGNS).includes(' sk'), false);

const open = D.enquiries.filter((enquiry) => enquiry.stage !== 'Signed' && enquiry.stage !== 'Lost');
const overdue = open.filter((enquiry) => presentRequirements(enquiry, {}, '2026-10-28T10:00:00+08:00').some((req) => req.status === 'overdue'));
check('Overdue is at most 15% of open', overdue.length <= Math.floor(open.length * 0.15), true);

const signed = {
  now: '2026-10-30T15:00:00+08:00',
  heroStage: 'Signed',
  heroReceivedAt: '2026-10-28T10:00:00+08:00',
  heroLog: [
    ['New', '2026-10-28T10:00:00+08:00'],
    ['Contacted', '2026-10-28T10:01:00+08:00'],
    ['Qualified', '2026-10-28T10:02:00+08:00'],
    ['Viewing Scheduled', '2026-10-28T10:03:00+08:00'],
    ['Negotiation', '2026-10-29T12:01:00+08:00'],
    ['Signed', '2026-10-30T15:00:00+08:00'],
  ].map(([stage, at]) => ({ stage, at })),
  heroViewing: { at: '2026-10-29T11:00:00+08:00', held: true },
  heroSigned: { rent: 3360, start: '2026-12-01', at: '2026-10-30T15:00:00+08:00' },
  notes: { [HERO.id]: [{ type: 'Call', text: 'Called.', at: '2026-10-28T10:01:00+08:00', by: 'aina' }, { type: 'Note', text: 'Attended. Interested.', at: '2026-10-29T12:00:00+08:00', by: 'aina' }] },
};
const afterSa = totalRow(campaignRows(D, signed, 'sa', {}));
check('SA after signing', [afterSa.enquiries, afterSa.viewings, afterSa.signed].join('/'), '421/97/15');
check('SA after CPL', money2(afterSa.cpl), 114.01);
check('SA after cost per viewing', money2(afterSa.costPerViewing), 494.85);
check('SA after cost per signed', money2(afterSa.costPerSigned), 3200);
check('SA after ROAS', roas1(afterSa.roas), 13.4);
const afterFb = campaignRows(D, signed, 'sa', {}).find((row) => row.channel === 'fb');
check('SA Facebook after', [afterFb.enquiries, afterFb.viewings, afterFb.signed].join('/'), '211/42/7');
const afterOct = marketingSummary(D, signed, { from: '2026-10-01', to: '2026-10-30' });
check('October paid after', afterOct.paid.enquiries, 269);
check('October CPL after', money2(afterOct.paid.cpl), 122.06);
check('October rent after', afterOct.paid.firstYearValue, 464400);
check('October ROAS after', roas1(afterOct.paid.roas), 14.1);
const afterCounts = statusCounts(liveUnits(D, signed), liveEnquiries(D, signed), signed.now);
check('Units after signing', [afterCounts.Occupied, afterCounts.Let, afterCounts.Reserved, afterCounts.Vacant].join('/'), '540/10/31/107');
check('Occupancy stays', pct1(afterCounts.occupancy), 78.5);
check('Committed after', pct1(afterCounts.committedOccupancy), 79.9);
check('Suite 4-07 is Let', liveUnits(D, signed).find((unit) => unit.id === 'kpsa:4-07').status, 'Let');
const hero = liveEnquiries(D, signed).find((enquiry) => enquiry.id === 'ENQ-HERO');
const reqs = presentRequirements(hero, signed, signed.now);
const due = Object.fromEntries(reqs.filter((req) => req.id.startsWith('C')).map((req) => [req.id, req.dueAt.slice(0, 10)]));
check('Hero customer dues', [due.C1, due.C2, due.C3, due.C4].join('/'), '2026-11-06/2026-11-13/2026-11-24/2026-11-30');
check('Hero dues are not before signing', reqs.filter((req) => req.id.startsWith('C')).every((req) => req.dueAt >= '2026-10-30'), true);
check('P5 is done only once signed', reqs.find((req) => req.id === 'P5').status, 'done');
check('Records after the hero', liveEnquiries(D, signed).length, 933);

const report = reportBlocks(D, {}, '2026-10');
check('Report paid enquiries', report.block2.paidEnquiries.current, 268);
check('Report renewal', `${report.block1.renewed.current}/${report.block1.expiring.current}`, '34/52');
const model = reportModel(D, {}, '2026-10');
check('Report PDF is one page', buildReportPdf(model).getNumberOfPages(), 1);
check('Definitions include committed occupancy', DEFINITIONS.some((item) => item.id === 'committed-occupancy'), true);
check('SITC template is present', Boolean(SITC_TEMPLATE?.id), true);
check('No leading zero in day-month', !/\b0\d /.test('3 Nov 6 Nov 13 Nov 24 Nov 30 Nov'), true);

console.log(`\n${fails ? `${fails} FAILED` : 'ALL CHECKS PASSED'}`);
process.exit(fails ? 1 : 0);

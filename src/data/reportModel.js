// Turns reportBlocks into the rows Screen 10, the Excel workbook and the PDF all share.
// The change column subtracts the rounded values as displayed.

import { MONTHS } from './config.js';
import { DEFINITIONS } from './definitions.js';
import { reportBlocks } from './selectors.js';
import { num, rm, rm2, pct, x, ratio, years, hours, pctStored, delta, displayedDelta } from '../format.js';

const FORMATS = { num, rm, rm2, pct, x, ratio, years, hours, pctStored };

export function formatReportValue(value, format, kind) {
  if (kind === 'future') return 'Future phase';
  const fn = FORMATS[format] || num;
  return fn(value);
}

function text(value, format) {
  return formatReportValue(value, format, 'pair');
}

function measure({
  id, label, term = null, current = null, previous = null, format = 'num', kind = 'pair', note = null,
}) {
  let previousText = '–';
  let changeText = '–';
  let changeValue = null;
  if (kind === 'snapshot') {
    previousText = 'Snapshot';
    changeText = '';
  } else if (kind === 'future') {
    previousText = '–';
    changeText = '';
  } else if (previous == null) {
    previousText = '–';
    changeText = '–';
  } else {
    previousText = text(previous, format);
    changeValue = displayedDelta(current, previous, format);
    changeText = delta(current, previous, format);
  }
  return {
    id,
    label,
    term,
    current: kind === 'future' ? null : current,
    previous: kind === 'pair' ? previous : null,
    change: kind === 'pair' ? changeValue : null,
    format,
    kind,
    note,
    currentText: formatReportValue(current, format, kind),
    previousText,
    changeText,
  };
}

function fromPair(id, label, pair, format, extra = {}) {
  return measure({
    id,
    label,
    current: pair?.current ?? null,
    previous: pair?.previous ?? null,
    change: pair?.change ?? null,
    format,
    ...extra,
  });
}

const NUMBER_COLUMNS = [
  { key: 'label', label: 'Measure' },
  { key: 'current', label: 'This month' },
  { key: 'previous', label: 'Last month' },
  { key: 'changeText', label: 'Change' },
];

const DEFINITION_COLUMNS = [
  { key: 'name', label: 'Measure' },
  { key: 'formula', label: 'Formula' },
  { key: 'source', label: 'Source' },
  { key: 'note', label: 'Note' },
];

export const BENCHMARK_NOTE = 'Residential references are indicative only and not shown as targets.';

function block1Rows(block) {
  const rows = [
    fromPair('occupancy', 'Occupancy', block.occupancy, 'pct', { term: 'occupancy' }),
    fromPair('vacant', 'Vacant units', block.vacant, 'num'),
    fromPair('new-leases', 'New leases', block.newLeases, 'num', { term: 'new-leases' }),
    fromPair('expiring', 'Leases expiring', block.expiring, 'num'),
    fromPair('renewed', 'Leases renewed', block.renewed, 'num'),
    fromPair('renewal', 'Renewal rate', block.renewalRate, 'pct', {
      term: 'renewal-rate',
      note: block.renewed?.current != null && block.expiring?.current != null
        ? `${num(block.renewed.current)} of ${num(block.expiring.current)}`
        : null,
    }),
    fromPair('reversion', 'Rental reversion', block.reversionPct, 'pctStored', { term: 'rental-reversion' }),
  ];
  const snapshot = block.snapshot;
  if (snapshot) {
    rows.push(measure({
      id: 'median-days', label: 'Median days vacant', term: 'days-vacant', current: snapshot.medianDaysVacant, format: 'num', kind: 'snapshot',
    }));
    rows.push(measure({
      id: 'wale', label: 'WALE', term: 'wale', current: snapshot.wale, format: 'years', kind: 'snapshot',
    }));
    const expiryKeys = Object.keys(snapshot.expiryPct || {});
    const expiryOrder = [
      expiryKeys.find((key) => key.startsWith('Nov')),
      expiryKeys.find((key) => key === '2027'),
      expiryKeys.find((key) => key.includes('later')),
    ].filter(Boolean);
    expiryOrder.forEach((label, index) => {
      rows.push(measure({
        id: `expiry-${index}`,
        label: `Lease expiry · ${label}`,
        term: 'lease-expiry',
        current: snapshot.expiryPct[label],
        format: 'pct',
        kind: 'snapshot',
      }));
    });
    rows.push(measure({
      id: 'rent-next-12', label: 'Rent expiring next 12 months', current: snapshot.rentNext12, format: 'pct', kind: 'snapshot',
    }));
    Object.entries(snapshot.tradePct || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([label, value]) => {
        rows.push(measure({
          id: `trade-${label}`,
          label: `Retail trade mix · ${label}`,
          current: value,
          format: 'pct',
          kind: 'snapshot',
        }));
      });
  }
  for (const label of block.future || []) {
    rows.push(measure({ id: `future-${label}`, label, kind: 'future' }));
  }
  return rows;
}

function block2Rows(block) {
  const rows = [
    fromPair('spend', 'Spend', block.spend, 'rm'),
    fromPair('paid-enquiries', 'Paid enquiries', block.paidEnquiries, 'num'),
  ];
  const names = Object.keys(block.bySource?.current || {});
  for (const name of names) {
    const current = block.bySource.current[name];
    const previous = block.bySource.previous ? block.bySource.previous[name] : null;
    rows.push(measure({
      id: `source-${name}`,
      label: name,
      current,
      previous,
      change: previous == null || current == null ? null : current - previous,
      format: 'num',
    }));
  }
  rows.push(
    fromPair('cpl', 'CPL', block.cpl, 'rm2', { term: 'cpl' }),
    fromPair('enquiry-to-viewing', 'Enquiry-to-viewing', block.enquiryToViewing, 'pct', { term: 'enquiry-to-viewing' }),
    fromPair('viewing-to-signed', 'Viewing-to-signed', block.viewingToSigned, 'pct', { term: 'viewing-to-signed' }),
    fromPair('enquiry-to-lease', 'Enquiry-to-lease', block.enquiryToLease, 'pct', { term: 'enquiry-to-lease' }),
    fromPair('cost-per-signed', 'Cost per signed tenant', block.costPerSigned, 'rm2', { term: 'cost-per-signed' }),
    fromPair('first-year-value', 'First-year rental value', block.firstYearValue, 'rm'),
    fromPair('signed', 'Signed', block.signed, 'num'),
    fromPair('roas', 'ROAS', block.roas, 'x', { term: 'roas' }),
    fromPair('response', 'Median first response', block.medianFirstResponse, 'hours', { term: 'first-response' }),
    fromPair('owned-to-paid', 'Owned-to-paid ratio', block.ownedToPaid, 'ratio', { term: 'owned-to-paid' }),
  );
  return rows;
}

function block3Rows(block) {
  const rows = [
    fromPair('sessions', 'Website sessions', block.sessions, 'num'),
    fromPair('users', 'Website users', block.users, 'num'),
  ];
  for (const source of block.sources?.current || []) {
    const previousList = block.sources.previous;
    const previous = previousList
      ? (previousList.find((item) => item.name === source.name)?.sessions ?? 0)
      : null;
    rows.push(measure({
      id: `web-${source.name}`,
      label: source.name,
      current: source.sessions,
      previous,
      change: previous == null ? null : source.sessions - previous,
      format: 'num',
    }));
  }
  for (const page of block.pages || []) {
    const followersChange = page.previousFollowers == null ? null : page.followers - page.previousFollowers;
    const reachChange = page.previousReach == null ? null : page.reach - page.previousReach;
    rows.push(measure({
      id: `followers-${page.id}`,
      label: `${page.page} · ${page.platform} · Followers`,
      current: page.followers,
      previous: page.previousFollowers,
      change: followersChange,
      format: 'num',
    }));
    rows.push(measure({
      id: `reach-${page.id}`,
      label: `${page.page} · ${page.platform} · Organic reach`,
      current: page.reach,
      previous: page.previousReach,
      change: reachChange,
      format: 'num',
    }));
  }
  rows.push(fromPair('engagements', 'Total engagements', block.engagements, 'num', { term: 'engagements' }));
  if (block.topPost) {
    rows.push(measure({
      id: 'top-post',
      label: `Top post · ${block.topPost.caption}`,
      current: block.topPost.reach,
      format: 'num',
    }));
  }
  return rows;
}

export function reportModel(data, state, month) {
  const blocks = reportBlocks(data, state, month);
  const monthLabel = MONTHS.find((item) => item.key === month)?.label || month;
  const banner = `${monthLabel} · Demo data`;
  const block1 = block1Rows(blocks.block1);
  const block2 = block2Rows(blocks.block2);
  const block3 = block3Rows(blocks.block3);
  const definitions = [
    ...DEFINITIONS.map((item) => ({
      name: item.name,
      formula: item.formula,
      source: item.source,
      note: item.note || '',
    })),
    { name: 'Benchmarks', formula: '', source: 'CDS calculation', note: BENCHMARK_NOTE },
  ];
  return {
    month,
    monthLabel,
    banner,
    previousMonth: blocks.previousMonth,
    block1,
    block2,
    block3,
    sheets: [
      { name: 'Portfolio and leasing', columns: NUMBER_COLUMNS, rows: block1 },
      { name: 'Marketing to tenancy', columns: NUMBER_COLUMNS, rows: block2 },
      { name: 'Digital reach', columns: NUMBER_COLUMNS, rows: block3 },
      { name: 'Definitions', columns: DEFINITION_COLUMNS, rows: definitions },
    ],
  };
}

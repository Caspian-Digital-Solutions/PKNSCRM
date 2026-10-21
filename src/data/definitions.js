// Metric definitions for Term, the report Definitions panel and the Excel Definitions sheet.
// Rules are page 04 section 5, as restated in BUILD_PROMPT.md section 6.1.

export const DEFINITIONS = [
  {
    id: 'cpl',
    name: 'CPL',
    formula: 'Paid spend ÷ paid enquiries',
    source: 'Page 04 §5',
    note: 'Unpaid enquiries are shown but never included in CPL or ROAS.',
  },
  {
    id: 'cost-per-viewing',
    name: 'Cost per viewing',
    formula: 'Paid spend ÷ viewings from paid enquiries',
    source: 'Page 04 §5',
  },
  {
    id: 'cost-per-signed',
    name: 'Cost per signed tenant',
    formula: 'Paid spend ÷ signed tenancies from paid enquiries',
    source: 'Page 04 §5',
  },
  {
    id: 'roas',
    name: 'ROAS',
    formula: 'First-year rental value of signed tenancies ÷ paid spend',
    source: 'Page 04 §5',
    note: 'Definition to be confirmed with PKNS.',
  },
  {
    id: 'occupancy',
    name: 'Occupancy %',
    formula: 'Occupied ÷ (total units − units under redevelopment). Event spaces are excluded entirely.',
    source: 'Page 04 §5',
  },
  {
    id: 'first-response',
    name: 'First response time',
    formula: 'First logged contact − enquiry received (median shown)',
    source: 'Page 04 §5',
  },
  {
    id: 'enquiry-to-viewing',
    name: 'Enquiry-to-viewing',
    formula: 'Viewings ÷ enquiries (paid)',
    source: 'Page 04 §5',
  },
  {
    id: 'viewing-to-signed',
    name: 'Viewing-to-signed',
    formula: 'Signed ÷ viewings (paid)',
    source: 'Page 04 §5',
  },
  {
    id: 'enquiry-to-lease',
    name: 'Enquiry-to-lease',
    formula: 'Signed ÷ enquiries (paid)',
    source: 'Page 04 §5',
  },
  {
    id: 'renewal-rate',
    name: 'Renewal rate',
    formula: 'Leases renewed ÷ leases expiring in the month',
    source: 'Page 04 §5',
  },
  {
    id: 'rental-reversion',
    name: 'Rental reversion',
    formula: 'Leasing records, monthly.',
    source: 'Page 04 §5',
  },
  {
    id: 'wale',
    name: 'WALE',
    formula: 'Σ(remaining years × monthly rent) ÷ Σ monthly rent, occupied units with leases',
    source: 'Page 04 §5',
  },
  {
    id: 'lease-expiry',
    name: 'Lease expiry profile',
    formula: 'Monthly rent expiring in Nov–Dec 2026 / 2027 / 2028 and later ÷ total contracted monthly rent',
    source: 'Page 04 §5',
  },
  {
    id: 'days-vacant',
    name: 'Days vacant',
    formula: 'As-at date − vacant since, for Vacant and Reserved units (median shown)',
    source: 'Page 04 §5',
  },
  {
    id: 'owned-to-paid',
    name: 'Owned-to-paid ratio',
    formula: 'Unpaid enquiries (website form, walk-in, referral) ÷ paid enquiries',
    source: 'Page 04 §5',
  },
  {
    id: 'engagements',
    name: 'Engagements',
    formula: 'Organic reach × engagement rate, rounded',
    source: 'Page 04 §5',
  },
  {
    id: 'follower-change',
    name: 'Follower change',
    formula: 'Followers this month − followers the previous month',
    source: 'Page 04 §5',
  },
  {
    id: 'new-leases',
    name: 'New leases',
    formula: 'Count of signed tenancies dated in the month',
    source: 'Page 04 §5',
  },
];

const PLAIN_SOURCE = {
  cpl: 'CDS calculation',
  'cost-per-viewing': 'CDS calculation',
  'cost-per-signed': 'CDS calculation',
  roas: 'CDS calculation',
  occupancy: 'Reported by Malaysian mall REITs, for example CapitaLand Malaysia Trust',
  'rental-reversion': 'Reported by Malaysian mall REITs, for example CapitaLand Malaysia Trust',
  'lease-expiry': 'Reported by Malaysian mall REITs, for example CapitaLand Malaysia Trust',
  wale: 'Reported by Malaysian mall REITs, for example CapitaLand Malaysia Trust',
  'renewal-rate': 'Leasing industry practice',
  'days-vacant': 'Leasing industry practice',
  'enquiry-to-viewing': 'Leasing industry practice',
  'viewing-to-signed': 'Leasing industry practice',
  'enquiry-to-lease': 'Leasing industry practice',
  'first-response': 'Leasing industry practice',
  'owned-to-paid': 'Leasing industry practice',
  engagements: 'CDS calculation',
  'follower-change': 'CDS calculation',
  'new-leases': 'CDS calculation',
};
for (const item of DEFINITIONS) item.source = PLAIN_SOURCE[item.id] || 'CDS calculation';

const BY_ID = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d]));

export function definitionById(id) {
  return BY_ID[id] || null;
}

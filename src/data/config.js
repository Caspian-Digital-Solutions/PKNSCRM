// Source of truth: Confluence PCD page 06 (Dummy Data Specification). Every figure is dummy.

// Demo clock. The demo opens on the pitch day, Wed 28 Oct 2026 at 10:00 (Malaysia time).
// Every record, spend figure and status is generated as at this moment; nothing exists after it.
export const DEMO_START = '2026-10-28T10:00:00+08:00';
export const AS_AT = '2026-10-28'; // the date part of DEMO_START, used for day arithmetic
export const LAST_DAY_SHARE = 0.4; // 28 Oct is a part day (midnight to 10:00): it gets 40% of a normal day's volume
export const PERIOD = { start: '2026-07-01', end: AS_AT };
export const MONTHS = [
  { key: '2026-07', label: 'July 2026' },
  { key: '2026-08', label: 'August 2026' },
  { key: '2026-09', label: 'September 2026' },
  { key: '2026-10', label: 'October 2026' },
];

export const OFFICERS = {
  aina: { id: 'aina', name: 'Aina Rahman', initials: 'AR', area: 'Section 14' },
  hafiz: { id: 'hafiz', name: 'Hafiz Kamal', initials: 'HZ', area: 'Petaling Jaya, Kuala Lumpur, Kota Damansara' },
  izzati: { id: 'izzati', name: 'Siti Nur Izzati', initials: 'SN', area: 'Bangi' },
  huda: { id: 'huda', name: 'Nurul Huda Azman', initials: 'NH', area: 'Section 13 and Shah Alam' },
};

// mix: unit groups per asset. floors listed bottom to top; sizes in sq ft; psf = asking rent RM per sq ft per month.
export const ASSETS = [
  { id: 'kpsa', name: 'Kompleks PKNS Shah Alam', short: 'Kompleks PKNS SA', type: 'Retail and office complex', location: 'Section 14, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'SA Sentral', officer: 'aina',
    counts: { occupied: 92, reserved: 6, vacant: 22, redev: 0 },
    mix: [ { use: 'Retail', n: 96, floors: ['G', '1', '2'], size: [300, 1500], psf: [4.0, 9.0] }, { use: 'Office', n: 24, floors: ['3', '4'], size: [800, 2400], psf: [2.2, 3.0] } ] },
  { id: 'pas', name: 'Plaza Alam Sentral', short: 'Plaza Alam Sentral', type: 'Shopping mall', location: 'Section 14, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'SA Sentral', officer: 'aina',
    counts: { occupied: 150, reserved: 10, vacant: 20, redev: 0 },
    mix: [ { use: 'Retail', n: 180, floors: ['LG', 'G', '1', '2', '3'], size: [250, 3000], psf: [5.0, 12.0] } ] },
  { id: 'sacc', name: 'SACC Mall', short: 'SACC Mall', type: 'Shopping mall', location: 'Section 14, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'SA Sentral', officer: 'aina',
    counts: { occupied: 0, reserved: 0, vacant: 0, redev: 150 },
    note: 'Under redevelopment. Traders relocating: 112 of 150 relocated to Plaza Alam Sentral or Datum Jelatek',
    mix: [ { use: 'Retail', n: 150, floors: ['LG', 'G', '1', '2'], size: [100, 1200], psf: null } ] },
  { id: 'bangi', name: 'Kompleks PKNS Bangi', short: 'Kompleks PKNS Bangi', type: 'Retail and office complex', location: 'Bandar Baru Bangi', area: 'Bangi', entity: 'PREC', grouping: null, officer: 'izzati',
    counts: { occupied: 72, reserved: 3, vacant: 15, redev: 0 },
    mix: [ { use: 'Retail', n: 60, floors: ['G', '1'], size: [300, 1400], psf: [3.0, 7.0] }, { use: 'Office', n: 30, floors: ['2', '3'], size: [700, 2000], psf: [2.0, 2.8] } ] },
  { id: 'mpkns', name: 'Menara PKNS', short: 'Menara PKNS', type: 'Office tower', location: 'Petaling Jaya', area: 'Petaling Jaya', entity: 'PREC', grouping: null, officer: 'hafiz',
    counts: { occupied: 51, reserved: 2, vacant: 7, redev: 0 },
    mix: [ { use: 'Office', n: 60, floors: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], size: [800, 6100], psf: [3.5, 4.5] } ] },
  { id: 'mww', name: 'Menara Worldwide', short: 'Menara Worldwide', type: 'Office tower', location: 'Bukit Bintang, Kuala Lumpur', area: 'Kuala Lumpur', entity: 'PREC', grouping: null, officer: 'hafiz',
    counts: { occupied: 39, reserved: 2, vacant: 7, redev: 0 },
    mix: [ { use: 'Office', n: 48, floors: ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'], size: [900, 4000], psf: [4.5, 6.0] } ] },
  { id: 'wy', name: 'Wisma Yakin', short: 'Wisma Yakin', type: 'Office building', location: 'Kuala Lumpur', area: 'Kuala Lumpur', entity: 'PREC', grouping: null, officer: 'hafiz',
    counts: { occupied: 22, reserved: 1, vacant: 7, redev: 0 },
    mix: [ { use: 'Office', n: 30, floors: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], size: [600, 2400], psf: [2.5, 3.5] } ] },
  { id: 'pp', name: 'Plaza Perangsang', short: 'Plaza Perangsang', type: 'Office building', location: 'Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: null, officer: 'huda',
    counts: { occupied: 31, reserved: 2, vacant: 7, redev: 0 },
    mix: [ { use: 'Office', n: 40, floors: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], size: [1200, 12200], psf: [3.0, 4.2] } ] },
  { id: 'mu', name: 'Menara U', short: 'Menara U', type: 'Office and shop offices', location: 'Section 13, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'Seksyen 13', officer: 'huda',
    counts: { occupied: 28, reserved: 1, vacant: 7, redev: 0 },
    mix: [ { use: 'Shop office', n: 12, floors: ['G'], size: [1200, 2200], psf: [2.4, 2.8] }, { use: 'Office', n: 24, floors: ['1', '2', '3', '4', '5', '6'], size: [1000, 2000], psf: [2.4, 2.8] } ] },
  { id: 'mu2', name: 'Menara U2', short: 'Menara U2', type: 'Office and shop offices', location: 'Section 13, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'Seksyen 13', officer: 'huda',
    counts: { occupied: 25, reserved: 2, vacant: 5, redev: 0 },
    mix: [ { use: 'Shop office', n: 8, floors: ['G'], size: [1100, 2000], psf: [2.3, 2.7] }, { use: 'Office', n: 24, floors: ['1', '2', '3', '4', '5', '6'], size: [900, 1800], psf: [2.3, 2.7] } ] },
  { id: 'anggun', name: 'Anggun Avenue', short: 'Anggun Avenue', type: 'Shop lots', location: 'Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: null, officer: 'huda',
    counts: { occupied: 19, reserved: 1, vacant: 4, redev: 0 },
    mix: [ { use: 'Shop lot', n: 24, floors: ['G', '1'], size: [1200, 1600], psf: [0.5, 1.2] } ] },
  { id: 'esg', name: 'Encorp Strand Garden Office', short: 'Encorp Strand Garden', type: 'Garden offices', location: 'Kota Damansara', area: 'Petaling Jaya', entity: 'PREC', grouping: null, officer: 'hafiz',
    counts: { occupied: 20, reserved: 1, vacant: 7, redev: 0 },
    mix: [ { use: 'Office', n: 28, floors: ['G', '1', '2', '3'], size: [1000, 3000], psf: [2.5, 3.5] } ] },
];

export const SITC_TEMPLATE = {
  id: 'sitc', name: 'Selangor International Trade Centre (SITC)', short: 'SITC', type: 'Event space', location: 'Section 14, Shah Alam', area: 'Shah Alam', entity: 'PREC', grouping: 'SA Sentral', officer: 'aina',
  spaces: [
    { name: 'Hall A', size: 'about 5,000 sqm', rate: 18000, basis: 'per day' },
    { name: 'Hall B', size: 'about 3,000 sqm', rate: 11000, basis: 'per day' },
    { name: 'Meeting Room 1', size: 'about 120 sqm', rate: 1200, basis: 'per day' },
  ],
};

export const CHANNELS = [
  { id: 'fb', name: 'Facebook lead ads', source: 'Facebook Lead Ad' },
  { id: 'ig', name: 'Instagram ads', source: 'Instagram' },
  { id: 'gads', name: 'Google Ads (Search)', source: 'Google Ads' },
  { id: 'boost', name: 'Boosted posts (FB/IG)', source: 'Boosted post' },
];

// Ad names only. No figures. The hero keeps HERO.ad exactly.
export const AD_CREATIVES = {
  sa:    { fb: { adSet: 'SA Sentral – Pemilik Perniagaan 25–55, Shah Alam 15km', ads: ['Ruang Pejabat di SA Sentral – Sewa dari RM2.80 psf', 'Lot Kedai Kompleks PKNS – Lokasi Strategik Seksyen 14', 'Ruang Niaga di Plaza Alam Sentral – Lokasi Utama Seksyen 14'] },
           ig: { adSet: 'SA Sentral – Usahawan Muda, Klang Valley', ads: ['Mulakan Perniagaan Anda di SA Sentral'] },
           gads:{ adSet: 'Sewa pejabat Shah Alam', ads: ['Sewa Pejabat Shah Alam | Dari RM2.80 psf | Kompleks PKNS'] },
           boost:{ adSet: 'Boosted – SA Sentral', ads: ['SA Sentral: Wajah Baharu Seksyen 14'] } },
  mpk:   { fb: { adSet: 'Menara PKNS – Syarikat PJ & KL', ads: ['Pejabat Siap Diduduki di Menara PKNS, PJ'] }, ig: { adSet: 'Menara PKNS – Profesional', ads: ['Ruang Pejabat PJ dengan Pemandangan Bandar'] }, gads: { adSet: 'Office space Petaling Jaya', ads: ['Office for Rent Petaling Jaya | Menara PKNS'] }, boost: { adSet: 'Boosted – Menara PKNS', ads: ['Ruang Pejabat Menara PKNS – Sewa Sekarang'] } },
  bangi: { fb: { adSet: 'Bangi – Peniaga Tempatan', ads: ['Lot Kedai untuk Disewa di Kompleks PKNS Bangi'] }, ig: { adSet: 'Bangi – Usahawan', ads: ['Buka Kedai Anda di Bandar Baru Bangi'] }, gads: { adSet: 'Kedai sewa Bangi', ads: ['Lot Kedai Sewa Bangi | Kompleks PKNS'] }, boost: { adSet: 'Boosted – Bangi', ads: ['Kompleks PKNS Bangi Kini Menerima Penyewa Baharu'] } },
  kl:    { fb: { adSet: 'KL – Syarikat Korporat', ads: ['Pejabat Strategik di Bukit Bintang'] }, ig: { adSet: 'KL – Startup', ads: ['Pejabat Anda di Tengah KL'] }, gads: { adSet: 'Office rent Kuala Lumpur', ads: ['Office for Rent Kuala Lumpur | Menara Worldwide'] }, boost: { adSet: 'Boosted – Pejabat KL', ads: ['Pejabat Strategik di Kuala Lumpur'] } },
  s13:   { fb: { adSet: 'Seksyen 13 – PKS', ads: ['Pejabat di Menara U, Seksyen 13 – dari RM2.40 psf'] }, ig: { adSet: 'Seksyen 13 – Usahawan', ads: ['Ruang Niaga Seksyen 13'] }, gads: { adSet: 'Pejabat sewa Seksyen 13', ads: ['Sewa Pejabat Seksyen 13 Shah Alam | Menara U'] }, boost: { adSet: 'Boosted – Seksyen 13', ads: ['Ruang Niaga Seksyen 13 – Menara U & U2'] } },
};

// Channel totals over each campaign period: spend (RM), impressions, clicks, paid enquiries, viewings, signed.
export const CAMPAIGNS = [
  { id: 'sa', name: 'SA Sentral: Ruang Niaga Baharu Seksyen 14', short: 'SA Sentral', start: '2026-07-01', end: '2026-10-31', assets: { kpsa: 0.55, pas: 0.45 },
    channels: { fb: [19200, 860000, 12400, 210, 41, 6], ig: [7200, 420000, 4300, 63, 14, 2], gads: [16800, 310000, 11900, 112, 33, 5], boost: [4800, 510000, 2900, 35, 8, 1] },
    googleByMonth: { '2026-07': 3800, '2026-08': 4000, '2026-09': 4200, '2026-10': 4800 },
    unpaid: { 'Website form': 34, 'Walk-in': 15, Referral: 9 } },
  { id: 'mpk', name: 'Ruang Pejabat Menara PKNS – Sewa Sekarang', short: 'Menara PKNS', start: '2026-08-01', end: '2026-10-31', assets: { mpkns: 1 },
    channels: { fb: [5000, 225000, 3510, 40, 8, 1], ig: [1500, 87000, 960, 10, 2, 0], gads: [7500, 138750, 4580, 60, 14, 3], boost: [1000, 106000, 660, 8, 2, 0] },
    googleByMonth: { '2026-08': 2100, '2026-09': 2400, '2026-10': 3000 },
    unpaid: { 'Website form': 9, 'Walk-in': 4, Referral: 3 } },
  { id: 'bangi', name: 'Lot Kedai untuk Disewa – Kompleks PKNS Bangi', short: 'Kompleks PKNS Bangi', start: '2026-08-15', end: '2026-10-31', assets: { bangi: 1 },
    channels: { fb: [4500, 202500, 2650, 55, 10, 2], ig: [1500, 87000, 790, 14, 3, 0], gads: [2500, 46250, 1980, 22, 5, 1], boost: [500, 53000, 270, 5, 1, 0] },
    googleByMonth: { '2026-08': 500, '2026-09': 900, '2026-10': 1100 },
    unpaid: { 'Website form': 7, 'Walk-in': 5, Referral: 2 } },
  { id: 'kl', name: 'Pejabat Strategik di Kuala Lumpur', short: 'Pejabat KL', start: '2026-09-01', end: '2026-10-31', assets: { mww: 0.6, wy: 0.4 },
    channels: { fb: [3000, 135000, 2080, 20, 4, 0], ig: [1000, 58000, 640, 6, 1, 0], gads: [7000, 129500, 5110, 44, 9, 2], boost: [1000, 106000, 560, 4, 1, 0] },
    googleByMonth: { '2026-09': 3300, '2026-10': 3700 },
    unpaid: { 'Website form': 5, 'Walk-in': 2, Referral: 2 } },
  { id: 's13', name: 'Ruang Niaga Seksyen 13 – Menara U & U2', short: 'Seksyen 13', start: '2026-09-01', end: '2026-10-31', assets: { mu: 0.55, mu2: 0.45 },
    channels: { fb: [3500, 157500, 2120, 30, 6, 1], ig: [1000, 58000, 530, 8, 2, 0], gads: [3000, 55500, 2260, 22, 4, 1], boost: [500, 53000, 330, 4, 1, 0] },
    googleByMonth: { '2026-09': 1100, '2026-10': 1900 },
    unpaid: { 'Website form': 4, 'Walk-in': 2, Referral: 2 } },
];

// Signed tenancies from paid enquiries (25). Monthly rents add up to each campaign's first-year rental value ÷ 12.
export const SIGNED = [
  ['sa', 'fb', 'kpsa', 'Office', 2940, '2026-08-12'], ['sa', 'fb', 'kpsa', 'Retail', 4200, '2026-08-27'],
  ['sa', 'fb', 'pas', 'Retail', 5400, '2026-09-08'], ['sa', 'fb', 'pas', 'Retail', 3600, '2026-09-22'],
  ['sa', 'fb', 'kpsa', 'Retail', 2880, '2026-10-06'], ['sa', 'fb', 'pas', 'Retail', 4500, '2026-10-20'],
  ['sa', 'ig', 'kpsa', 'Retail', 3000, '2026-09-15'], ['sa', 'ig', 'pas', 'Retail', 3960, '2026-10-13'],
  ['sa', 'gads', 'kpsa', 'Office', 2640, '2026-07-29'], ['sa', 'gads', 'kpsa', 'Office', 3080, '2026-08-19'],
  ['sa', 'gads', 'pas', 'Retail', 6000, '2026-09-03'], ['sa', 'gads', 'kpsa', 'Retail', 3240, '2026-09-29'],
  ['sa', 'gads', 'pas', 'Retail', 3600, '2026-10-16'], ['sa', 'boost', 'kpsa', 'Retail', 1360, '2026-08-31'],
  ['mpk', 'fb', 'mpkns', 'Office', 3900, '2026-09-10'], ['mpk', 'gads', 'mpkns', 'Office', 4500, '2026-09-24'],
  ['mpk', 'gads', 'mpkns', 'Office', 4050, '2026-10-08'], ['mpk', 'gads', 'mpkns', 'Office', 4350, '2026-10-22'],
  ['bangi', 'fb', 'bangi', 'Retail', 2700, '2026-09-17'], ['bangi', 'fb', 'bangi', 'Retail', 3300, '2026-10-14'],
  ['bangi', 'gads', 'bangi', 'Office', 3000, '2026-09-25'],
  ['kl', 'gads', 'mww', 'Office', 6200, '2026-09-21'], ['kl', 'gads', 'wy', 'Office', 4800, '2026-10-09'],
  ['s13', 'fb', 'mu', 'Office', 3900, '2026-10-05'], ['s13', 'gads', 'mu2', 'Office', 3000, '2026-09-28'],
].map(([campaign, channel, asset, use, rent, date], i) => ({ id: `T${String(i + 1).padStart(3, '0')}`, campaign, channel, asset, use, rent, date }));

export const HERO = {
  id: 'ENQ-HERO',
  business: 'Teras Niaga Consulting Sdn Bhd',
  contact: 'Encik Faizal Hamdan',
  title: 'Director',
  phone: '012-388 4712',
  email: 'faizal@terasniaga.com.my',
  asset: 'kpsa', lot: '4-07', use: 'Office', size: 1200, psf: 2.8, rent: 3360,
  source: 'Facebook Lead Ad', channel: 'fb', campaign: 'sa',
  ad: 'Ruang Pejabat di SA Sentral – Sewa dari RM2.80 psf',
  officer: 'aina', preferredSize: '1,000–1,500 sq ft office', budget: 'Up to RM3,500 per month',
  signedTerms: { rent: 3360, start: '2026-12-01', term: '2 years' },
};

export const SOCIAL_PAGES = [
  { id: 'pkns-fb', page: 'PKNS (main)', platform: 'Facebook', followers: 55200, reachOct: 180000, er: 3.1 },
  { id: 'pkns-ig', page: 'PKNS (main)', platform: 'Instagram', followers: 9650, reachOct: 38000, er: 4.2 },
  { id: 'kpsa-fb', page: 'Kompleks PKNS Shah Alam', platform: 'Facebook', followers: 18400, reachOct: 41000, er: 3.6 },
  { id: 'sacc-fb', page: 'SACC Mall', platform: 'Facebook', followers: 24600, reachOct: 52000, er: 4.4 },
  { id: 'pas-fb', page: 'Plaza Alam Sentral', platform: 'Facebook', followers: 12800, reachOct: 27000, er: 3.2 },
  { id: 'pas-ig', page: 'Plaza Alam Sentral', platform: 'Instagram', followers: 4200, reachOct: 9800, er: 4.9 },
  { id: 'bangi-fb', page: 'Kompleks PKNS Bangi', platform: 'Facebook', followers: 6900, reachOct: 11500, er: 2.8 },
  { id: 'mu-fb', page: 'Menara U & U2', platform: 'Facebook', followers: 2300, reachOct: 4100, er: 2.1 },
];

// Top posts in October. Each post is tagged with the assets and campaign it promotes, so the asset and campaign filters apply to it.
export const TOP_POSTS = [
  { caption: 'SA Sentral: Wajah Baharu Seksyen 14', channel: 'Facebook', type: 'Video', reach: 64000, engagements: 2900, clicks: 1150, boosted: 1200, assets: ['kpsa', 'pas'], campaign: 'sa' },
  { caption: 'Ruang pejabat siap untuk diduduki di Kompleks PKNS Shah Alam', channel: 'Instagram', type: 'Carousel', reach: 21000, engagements: 1050, clicks: 380, boosted: 600, assets: ['kpsa'], campaign: 'sa' },
  { caption: 'Peniaga SACC Mall kini di Plaza Alam Sentral', channel: 'Facebook', type: 'Photo', reach: 41000, engagements: 2300, clicks: 640, boosted: 0, assets: ['sacc', 'pas'], campaign: null },
  { caption: 'SITC: Destinasi Pameran Baharu Selangor', channel: 'Instagram', type: 'Reel', reach: 33000, engagements: 1600, clicks: 290, boosted: 800, assets: ['sitc'], campaign: null },
  { caption: 'Lot kedai di Kompleks PKNS Bangi – lokasi strategik', channel: 'Facebook', type: 'Photo', reach: 14800, engagements: 620, clicks: 260, boosted: 400, assets: ['bangi'], campaign: 'bangi' },
  { caption: 'Pejabat di Menara PKNS, Petaling Jaya – sedia diduduki', channel: 'Facebook', type: 'Carousel', reach: 12600, engagements: 480, clicks: 210, boosted: 350, assets: ['mpkns'], campaign: 'mpk' },
  { caption: 'Pejabat strategik di Bukit Bintang', channel: 'Instagram', type: 'Photo', reach: 8700, engagements: 390, clicks: 150, boosted: 250, assets: ['mww', 'wy'], campaign: 'kl' },
  { caption: 'Pejabat di Menara U, Seksyen 13 – dari RM2.40 psf', channel: 'Facebook', type: 'Photo', reach: 9200, engagements: 310, clicks: 140, boosted: 300, assets: ['mu', 'mu2'], campaign: 's13' },
];

export const WEBSITE_OCT = {
  sessions: 85000, users: 61000,
  sources: { 'Organic search': 46, 'Paid search': 18, Social: 17, Direct: 14, Referral: 5 },
  topPages: [
    ['Property for rent listing', 21400], ['Property for sale listing', 14800], ['SA Sentral page', 9600],
    ['Contact us', 6100], ['Kompleks PKNS Shah Alam page', 4700],
  ],
};

// Lease renewals by month (page 06 section 7). New leases per month are counted from SIGNED, not stored here.
export const LEASING_BY_MONTH = {
  '2026-07': { expiring: 44, renewed: 27, reversionPct: 3.1 },
  '2026-08': { expiring: 49, renewed: 30, reversionPct: 3.4 },
  '2026-09': { expiring: 47, renewed: 29, reversionPct: 3.6 },
  '2026-10': { expiring: 52, renewed: 34, reversionPct: 4.2 },
};
export const LEASING_OCT = { ...LEASING_BY_MONTH['2026-10'], newLeases: 9 };

export const PIPELINE_STAGES = ['New', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Negotiation', 'Signed', 'Lost'];

// Audience zones group the stages. Stages stay the unit of work.
export const ZONES = [
  { id: 'suspect', n: 1, label: 'Suspect', stages: ['New', 'Contacted'] },
  { id: 'prospect', n: 2, label: 'Prospect', stages: ['Qualified', 'Viewing Scheduled', 'Negotiation'] },
  { id: 'customer', n: 3, label: 'Customer', stages: ['Signed'] },
];
export const WITHDRAWN_STAGE = 'Lost';
export const AS_AT_END = DEMO_START;

export const ZONE_RULES = {
  requirements: [
    { id: 'S1', zone: 'suspect', title: 'First contact', due: '1 working hour after received', doneWhen: 'First call, WhatsApp or email is logged' },
    { id: 'S2', zone: 'suspect', title: 'Confirm the need: use, size, budget, move-in', due: '2 days', doneWhen: 'All four fields are filled (lead-form answers count)' },
    { id: 'S3', zone: 'suspect', title: 'Match a unit and send the rate card', due: '3 days', doneWhen: 'A unit is linked and a rate card note or email is logged' },
    { id: 'P1', zone: 'prospect', title: 'Book the viewing', due: '3 days', doneWhen: 'Viewing date set' },
    { id: 'P2', zone: 'prospect', title: 'Log the viewing outcome', due: '1 working day after the viewing', doneWhen: 'Outcome note logged (Attended, No-show or Rescheduled)' },
    { id: 'P3', zone: 'prospect', title: 'Collect business documents', due: '7 days', doneWhen: 'SSM certificate, director IC and company profile are ticked', documents: ['SSM certificate', 'Director IC', 'Company profile'] },
    { id: 'P4', zone: 'prospect', title: 'Agree terms: rent, term, fit-out period', due: '10 days', doneWhen: 'Terms filled' },
    { id: 'P5', zone: 'prospect', title: 'Offer letter accepted', due: '14 days', doneWhen: 'Ticked' },
    { id: 'C1', zone: 'customer', title: "Deposit received (2 months' rent + 1 month utilities)", due: '7 days', doneWhen: 'Ticked' },
    { id: 'C2', zone: 'customer', title: 'Tenancy agreement signed and stamping submitted', due: '14 days', doneWhen: 'Ticked' },
    { id: 'C3', zone: 'customer', title: 'Handover date and access cards arranged', due: '7 days before the start date', doneWhen: 'Date set' },
    { id: 'C4', zone: 'customer', title: 'Tenant record ready for property management', due: 'The day before the lease starts', doneWhen: 'Ticked. This enables Hand over' },
  ],
  qualifiers: [
    { id: 'need', from: 'suspect', to: 'Prospect', label: 'Need stated', when: 'Use and size are known' },
    { id: 'budget', from: 'suspect', to: 'Prospect', label: 'Budget fits', when: "Budget is at least 80% of the matched unit's asking rent" },
    { id: 'movein', from: 'suspect', to: 'Prospect', label: 'Move-in within 6 months', when: 'Move-in month is within 6 months of the demo clock' },
    { id: 'reachable', from: 'suspect', to: 'Prospect', label: 'Reachable', when: 'First contact is logged' },
    { id: 'attended', from: 'prospect', to: 'Customer', label: 'Viewing attended', when: 'Viewing outcome is Attended' },
    { id: 'documents', from: 'prospect', to: 'Customer', label: 'Documents complete', when: 'Business documents are complete' },
    { id: 'terms', from: 'prospect', to: 'Customer', label: 'Terms agreed', when: 'Rent, term and fit-out are filled' },
  ],
  triggers: [
    { id: 'T1', when: 'A new enquiry arrives', then: 'Assign by the round-robin rule, create S1 to S3, and show New Suspect: {business}' },
    { id: 'T2', when: 'First contact is still open 1 working hour after the enquiry arrived', then: 'Show First contact overdue on the card and the record, and notify the officer' },
    { id: 'T3', when: 'A Suspect has no reply 7 days after first contact', then: 'Create a task Follow up, due today' },
    { id: 'T4', when: 'The viewing date has passed and no outcome is logged', then: 'P2 becomes Overdue, and notify the officer' },
    { id: 'T5', when: 'The offer was sent and there is no reply after 5 days', then: 'Create a task Chase offer' },
    { id: 'T6', when: 'The enquiry moves to Signed', then: 'The zone becomes Customer, C1 to C4 are created, and show {business} became a Customer' },
    { id: 'T7', when: 'Withdrawn with reason Timing', then: 'Set the re-engage date 60 days later. The date is shown. Nothing moves in this demo.' },
  ],
  assignment: "Round robin within the asset's officer team. In this demo each asset has one officer, so the officer already on the enquiry is the result.",
  mappingNote: 'Configurable for each client in the full system. PKNS to confirm stages on 28 Oct.',
};
// Why an enquiry was withdrawn. Before a viewing most enquiries simply stop replying; after a viewing the reasons are commercial.
export const LOST_REASONS_BEFORE_VIEWING = [['No response', 45], ['Price', 20], ['Size', 15], ['Location', 10], ['Timing', 10]];
export const LOST_REASONS_AFTER_VIEWING = [['Price', 37], ['Size', 21], ['Location', 16], ['Timing', 26]];
// Enquiries that are not linked to any campaign (WhatsApp, walk-ins and calls, website form), 1 Jul to 28 Oct.
export const NON_CAMPAIGN = { total: 52, sources: [['WhatsApp', 45], ['Walk-in / call', 35], ['Website form', 20]] };

// Single source for PKNS names. Asset names came from a meeting transcript.
// VERIFY NAME — confirm each asset name before this prototype is treated as final.

export const AS_OF = '2026-10-28';
export const AS_OF_ISO = '2026-10-28T09:00:00+08:00';
export const CONSENT_VERSION = '2026-04';
export const PROFILE_TARGET = 16000;
export const LEGACY_PROFILES = 10872;
export const NEW_PROFILES_2026 = 5128;
export const CONSENT_UNKNOWN = 6430;
export const IMPORT_ROWS = 13214;
export const IMPORT_MERGED = 1906;
export const IMPORT_REJECTED = 436;

export const ACTIVATION_TYPES = [
  'School holiday programme',
  'Festive',
  'Community',
  'Family & kids',
  'Health & fitness',
  'Bazaar / market',
  'Promotion',
  'Corporate / B2B',
  'Arts & culture',
];

export const OBJECTIVES = [
  'Footfall',
  'Brand awareness',
  'Database growth',
  'Tenant prospecting',
  'Sales / spend',
  'Community engagement',
];

export const STATUSES = ['Planned', 'Approved', 'Live', 'Completed', 'Reported'];

export const SPEND_CATEGORIES = [
  'Paid media',
  'Creative vendor',
  'Event production',
  'Venue & logistics',
  'Giveaways & prizes',
  'Talent & performers',
  'SEO',
  'Website',
  'Printing',
  'Other',
];

export const SOURCE_CHANNELS = [
  'Event QR',
  'Website form',
  'Social lead form',
  'Legacy import',
  'Manual entry',
];

export const DIGITAL_CHANNELS = ['Facebook', 'Instagram', 'TikTok', 'Website', 'Google Ads'];

export const FILTER_CHANNELS = [...SOURCE_CHANNELS, ...DIGITAL_CHANNELS];

export const LEAD_TYPES = [
  'Visitor',
  'Programme participant',
  'Prospective tenant',
  'Prospective buyer',
  'Business / vendor',
];

export const AGE_BANDS = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
export const CHILD_BANDS = ['0–3', '4–6', '7–12', '13–17'];
export const GENDERS = ['Female', 'Male', 'Prefer not to say'];
export const INTERESTS = [
  'Food & dining',
  'Fashion',
  'Kids activities',
  'Fitness',
  'Arts & culture',
  'Tech & gadgets',
  'Home & living',
  'Business & networking',
  'Property',
];
export const HEARD_OPTIONS = ['Facebook', 'Instagram', 'TikTok', 'Website', 'Friend/family', 'Walk-past', 'Banner', 'Radio', 'Other'];
export const PARTY_OPTIONS = ['Alone', 'Partner', 'Family with kids', 'Friends', 'Colleagues'];
export const HOUSEHOLD_TYPES = ['With children', 'No children'];

export const OPERATORS = [
  {
    id: 'op-alam',
    name: 'Alam Sentral Property Management Sdn Bhd',
    contactName: 'Aina Rahman',
    contactEmail: 'aina.rahman@example.com',
    assetIds: ['pas', 'gsa'],
  },
  {
    id: 'op-kpsa',
    name: 'Kompleks PKNS Operations Sdn Bhd',
    contactName: 'Hafiz Kamal',
    contactEmail: 'hafiz.kamal@example.com',
    assetIds: ['kpsa'],
  },
  {
    id: 'op-perang',
    name: 'Perangsang Facilities Sdn Bhd',
    contactName: 'Lim Wei Jian',
    contactEmail: 'weijian.lim@example.com',
    assetIds: ['pp', 'mpk'],
  },
  {
    id: 'op-smm',
    name: 'Selangor Mall Management Sdn Bhd',
    contactName: 'Siti Mariam',
    contactEmail: 'siti.mariam@example.com',
    assetIds: ['sacc'],
  },
];

export const ASSETS = [
  {
    id: 'kpsa',
    name: 'Kompleks PKNS Shah Alam', // VERIFY NAME
    shortCode: 'KPSA',
    type: 'Mall',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40000',
    operatorId: 'op-kpsa',
    status: 'Active',
    description: 'Retail mall operated for PKNS in Shah Alam.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 91, tenantCount: 168, asOf: '2026-10-01' },
  },
  {
    id: 'pas',
    name: 'Plaza Alam Sentral', // VERIFY NAME
    shortCode: 'PAS',
    type: 'Mall',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40100',
    operatorId: 'op-alam',
    status: 'Active',
    description: 'Retail mall in the Alam Sentral area.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 87, tenantCount: 142, asOf: '2026-10-01' },
  },
  {
    id: 'sacc',
    name: 'SACC Mall', // VERIFY NAME
    shortCode: 'SACC',
    type: 'Mall',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40170',
    operatorId: 'op-smm',
    status: 'Under redevelopment',
    description: 'Under redevelopment until mid-2027. Fewer activations while works are underway.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 42, tenantCount: 61, asOf: '2026-10-01' },
  },
  {
    id: 'gsa',
    name: 'Galleria Shah Alam Sentral', // VERIFY NAME
    shortCode: 'GSA',
    type: 'Mixed-use',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40100',
    operatorId: 'op-alam',
    status: 'Active',
    description: 'Mixed-use address with an open plaza used for programmes.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 84, tenantCount: 96, asOf: '2026-10-01' },
  },
  {
    id: 'pp',
    name: 'Plaza Perangsang', // VERIFY NAME
    shortCode: 'PP',
    type: 'Office',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40000',
    operatorId: 'op-perang',
    status: 'Active',
    description: 'Office building. Activations here are mostly tenant prospecting.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 78, tenantCount: 54, asOf: '2026-10-01' },
  },
  {
    id: 'mpk',
    name: 'Menara PKNS', // VERIFY NAME
    shortCode: 'MPK',
    type: 'Office',
    area: 'Petaling Jaya',
    city: 'Petaling Jaya',
    postcode: '46200',
    operatorId: 'op-perang',
    status: 'Active',
    description: 'Office tower in Petaling Jaya.',
    rentxLinked: true,
    rentxSnapshot: { occupancyPct: 81, tenantCount: 73, asOf: '2026-10-01' },
  },
  {
    id: 's13',
    name: 'Dataran / Township Open Space – Seksyen 13', // VERIFY NAME
    shortCode: 'S13',
    type: 'Open space',
    area: 'Shah Alam',
    city: 'Shah Alam',
    postcode: '40100',
    operatorId: null,
    status: 'Active',
    description: 'Township open space run by PKNS AMP, outside a building operator.',
    rentxLinked: false,
  },
  {
    id: 'kd',
    name: 'Kota Damansara Community Space', // VERIFY NAME
    shortCode: 'KD',
    type: 'Township site',
    area: 'Kota Damansara',
    city: 'Petaling Jaya',
    postcode: '47810',
    operatorId: null,
    status: 'Active',
    description: 'Community space run by PKNS AMP.',
    rentxLinked: false,
  },
];

export const BUDGETS_2026 = {
  kpsa: [80000, 90000, 85000, 70000],
  pas: [90000, 110000, 100000, 80000],
  sacc: [22000, 18000, 15000, 12000],
  gsa: [60000, 70000, 75000, 55000],
  pp: [30000, 35000, 40000, 28000],
  mpk: [25000, 28000, 30000, 24000],
  s13: [40000, 55000, 70000, 35000],
  kd: [35000, 40000, 45000, 30000],
};

export const POSTCODES = [
  { code: '40000', area: 'Shah Alam', w: 10 },
  { code: '40100', area: 'Shah Alam', w: 12 },
  { code: '40150', area: 'Shah Alam', w: 8 },
  { code: '40160', area: 'Shah Alam', w: 6 },
  { code: '40170', area: 'Shah Alam', w: 5 },
  { code: '40200', area: 'Shah Alam', w: 4 },
  { code: '40400', area: 'Shah Alam', w: 4 },
  { code: '40460', area: 'Shah Alam', w: 3 },
  { code: '46000', area: 'Petaling Jaya', w: 5 },
  { code: '46050', area: 'Petaling Jaya', w: 4 },
  { code: '46200', area: 'Petaling Jaya', w: 4 },
  { code: '47301', area: 'Petaling Jaya', w: 3 },
  { code: '47810', area: 'Kota Damansara', w: 7 },
  { code: '47500', area: 'Subang Jaya', w: 4 },
  { code: '47600', area: 'Subang Jaya', w: 3 },
  { code: '41000', area: 'Klang', w: 3 },
  { code: '41150', area: 'Klang', w: 2 },
  { code: '41200', area: 'Klang', w: 2 },
];

export const FIRST_NAMES = [
  'Nurul', 'Aisyah', 'Siti', 'Farah', 'Aina', 'Hana', 'Amira', 'Nadia', 'Liyana', 'Izzah',
  'Yasmin', 'Sofia', 'Mei Ling', 'Priya', 'Kavitha', 'Hannah', 'Zara', 'Intan', 'Balqis', 'Ain',
  'Ahmad', 'Hafiz', 'Danial', 'Arif', 'Hakim', 'Rizal', 'Faiz', 'Adam', 'Iskandar', 'Harun',
  'Imran', 'Luqman', 'Danish', 'Hisham', 'Razak', 'Faizal', 'Iqbal', 'Amir', 'Syafiq', 'Khairul',
  'Wei Jian', 'Raj', 'Kumar', 'Selvam', 'Gopal', 'Tan', 'Lim', 'Wong', 'Chong', 'Aziz',
];

export const LAST_NAMES = [
  'Abdullah', 'Rahman', 'Ismail', 'Karim', 'Yusof', 'Ahmad', 'Hassan', 'Ali', 'Ibrahim', 'Osman',
  'Bakar', 'Hamid', 'Salleh', 'Zainal', 'Mansor', 'Aziz', 'Tan', 'Lim', 'Wong', 'Lee',
  'Nair', 'Krishnan', 'Pillai', 'Singh', 'Ong', 'Goh', 'Chong', 'Yap', 'Teoh', 'Kaur',
];

export const LOCATIONS = [
  'Open plaza, ground floor',
  'Central atrium',
  'Car park B',
  'Concourse',
  'Level 1 foyer',
  'Township field',
  'Community hall',
  'Exhibition corner',
];

export const VENDORS = [
  'Warna Kreatif Sdn Bhd',
  'Panggung Rakyat',
  'Cetak Shah Alam',
  'Media Raya Digital',
  'Lampu Events',
  'Jurulatih Komuniti',
  'PKNS in-house',
];

export const NAMED_ACTIVATIONS = [
  {
    id: 'ACT-RAYA-2026',
    name: 'Raya Open House 2026',
    assetId: 'pas',
    specificLocation: 'Central atrium',
    runBy: 'PKNS AMP',
    type: 'Festive',
    objective: 'Footfall',
    targetAudience: 'Families in Shah Alam',
    description: 'Open house with a registration booth and a family programme.',
    startDate: '2026-04-02',
    endDate: '2026-04-05',
    status: 'Reported',
    budget: 42000,
    fresh: 900,
  },
  {
    id: 'ACT-ZOO',
    name: 'Mini Zoo Weekend',
    assetId: 'gsa',
    specificLocation: 'Open plaza, ground floor',
    runBy: 'Operator',
    type: 'Family & kids',
    objective: 'Footfall',
    targetAudience: 'Families with young children',
    description: 'Weekend animal encounter on the open plaza.',
    startDate: '2026-08-15',
    endDate: '2026-08-16',
    status: 'Reported',
    budget: 18000,
    fresh: 250,
  },
  {
    id: 'ACT-SCIENCE',
    name: 'School Holiday Science Fair',
    assetId: 'kpsa',
    specificLocation: 'Level 1 foyer',
    runBy: 'PKNS AMP',
    type: 'School holiday programme',
    objective: 'Database growth',
    targetAudience: 'School-age children and parents',
    description: 'Hands-on science tables during the school holiday.',
    startDate: '2026-06-06',
    endDate: '2026-06-14',
    status: 'Reported',
    budget: 28000,
    fresh: 400,
  },
  {
    id: 'ACT-CNY',
    name: 'CNY Lion Dance & Lucky Draw',
    assetId: 'pas',
    specificLocation: 'Central atrium',
    runBy: 'PKNS AMP',
    type: 'Festive',
    objective: 'Footfall',
    targetAudience: 'Mall visitors during Chinese New Year',
    description: 'Lion dance performances and a lucky draw booth.',
    startDate: '2026-02-14',
    endDate: '2026-02-17',
    status: 'Reported',
    budget: 35000,
    fresh: 700,
  },
  {
    id: 'ACT-DEEPAVALI',
    name: 'Deepavali Kolam Workshop',
    assetId: 'kpsa',
    specificLocation: 'Concourse',
    runBy: 'PKNS AMP',
    type: 'Festive',
    objective: 'Community engagement',
    targetAudience: 'Families and students',
    description: 'Kolam workshop ahead of Deepavali.',
    startDate: '2026-11-07',
    endDate: '2026-11-08',
    status: 'Approved',
    budget: 12000,
    fresh: 0,
  },
  {
    id: 'ACT-RUN',
    name: 'Car-Free Morning Run',
    assetId: 's13',
    specificLocation: 'Township field',
    runBy: 'PKNS AMP',
    type: 'Health & fitness',
    objective: 'Community engagement',
    targetAudience: 'Adults in Seksyen 13',
    description: 'Morning run on the township open space.',
    startDate: '2026-09-06',
    endDate: '2026-09-06',
    status: 'Reported',
    budget: 8000,
    fresh: 120,
  },
  {
    id: 'ACT-OPENDAY',
    name: 'Office Space Open Day',
    assetId: 'pp',
    specificLocation: 'Level 1 foyer',
    runBy: 'PKNS AMP',
    type: 'Corporate / B2B',
    objective: 'Tenant prospecting',
    targetAudience: 'Businesses looking for office space',
    description: 'Open day for prospective office tenants.',
    startDate: '2026-09-16',
    endDate: '2026-09-16',
    status: 'Reported',
    budget: 15000,
    fresh: 80,
  },
  {
    id: 'ACT-MERDEKA',
    name: 'Merdeka Family Carnival',
    assetId: 's13',
    specificLocation: 'Township field',
    runBy: 'PKNS AMP',
    type: 'Community',
    objective: 'Footfall',
    targetAudience: 'Families across Shah Alam',
    description: 'Township carnival over the Merdeka weekend.',
    startDate: '2026-08-30',
    endDate: '2026-08-31',
    status: 'Reported',
    budget: 38000,
    fresh: 500,
  },
  {
    id: 'ACT-SCHOOL',
    name: 'Back to School Fair',
    assetId: 'kpsa',
    specificLocation: 'Concourse',
    runBy: 'PKNS AMP',
    type: 'School holiday programme',
    objective: 'Database growth',
    targetAudience: 'Parents of school-age children',
    description: 'Fair for families preparing for the school term.',
    startDate: '2026-01-10',
    endDate: '2026-01-11',
    status: 'Reported',
    budget: 22000,
    fresh: 350,
  },
  {
    id: 'ACT-WELLNESS',
    name: 'Wellness Week',
    assetId: 'kpsa',
    specificLocation: 'Concourse',
    runBy: 'Operator',
    type: 'Health & fitness',
    objective: 'Footfall',
    targetAudience: 'Adults working and living nearby',
    description: 'A live programme running across the week of 26 Oct 2026.',
    startDate: '2026-10-26',
    endDate: '2026-11-01',
    status: 'Live',
    budget: 15000,
    fresh: 150,
  },
];

export const BAZAAR_MONTHS = [
  ['2026-01-10', '2026-01-11', 'Reported', 70],
  ['2026-02-14', '2026-02-15', 'Reported', 70],
  ['2026-03-14', '2026-03-15', 'Reported', 80],
  ['2026-04-11', '2026-04-12', 'Reported', 80],
  ['2026-05-09', '2026-05-10', 'Reported', 80],
  ['2026-06-13', '2026-06-14', 'Reported', 90],
  ['2026-07-11', '2026-07-12', 'Reported', 90],
  ['2026-08-08', '2026-08-09', 'Reported', 90],
  ['2026-09-12', '2026-09-13', 'Reported', 80],
  ['2026-10-24', '2026-10-25', 'Completed', 70],
  ['2026-11-14', '2026-11-15', 'Approved', 0],
  ['2026-12-12', '2026-12-13', 'Planned', 0],
];

export const TEMPLATES = [
  { name: 'Craft Table Weekend', type: 'Family & kids', objective: 'Community engagement' },
  { name: 'Storytime Hour', type: 'Family & kids', objective: 'Database growth' },
  { name: 'Parents and Tots Session', type: 'Family & kids', objective: 'Community engagement' },
  { name: 'Morning Aerobics', type: 'Health & fitness', objective: 'Footfall' },
  { name: 'Community Health Check', type: 'Health & fitness', objective: 'Community engagement' },
  { name: 'Blood Donation Drive', type: 'Community', objective: 'Community engagement' },
  { name: 'Neighbourhood Clean-up', type: 'Community', objective: 'Community engagement' },
  { name: 'Seniors Morning', type: 'Community', objective: 'Database growth' },
  { name: 'Festive Photo Booth', type: 'Festive', objective: 'Brand awareness' },
  { name: 'Ramadan Bazaar Weekend', type: 'Festive', objective: 'Footfall' },
  { name: 'Raya Open House 2025', type: 'Festive', objective: 'Footfall' },
  { name: 'Holiday Workshop Series', type: 'School holiday programme', objective: 'Database growth' },
  { name: 'School Holiday Movie Morning', type: 'School holiday programme', objective: 'Footfall' },
  { name: 'Pop-up Market', type: 'Bazaar / market', objective: 'Sales / spend' },
  { name: 'Tenant Welcome Desk', type: 'Promotion', objective: 'Brand awareness' },
  { name: 'Weekday Lunch Promotion', type: 'Promotion', objective: 'Sales / spend' },
  { name: 'SME Sharing Session', type: 'Corporate / B2B', objective: 'Tenant prospecting' },
  { name: 'Office Floor Preview', type: 'Corporate / B2B', objective: 'Tenant prospecting' },
  { name: 'Student Art Display', type: 'Arts & culture', objective: 'Community engagement' },
  { name: 'Evening Acoustic Set', type: 'Arts & culture', objective: 'Footfall' },
];

export const CONSENT = {
  purposeTextEN: 'PKNS collects this information to record your participation in this activation and to understand who attends PKNS programmes.',
  purposeTextBM: 'PKNS mengumpul maklumat ini untuk merekod penyertaan anda dalam pengaktifan ini dan memahami siapa yang hadir ke program PKNS.',
  privacyNoticeUrl: '#/privacy',
  requiredEN: 'I agree to PKNS processing my data for this activation',
  requiredBM: 'Saya bersetuju PKNS memproses data saya untuk pengaktifan ini',
  marketingEN: 'I agree to receive future event and promotion updates from PKNS',
  marketingBM: 'Saya bersetuju menerima kemas kini program dan promosi PKNS pada masa hadapan',
  consentVersion: CONSENT_VERSION,
};

export const FIELD_LIBRARY = [
  { id: 'fullName', key: 'fullName', labelEN: 'Full name', labelBM: 'Nama penuh', type: 'text', isPersonalData: true },
  { id: 'mobile', key: 'mobile', labelEN: 'Mobile number', labelBM: 'Nombor telefon bimbit', type: 'phone', isPersonalData: true },
  { id: 'email', key: 'email', labelEN: 'Email', labelBM: 'E-mel', type: 'email', isPersonalData: true },
  { id: 'postcode', key: 'postcode', labelEN: 'Postcode', labelBM: 'Poskod', type: 'postcode', isPersonalData: false },
  { id: 'ageBand', key: 'ageBand', labelEN: 'Age band', labelBM: 'Kumpulan umur', type: 'select', options: AGE_BANDS, isPersonalData: false },
  { id: 'gender', key: 'gender', labelEN: 'Gender', labelBM: 'Jantina', type: 'select', options: GENDERS, isPersonalData: false },
  { id: 'householdSize', key: 'householdSize', labelEN: 'Household size', labelBM: 'Saiz isi rumah', type: 'number', isPersonalData: false },
  { id: 'childrenCount', key: 'childrenCount', labelEN: 'Number of children', labelBM: 'Bilangan anak', type: 'number', isPersonalData: false },
  { id: 'childrenAgeBands', key: 'childrenAgeBands', labelEN: "Children's age bands", labelBM: 'Kumpulan umur anak', type: 'multiselect', options: CHILD_BANDS, isPersonalData: false },
  { id: 'interests', key: 'interests', labelEN: 'Interests', labelBM: 'Minat', type: 'multiselect', options: INTERESTS, isPersonalData: false },
  { id: 'heard', key: 'heard', labelEN: 'How did you hear about us', labelBM: 'Bagaimana anda tahu tentang kami', type: 'select', options: HEARD_OPTIONS, isPersonalData: false },
  { id: 'party', key: 'party', labelEN: 'Who are you here with', labelBM: 'Siapa yang datang bersama anda', type: 'select', options: PARTY_OPTIONS, isPersonalData: false },
  { id: 'visitPurpose', key: 'visitPurpose', labelEN: 'Visit purpose', labelBM: 'Tujuan lawatan', type: 'text', isPersonalData: false },
  { id: 'interestedRent', key: 'interestedRent', labelEN: 'Interested in renting a space', labelBM: 'Berminat untuk menyewa ruang', type: 'select', options: ['Yes', 'No'], isPersonalData: false },
  { id: 'interestedBuy', key: 'interestedBuy', labelEN: 'Interested in buying property', labelBM: 'Berminat untuk membeli hartanah', type: 'select', options: ['Yes', 'No'], isPersonalData: false },
  { id: 'rating', key: 'rating', labelEN: 'Event rating (1–5)', labelBM: 'Penilaian program (1–5)', type: 'rating', isPersonalData: false },
  { id: 'comments', key: 'comments', labelEN: 'Comments', labelBM: 'Komen', type: 'text', isPersonalData: false },
];

export const DEFAULT_FORM_KEYS = ['fullName', 'mobile', 'email', 'postcode', 'ageBand', 'gender', 'childrenCount', 'interests', 'heard', 'party', 'rating', 'comments'];

export const USERS = [
  { id: 'u-farah', name: 'Farah Idris', email: 'farah.idris@example.com', role: 'amp-manager', operatorId: null, assetIds: [], status: 'Active', lastLogin: '2026-10-28T09:12:00+08:00' },
  { id: 'u-danish', name: 'Danish Hakim', email: 'danish.hakim@example.com', role: 'amp-executive', operatorId: null, assetIds: [], status: 'Active', lastLogin: '2026-10-27T16:40:00+08:00' },
  { id: 'u-aina', name: 'Aina Rahman', email: 'aina.rahman@example.com', role: 'operator', operatorId: 'op-alam', assetIds: ['pas', 'gsa'], status: 'Active', lastLogin: '2026-10-28T08:05:00+08:00' },
  { id: 'u-hafiz', name: 'Hafiz Kamal', email: 'hafiz.kamal@example.com', role: 'operator', operatorId: 'op-kpsa', assetIds: ['kpsa'], status: 'Active', lastLogin: '2026-10-26T11:20:00+08:00' },
  { id: 'u-hisham', name: 'Hisham Karim', email: 'hisham.karim@example.com', role: 'management', operatorId: null, assetIds: [], status: 'Active', lastLogin: '2026-10-28T07:55:00+08:00' },
  { id: 'u-razak', name: 'Razak Ibrahim', email: 'razak.ibrahim@example.com', role: 'admin', operatorId: null, assetIds: [], status: 'Active', lastLogin: '2026-10-25T14:10:00+08:00' },
  { id: 'u-mariam', name: 'Siti Mariam', email: 'siti.mariam@example.com', role: 'operator', operatorId: 'op-smm', assetIds: ['sacc'], status: 'Invited', lastLogin: null },
];

export const SEGMENT_SEEDS = [
  {
    id: 'SEG-FAM',
    name: 'Families with children 4–12 within Shah Alam',
    description: 'Children aged 4–12 and a Shah Alam address.',
    match: 'and',
    groups: [
      { id: 'g1', match: 'or', conditions: [
        { field: 'childrenAgeBand', op: 'includes', value: '4–6' },
        { field: 'childrenAgeBand', op: 'includes', value: '7–12' },
      ] },
      { id: 'g2', match: 'and', conditions: [{ field: 'area', op: 'eq', value: 'Shah Alam' }] },
    ],
    createdBy: 'Farah Idris',
    createdAt: '2026-09-02',
  },
  {
    id: 'SEG-REPEAT',
    name: 'Repeat attendees (3+ activations)',
    description: 'Attended three or more activations.',
    match: 'and',
    groups: [{ id: 'g1', match: 'and', conditions: [{ field: 'activationsAttended', op: 'gte', value: 3 }] }],
    createdBy: 'Farah Idris',
    createdAt: '2026-08-18',
  },
  {
    id: 'SEG-RENT',
    name: 'Interested in renting a space',
    description: 'Said yes to renting a space, or tagged as a prospective tenant.',
    match: 'or',
    groups: [{ id: 'g1', match: 'or', conditions: [
      { field: 'interestedRent', op: 'eq', value: 'Yes' },
      { field: 'leadType', op: 'includes', value: 'Prospective tenant' },
    ] }],
    createdBy: 'Danish Hakim',
    createdAt: '2026-09-20',
  },
  {
    id: 'SEG-FESTIVE',
    name: 'Attended festive activations at 2+ assets',
    description: 'Festive attendance at two or more assets.',
    match: 'and',
    groups: [{ id: 'g1', match: 'and', conditions: [{ field: 'festiveAssets', op: 'gte', value: 2 }] }],
    createdBy: 'Farah Idris',
    createdAt: '2026-07-11',
  },
  {
    id: 'SEG-FIT',
    name: 'Fitness interest, 25–44',
    description: 'Fitness interest and age band 25–34 or 35–44.',
    match: 'and',
    groups: [
      { id: 'g1', match: 'and', conditions: [{ field: 'interest', op: 'includes', value: 'Fitness' }] },
      { id: 'g2', match: 'or', conditions: [
        { field: 'ageBand', op: 'eq', value: '25–34' },
        { field: 'ageBand', op: 'eq', value: '35–44' },
      ] },
    ],
    createdBy: 'Danish Hakim',
    createdAt: '2026-10-02',
  },
];

export const IMPORT_EXAMPLE = {
  fileName: 'Raya Open House 2025 – Plaza Alam Sentral.xlsx',
  rowsTotal: 1184,
  rowsImported: 1102,
  duplicatesMerged: 61,
  rowsRejected: 21,
};

export const IMPORT_NAMES = [
  IMPORT_EXAMPLE.fileName,
  'CNY Plaza Alam Sentral 2025.xlsx',
  'Merdeka Seksyen 13 2025.xlsx',
  'Back to School Kompleks PKNS 2025.xlsx',
  'School Holiday Kompleks PKNS 2025.xlsx',
  'Bazaar Kota Damansara 2025.xlsx',
  'Galleria Mini Zoo 2025.xlsx',
  'Deepavali Kompleks PKNS 2025.xlsx',
  'Car-Free Morning 2025.xlsx',
  'Office Open Day Plaza Perangsang 2025.xlsx',
  'SACC Community Day 2025.xlsx',
  'Menara PKNS Health Week 2025.xlsx',
  'Galleria Festive Weekend 2025.xlsx',
  'Family Weekend Kompleks PKNS 2025.xlsx',
  'Seksyen 13 Carnival 2025.xlsx',
  'Google Form – Visitor survey 2025.csv',
  'Google Form – Tenant interest 2025.csv',
  'Manual collation – Shah Alam Q4 2025.xlsx',
];

export const COMMENTS = {
  positive: [
    'Program tersusun dan mudah diikuti.',
    'Anak-anak seronok. Kami akan datang lagi.',
    'Lokasi jelas dan kakitangan peramah.',
    'Aktiviti sesuai untuk seisi keluarga.',
    'Booth pendaftaran cepat.',
  ],
  neutral: [
    'Program biasa sahaja.',
    'Tempat letak kereta agak sesak.',
    'Masa menunggu di kaunter agak lama.',
    'Cukup untuk satu lawatan.',
  ],
  negative: [
    'Bunyi terlalu kuat di beberapa sudut.',
    'Kurang tempat duduk.',
    'Giliran pendaftaran panjang.',
    'Papan tanda kurang jelas.',
  ],
};

export const CAPTION_TEMPLATES = [
  'Jom sertai {name} di {asset}.',
  'Minggu ini di {asset}: {name}.',
  'Bawa keluarga ke {name}.',
  'Pendaftaran dibuka untuk {name}.',
  '{asset} — {name}. Datang dan daftar di kaunter.',
];

export const WEB_PAGES = [
  { path: '/', title: 'Home' },
  { path: '/whats-on', title: "What's on" },
  { path: '/assets/kompleks-pkns', title: 'Kompleks PKNS Shah Alam' },
  { path: '/assets/plaza-alam-sentral', title: 'Plaza Alam Sentral' },
  { path: '/promotions', title: 'Promotions' },
  { path: '/contact', title: 'Contact' },
];

export const INTEGRATIONS = [
  { id: 'forms', name: 'Activation forms / QR', method: 'Native', direction: 'In', status: 'Live', access: 'Built in', owner: 'PKNS AMP', notes: 'Works in this prototype.' },
  { id: 'webforms', name: 'PKNS website forms', method: 'Embed / API', direction: 'In', status: 'Sample data', access: 'Embed snippet', owner: 'PKNS ICT', notes: 'Sample submissions only.' },
  { id: 'meta', name: 'Meta Business Suite (Facebook, Instagram)', method: 'Read-only partner access', direction: 'In', status: 'Sample data', access: 'Read-only partner access', owner: 'Media agency', notes: 'PKNS keeps its own media agency.' },
  { id: 'ga', name: 'Google Analytics', method: 'Read-only view access', direction: 'In', status: 'Sample data', access: 'View access', owner: 'PKNS ICT', notes: 'Read-only.' },
  { id: 'ads', name: 'Google Ads', method: 'Read-only access', direction: 'In', status: 'Sample data', access: 'Read-only', owner: 'Media agency', notes: 'No ads were run before mid-2026. Earlier months are zero.' },
  { id: 'heat', name: 'Website heatmap tool', method: 'API', direction: 'In', status: 'Sample data', access: 'Read-only', owner: 'PKNS ICT', notes: 'Preview image only.' },
  { id: 'tiktok', name: 'TikTok', method: 'Read-only', direction: 'In', status: 'Sample data', access: 'Read-only', owner: 'Media agency', notes: 'Read-only.' },
  { id: 'super', name: 'PKNS Super App', method: 'API', direction: 'In', status: 'Not connected', access: 'Not connected', owner: 'PKNS ICT', notes: 'Not connected in this prototype.' },
  { id: 'rentx', name: 'RentX', method: 'API or scheduled export, read-only', direction: 'In', status: 'Sample data', access: 'Read-only', owner: 'Leasing / operator', notes: 'Subject to integration approval. Occupancy snapshot only.' },
  { id: 'legacy', name: 'Legacy Google Forms / Excel', method: 'One-time import', direction: 'In', status: 'Completed', access: 'Import wizard', owner: 'PKNS AMP', notes: 'Seeded import history.' },
  { id: 'footfall', name: 'Footfall counters', method: 'API', direction: 'In', status: 'Phase 2', access: 'Not connected', owner: 'PKNS ICT', notes: 'Planned for a later phase.' },
];

export const FESTIVE_BANDS = [
  { name: 'CNY 2025', start: '2025-01-01', end: '2025-02-28' },
  { name: 'Ramadan / Raya 2025', start: '2025-03-01', end: '2025-04-30' },
  { name: 'Deepavali 2025', start: '2025-10-01', end: '2025-10-31' },
  { name: 'School holiday', start: '2025-05-01', end: '2025-06-30' },
  { name: 'School holiday', start: '2025-11-01', end: '2025-12-31' },
  { name: 'CNY 2026', start: '2026-02-01', end: '2026-02-28' },
  { name: 'Ramadan / Raya 2026', start: '2026-02-01', end: '2026-03-31' },
  { name: 'School holiday', start: '2026-05-01', end: '2026-06-30' },
  { name: 'Deepavali 2026', start: '2026-11-01', end: '2026-11-30' },
  { name: 'School holiday', start: '2026-11-01', end: '2026-12-31' },
];

export function operatorById(id) {
  return OPERATORS.find((item) => item.id === id) || null;
}

export function assetById(id) {
  return ASSETS.find((item) => item.id === id) || null;
}

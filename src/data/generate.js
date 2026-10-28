import { makeRng, allocate, scatter } from './rng.js';
import {
  AS_OF, ASSETS, OPERATORS, BUDGETS_2026, POSTCODES, FIRST_NAMES, LAST_NAMES, LOCATIONS, VENDORS,
  NAMED_ACTIVATIONS, BAZAAR_MONTHS, TEMPLATES, CONSENT, FIELD_LIBRARY, DEFAULT_FORM_KEYS, USERS,
  SEGMENT_SEEDS, IMPORT_EXAMPLE, IMPORT_NAMES, COMMENTS, CAPTION_TEMPLATES, WEB_PAGES, ACTIVATION_TYPES,
  SPEND_CATEGORIES, CONSENT_VERSION, LEGACY_PROFILES, NEW_PROFILES_2026, CONSENT_UNKNOWN, IMPORT_ROWS,
  IMPORT_MERGED, IMPORT_REJECTED,
} from './config.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ASSET_WEIGHT = { kpsa: 1.4, pas: 1.5, sacc: 0.35, gsa: 1.1, pp: 0.7, mpk: 0.75, s13: 0.85, kd: 0.9 };
const DIGITAL_WEIGHT = { kpsa: 1.4, pas: 1.5, sacc: 0.3, gsa: 1.1, pp: 0.55, mpk: 0.6, s13: 0.45, kd: 0.5 };

function monthLabel(iso) {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function progress(start) {
  const t0 = Date.parse('2025-01-01T00:00:00Z');
  const t1 = Date.parse('2026-12-31T00:00:00Z');
  const t = Date.parse(`${start}T00:00:00Z`);
  return Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

function inferStatus(act) {
  if (act.status) return act.status;
  if (act.startDate <= AS_OF && act.endDate >= AS_OF) return 'Live';
  if (act.endDate < AS_OF) return act.endDate >= '2026-10-08' ? 'Completed' : 'Reported';
  return act.startDate <= '2026-11-27' ? 'Approved' : 'Planned';
}

function spreadDates(year, count) {
  const start = Date.parse(`${year}-01-08T00:00:00Z`);
  const end = Date.parse(`${year}-12-10T00:00:00Z`);
  const dates = [];
  for (let i = 0; i < count; i += 1) {
    const t = start + ((end - start) * (i + 0.2)) / count;
    const d = new Date(t);
    const add = (6 - d.getUTCDay() + 7) % 7;
    d.setUTCDate(d.getUTCDate() + add);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function fieldFromKey(key, required) {
  const src = FIELD_LIBRARY.find((item) => item.key === key);
  return {
    id: src.id,
    key: src.key,
    labelEN: src.labelEN,
    labelBM: src.labelBM,
    type: src.type,
    required: Boolean(required),
    options: src.options ? src.options.slice() : undefined,
    isPersonalData: Boolean(src.isPersonalData),
  };
}

function consentBlock() {
  return {
    purposeTextEN: CONSENT.purposeTextEN,
    purposeTextBM: CONSENT.purposeTextBM,
    privacyNoticeUrl: CONSENT.privacyNoticeUrl,
    requiredConsent: CONSENT.requiredEN,
    requiredConsentBM: CONSENT.requiredBM,
    marketingOptIn: CONSENT.marketingEN,
    marketingOptInBM: CONSENT.marketingBM,
    consentVersion: CONSENT.consentVersion,
  };
}

function buildActivations(rng) {
  const list = [];
  const push = (act) => list.push({
    ...act,
    status: inferStatus(act),
    operatorId: act.runBy === 'Operator' ? (ASSETS.find((a) => a.id === act.assetId)?.operatorId || null) : null,
    linkedCampaignIds: [],
    createdBy: act.runBy === 'Operator' ? 'Aina Rahman' : 'Farah Idris',
    createdAt: `${act.startDate}T08:00:00+08:00`,
    updatedAt: `${act.endDate}T18:00:00+08:00`,
  });

  for (const act of NAMED_ACTIVATIONS) push({ ...act, fresh: act.fresh ?? 0 });
  BAZAAR_MONTHS.forEach(([start, end, status, fresh], index) => {
    const month = MONTHS[Number(start.slice(5, 7)) - 1];
    push({
      id: `ACT-BAZAAR-${start.slice(0, 7)}`,
      name: `Weekend Bazaar Series – ${month} 2026`,
      assetId: 'kd',
      specificLocation: 'Community hall',
      runBy: 'PKNS AMP',
      type: 'Bazaar / market',
      objective: 'Sales / spend',
      targetAudience: 'Kota Damansara residents',
      description: 'Monthly weekend bazaar at the community space.',
      startDate: start,
      endDate: end,
      status,
      budget: 5000 + (index % 4) * 800,
      fresh,
    });
  });
  push({
    id: 'ACT-RAYA-2025',
    name: 'Raya Open House 2025',
    assetId: 'pas',
    specificLocation: 'Central atrium',
    runBy: 'PKNS AMP',
    type: 'Festive',
    objective: 'Footfall',
    targetAudience: 'Families in Shah Alam',
    description: '2025 open house. Responses were imported from the legacy workbook.',
    startDate: '2025-04-03',
    endDate: '2025-04-06',
    status: 'Reported',
    budget: 36000,
    fresh: 1102,
  });

  const used = new Set(list.map((act) => `${act.assetId}|${act.startDate}`));
  const makeGenerated = (year, count, idPrefix) => {
    const dates = spreadDates(year, count);
    for (let i = 0; i < count; i += 1) {
      const template = TEMPLATES[i % TEMPLATES.length];
      const asset = rng.weighted(ASSETS, ASSETS.map((item) => ASSET_WEIGHT[item.id]));
      let start = dates[i];
      let guard = 0;
      while (used.has(`${asset.id}|${start}`) && guard < 8) {
        start = addDays(start, 7);
        guard += 1;
      }
      used.add(`${asset.id}|${start}`);
      const span = template.type === 'School holiday programme' ? rng.int(5, 8) : rng.int(0, 2);
      const operator = asset.operatorId && rng.next() < 0.4;
      const budget = template.type === 'Festive' || template.type === 'School holiday programme'
        ? rng.int(18000, 42000)
        : rng.int(3000, 18000);
      push({
        id: `${idPrefix}${String(i + 1).padStart(3, '0')}`,
        name: `${template.name} – ${asset.shortCode} – ${monthLabel(start)}`,
        assetId: asset.id,
        specificLocation: rng.pick(LOCATIONS),
        runBy: operator ? 'Operator' : 'PKNS AMP',
        type: template.type,
        objective: template.objective,
        targetAudience: 'Visitors to this asset',
        description: `${template.name} at ${asset.name}.`,
        startDate: start,
        endDate: addDays(start, span),
        budget: asset.id === 'sacc' ? Math.min(budget, 12000) : budget,
        fresh: null,
      });
    }
  };
  makeGenerated(2025, 25, 'ACT-Y5-');
  makeGenerated(2026, 22, 'ACT-Y6-');
  list.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  return list;
}

function assignFresh(list) {
  const generated2025 = list.filter((act) => act.id.startsWith('ACT-Y5-'));
  const generated2026 = list.filter((act) => act.id.startsWith('ACT-Y6-') && act.startDate <= AS_OF);
  const reservedLegacy = list.filter((act) => act.fresh != null && act.startDate < '2026-01-01').reduce((s, a) => s + a.fresh, 0);
  const reservedNew = list.filter((act) => act.fresh != null && act.startDate >= '2026-01-01' && act.startDate <= AS_OF).reduce((s, a) => s + a.fresh, 0);
  const legacyRest = allocate(LEGACY_PROFILES - reservedLegacy, generated2025.map((act) => (act.assetId === 'sacc' ? 0.4 : 1)));
  const newRest = allocate(NEW_PROFILES_2026 - reservedNew, generated2026.map((act) => (act.assetId === 'sacc' ? 0.45 : 1)));
  generated2025.forEach((act, i) => { act.fresh = legacyRest[i]; });
  generated2026.forEach((act, i) => { act.fresh = newRest[i]; });
  list.forEach((act) => {
    if (act.fresh == null) act.fresh = 0;
    if (act.startDate > AS_OF) act.fresh = 0;
  });
}

function buildImports() {
  const names = IMPORT_NAMES;
  const rest = names.slice(1);
  const imported = allocate(LEGACY_PROFILES - IMPORT_EXAMPLE.rowsImported, rest.map(() => 1));
  const merged = allocate(IMPORT_MERGED - IMPORT_EXAMPLE.duplicatesMerged, rest.map(() => 1));
  const rejected = allocate(IMPORT_REJECTED - IMPORT_EXAMPLE.rowsRejected, rest.map(() => 1));
  const rows = names.map((fileName, index) => {
    if (index === 0) {
      return { ...IMPORT_EXAMPLE, fileName };
    }
    const i = index - 1;
    return {
      fileName,
      rowsImported: imported[i],
      duplicatesMerged: merged[i],
      rowsRejected: rejected[i],
      rowsTotal: imported[i] + merged[i] + rejected[i],
    };
  });
  return rows.map((row, index) => ({
    id: `IMP-${String(index + 1).padStart(2, '0')}`,
    fileName: row.fileName,
    uploadedBy: index % 2 ? 'Danish Hakim' : 'Farah Idris',
    uploadedAt: `2026-0${1 + (index % 3)}-${String(3 + index).padStart(2, '0')}T10:00:00+08:00`,
    rowsTotal: row.rowsTotal,
    rowsImported: row.rowsImported,
    duplicatesMerged: row.duplicatesMerged,
    rowsRejected: row.rowsRejected,
    status: 'Completed',
    consentMode: index % 5 === 0 ? 'captured' : 'unknown',
    fieldMapping: { Nama: 'fullName', Telefon: 'mobile', Emel: 'email', Poskod: 'postcode', Umur: 'ageBand' },
    errors: row.rowsRejected ? [{ row: 4, field: 'mobile', message: 'Invalid phone' }] : [],
  }));
}

function emptyOutcomes() {
  return {
    registrations: 0,
    attendanceScanned: 0,
    walkInCount: 0,
    totalAttendance: 0,
    newProfiles: 0,
    returningProfiles: 0,
    adults: 0,
    children: 0,
    avgGroupSize: 0,
    spendCapturedRM: 0,
    surveyResponses: 0,
    avgRating: null,
    positiveComments: 0,
    neutralComments: 0,
    negativeComments: 0,
    ratingCounts: [0, 0, 0, 0, 0],
    comments: [],
    hourly: [],
  };
}

export function generate() {
  const rng = makeRng(20261028);
  const activations = buildActivations(rng);
  assignFresh(activations);
  const imports = buildImports();
  const profiles = [];
  const mobiles = new Set();
  const pool = [];
  let legacyRemaining = LEGACY_PROFILES;
  let unknownLeft = CONSENT_UNKNOWN;
  let knownOptLeft = 3109;
  let newRemaining = NEW_PROFILES_2026;
  let newOptLeft = 2974;
  let childLeft = 8800;
  let createLeft = LEGACY_PROFILES + NEW_PROFILES_2026;
  let seq = 1;
  const sourcePlan = [];
  const sourceWeights = [
    ['Event QR', 3692],
    ['Website form', 718],
    ['Social lead form', 513],
    ['Manual entry', 205],
  ];
  sourceWeights.forEach(([name, count]) => {
    for (let i = 0; i < count; i += 1) sourcePlan.push(name);
  });
  const sources = rng.shuffle(sourcePlan);
  let sourceCursor = 0;

  const take = (n) => {
    const chosen = [];
    const seen = new Set();
    let guard = 0;
    while (chosen.length < n && pool.length && guard < n * 40) {
      guard += 1;
      const person = pool[rng.int(0, pool.length - 1)];
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      chosen.push(person);
    }
    return chosen;
  };

  for (const act of activations) {
    const share = 0.3 + 0.15 * progress(act.startDate);
    const wantedReturn = act.fresh ? Math.round(act.fresh * share / (1 - share)) : 0;
    const returning = take(Math.min(wantedReturn, pool.length));
    const asset = ASSETS.find((item) => item.id === act.assetId);
    for (const person of returning) {
      person.links.push({ activationId: act.id, isNew: false, spendRM: 0 });
      if (!person.assetIds.includes(act.assetId)) person.assetIds.push(act.assetId);
      if (act.endDate > person.lastSeen) person.lastSeen = act.endDate;
    }
    for (let i = 0; i < act.fresh; i += 1) {
      const legacy = act.startDate < '2026-01-01';
      const postcode = rng.weighted(POSTCODES, POSTCODES.map((item) => item.w));
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      const hasChildren = childLeft > 0 && rng.next() < childLeft / createLeft;
      createLeft -= 1;
      if (hasChildren) childLeft -= 1;
      const childrenCount = hasChildren ? rng.int(1, 3) : 0;
      const childrenAgeBands = [];
      for (let c = 0; c < childrenCount; c += 1) childrenAgeBands.push(rng.pick(['0–3', '4–6', '7–12', '13–17']));
      let party = 'Alone';
      if (hasChildren) party = rng.next() < 0.8 ? 'Family with kids' : rng.pick(['Partner', 'Friends']);
      else {
        const roll = rng.next();
        party = roll < 0.28 ? 'Alone' : roll < 0.55 ? 'Partner' : roll < 0.8 ? 'Friends' : 'Colleagues';
      }
      const ageBand = hasChildren
        ? rng.weighted(['25–34', '35–44', '45–54'], [5, 4, 1])
        : rng.weighted(['18–24', '25–34', '35–44', '45–54', '55–64', '65+'], [12, 24, 22, 18, 14, 10]);
      const gender = rng.weighted(['Female', 'Male', 'Prefer not to say'], [52, 46, 2]);
      const interestCount = rng.int(1, 3);
      const interests = [];
      while (interests.length < interestCount) {
        const item = rng.pick(['Food & dining', 'Fashion', 'Kids activities', 'Fitness', 'Arts & culture', 'Tech & gadgets', 'Home & living', 'Business & networking', 'Property']);
        if (!interests.includes(item)) interests.push(item);
      }
      if (hasChildren && !interests.includes('Kids activities') && rng.next() < 0.55) interests[0] = 'Kids activities';
      let mobile = '';
      do {
        mobile = `01${rng.pick(['2', '3', '4', '6', '7', '8', '9'])}${String(rng.int(0, 9999999)).padStart(7, '0')}`;
      } while (mobiles.has(mobile));
      mobiles.add(mobile);
      let source = 'Legacy import';
      let socialNetwork = null;
      let webPage = null;
      let marketingOptIn = false;
      let unknown = false;
      let version = '2025-01';
      if (legacy) {
        unknown = unknownLeft > 0 && rng.next() < unknownLeft / legacyRemaining;
        if (unknown) unknownLeft -= 1;
        else {
          const knownRem = legacyRemaining - unknownLeft;
          marketingOptIn = knownOptLeft > 0 && rng.next() < knownOptLeft / knownRem;
          if (marketingOptIn) knownOptLeft -= 1;
        }
        legacyRemaining -= 1;
      } else {
        source = sources[sourceCursor] || 'Event QR';
        sourceCursor += 1;
        marketingOptIn = newOptLeft > 0 && rng.next() < newOptLeft / newRemaining;
        if (marketingOptIn) newOptLeft -= 1;
        newRemaining -= 1;
        version = CONSENT_VERSION;
        if (source === 'Social lead form') socialNetwork = rng.weighted(['Facebook', 'Instagram', 'TikTok'], [5, 3, 2]);
        if (source === 'Website form') webPage = rng.weighted(WEB_PAGES.map((page) => page.path), [8, 6, 3, 3, 4, 2]);
      }
      const person = {
        id: `PR-${String(seq).padStart(6, '0')}`,
        fullName: `${first} ${last}`,
        mobile,
        email: `${slug(first)}.${slug(last)}.${seq}@example.com`,
        postcode: postcode.code,
        area: postcode.area,
        ageBand,
        gender,
        householdSize: hasChildren ? childrenCount + rng.int(1, 2) : (party === 'Alone' ? 1 : rng.int(1, 3)),
        childrenCount,
        childrenAgeBands: [...new Set(childrenAgeBands)],
        interests,
        leadTypes: ['Visitor'],
        firstSeen: act.startDate,
        lastSeen: act.endDate,
        sourceChannelFirst: source,
        socialNetwork,
        webPage,
        heard: rng.pick(['Facebook', 'Instagram', 'TikTok', 'Website', 'Friend/family', 'Walk-past', 'Banner', 'Radio', 'Other']),
        party,
        visitPurpose: act.objective,
        interestedRent: 'No',
        interestedBuy: 'No',
        assetIds: [act.assetId],
        links: [{ activationId: act.id, isNew: true, spendRM: 0 }],
        spendCapturedRM: 0,
        consent: {
          required: true,
          marketingOptIn,
          unknown,
          consentDate: act.startDate,
          consentVersion: unknown ? '' : version,
          source: legacy ? 'Legacy import' : source,
          withdrawn: false,
        },
        importedFromLegacy: legacy,
        legacySourceFile: null,
        createdFromActivationId: act.id,
      };
      seq += 1;
      profiles.push(person);
      pool.push(person);
      if ((act.type === 'Festive' || act.type === 'Bazaar / market') && rng.next() < 0.18) {
        const spend = rng.int(20, 160);
        person.links[0].spendRM = spend;
        person.spendCapturedRM = spend;
      }
      void asset;
    }
  }

  const leadBag = [];
  [['Visitor', 9920], ['Programme participant', 4480], ['Prospective tenant', 640], ['Prospective buyer', 800], ['Business / vendor', 160]]
    .forEach(([type, count]) => { for (let i = 0; i < count; i += 1) leadBag.push(type); });
  const leads = rng.shuffle(leadBag);
  profiles.forEach((person, index) => {
    person.leadTypes = [leads[index]];
    if (rng.next() < 0.12) {
      const extra = rng.pick(['Visitor', 'Programme participant', 'Prospective tenant', 'Prospective buyer', 'Business / vendor']);
      if (!person.leadTypes.includes(extra)) person.leadTypes.push(extra);
    }
    person.interestedRent = person.leadTypes.includes('Prospective tenant') ? 'Yes' : 'No';
    person.interestedBuy = person.leadTypes.includes('Prospective buyer') ? 'Yes' : 'No';
    person.totalActivationsAttended = person.links.length;
    person.activationIds = person.links.map((link) => link.activationId);
  });

  const legacyPeople = [
    ...profiles.filter((person) => person.importedFromLegacy && person.createdFromActivationId === 'ACT-RAYA-2025'),
    ...profiles.filter((person) => person.importedFromLegacy && person.createdFromActivationId !== 'ACT-RAYA-2025'),
  ];
  const slots = [];
  imports.forEach((job) => {
    for (let i = 0; i < job.rowsImported; i += 1) slots.push(job.fileName);
  });
  legacyPeople.forEach((person, index) => { person.legacySourceFile = slots[index] || imports[0].fileName; });

  const byId = new Map(activations.map((act) => [act.id, act]));
  for (const act of activations) {
    const linked = [];
    for (const person of profiles) {
      const link = person.links.find((item) => item.activationId === act.id);
      if (link) linked.push({ person, link });
    }
    const outcomes = emptyOutcomes();
    outcomes.registrations = linked.length;
    outcomes.newProfiles = linked.filter((item) => item.link.isNew).length;
    outcomes.returningProfiles = outcomes.registrations - outcomes.newProfiles;
    const rate = outcomes.registrations ? rng.range(0.42, 0.68) : 1;
    outcomes.totalAttendance = outcomes.registrations ? Math.max(outcomes.registrations, Math.round(outcomes.registrations / rate)) : 0;
    outcomes.walkInCount = outcomes.totalAttendance - outcomes.registrations;
    outcomes.attendanceScanned = outcomes.registrations;
    const childVisitors = linked.reduce((sum, item) => sum + (item.person.party === 'Family with kids' ? Math.min(item.person.childrenCount, 3) : 0), 0);
    outcomes.children = Math.min(outcomes.totalAttendance, childVisitors + Math.round(outcomes.walkInCount * 0.3));
    outcomes.adults = outcomes.totalAttendance - outcomes.children;
    outcomes.avgGroupSize = outcomes.registrations ? Number((outcomes.totalAttendance / outcomes.registrations).toFixed(2)) : 0;
    outcomes.spendCapturedRM = linked.reduce((sum, item) => sum + (item.link.spendRM || 0), 0);
    const surveyN = outcomes.registrations ? Math.round(outcomes.registrations * rng.range(0.05, 0.2)) : 0;
    for (let i = 0; i < surveyN; i += 1) {
      const roll = rng.next();
      const star = roll < 0.04 ? 1 : roll < 0.08 ? 2 : roll < 0.18 ? 3 : roll < 0.5 ? 4 : 5;
      outcomes.ratingCounts[star - 1] += 1;
    }
    outcomes.surveyResponses = surveyN;
    const rated = outcomes.ratingCounts.reduce((sum, count, index) => sum + count * (index + 1), 0);
    outcomes.avgRating = surveyN ? rated / surveyN : null;
    const commentN = Math.round(surveyN * 0.45);
    const pos = Math.round(commentN * (outcomes.avgRating >= 4.2 ? 0.72 : 0.58));
    const neg = Math.round(commentN * (outcomes.avgRating >= 4.2 ? 0.08 : 0.16));
    outcomes.positiveComments = pos;
    outcomes.negativeComments = neg;
    outcomes.neutralComments = Math.max(0, commentN - pos - neg);
    const sample = [];
    for (let i = 0; i < Math.min(2, outcomes.positiveComments); i += 1) sample.push({ text: COMMENTS.positive[i % COMMENTS.positive.length], sentiment: 'positive' });
    for (let i = 0; i < Math.min(2, outcomes.neutralComments); i += 1) sample.push({ text: COMMENTS.neutral[i % COMMENTS.neutral.length], sentiment: 'neutral' });
    for (let i = 0; i < Math.min(2, outcomes.negativeComments); i += 1) sample.push({ text: COMMENTS.negative[i % COMMENTS.negative.length], sentiment: 'negative' });
    outcomes.comments = sample;
    const hours = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const counts = scatter(outcomes.registrations, [2, 3, 5, 8, 9, 8, 7, 6, 5, 4, 2], rng);
    outcomes.hourly = hours.map((hour, index) => ({ hour, registrations: counts[index] }));
    act.outcomes = outcomes;
    const formScans = outcomes.registrations;
    const touch = formScans > 180 ? 3 : 1;
    const scanParts = allocate(formScans, touch === 3 ? [5, 3, 2] : [1]);
    act.qrCodes = [
      { id: `QR-${act.id}`, touchpoint: 'Form', scans: scanParts[0] || 0 },
      ...(touch === 3 ? [
        { id: `QR-${act.id}-A`, touchpoint: 'Entrance banner', scans: scanParts[1] },
        { id: `QR-${act.id}-B`, touchpoint: 'Flyer', scans: scanParts[2] },
      ] : []),
    ];
    act.formId = `FORM-${act.id}`;
    void byId;
  }

  const spend = [];
  let spendSeq = 1;
  const addSpend = (row) => {
    spend.push({ id: `SP-${String(spendSeq).padStart(5, '0')}`, attachmentName: row.amountRM > 8000 ? 'quotation.pdf' : '', ...row });
    spendSeq += 1;
  };
  for (const act of activations) {
    if (!act.budget) continue;
    const lines = rng.int(3, 7);
    const target = Math.round(act.budget * rng.range(0.74, 1.06));
    const cats = rng.shuffle(SPEND_CATEGORIES).slice(0, lines);
    const amounts = allocate(target, cats.map(() => rng.int(1, 8)));
    cats.forEach((category, index) => {
      addSpend({
        activationId: act.id,
        assetId: act.assetId,
        date: act.startDate,
        category,
        vendor: rng.pick(VENDORS),
        description: `${category} for ${act.name}`,
        amountRM: amounts[index],
        enteredBy: act.runBy === 'Operator' ? 'Aina Rahman' : 'Farah Idris',
        channel: category === 'Paid media' ? rng.pick(['Facebook', 'Instagram', 'Google Ads']) : '',
      });
    });
  }
  const months = [];
  for (let y = 2025, m = 1; y < 2026 || (y === 2026 && m <= 10); ) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m === 13) { m = 1; y += 1; }
  }
  for (const asset of ASSETS) {
    for (const month of months) {
      addSpend({
        activationId: null, assetId: asset.id, date: `${month}-01`, category: 'SEO', vendor: 'Media Raya Digital',
        description: `Monthly SEO for ${asset.shortCode}`, amountRM: rng.int(800, 1800), enteredBy: 'Danish Hakim', channel: '',
      });
      addSpend({
        activationId: null, assetId: asset.id, date: `${month}-01`, category: 'Website', vendor: 'PKNS in-house',
        description: `Website retainer share for ${asset.shortCode}`, amountRM: rng.int(400, 900), enteredBy: 'Danish Hakim', channel: 'Website',
      });
      if (month >= '2026-07') {
        addSpend({
          activationId: null, assetId: asset.id, date: `${month}-15`, category: 'Paid media', vendor: 'Media Raya Digital',
          description: `Always-on paid media for ${asset.shortCode}`, amountRM: rng.int(asset.type === 'Mall' ? 2000 : 800, asset.type === 'Mall' ? 6000 : 2500),
          enteredBy: 'Farah Idris', channel: rng.pick(['Facebook', 'Instagram', 'Google Ads']),
        });
      }
    }
  }

  const forms = activations.map((act) => ({
    id: act.formId,
    name: `${act.name} registration`,
    activationId: act.id,
    language: act.id.startsWith('ACT-Y') && rng.next() < 0.25 ? (rng.next() < 0.5 ? 'BM' : 'EN') : 'BM+EN',
    fields: DEFAULT_FORM_KEYS.map((key) => fieldFromKey(key, key === 'fullName' || key === 'mobile')),
    consentBlock: consentBlock(),
    thankYouMessage: 'Thank you. Your response has been recorded.',
    thankYouMessageBM: 'Terima kasih. Maklum balas anda telah direkodkan.',
    active: true,
    createdAt: act.createdAt,
  }));

  const budgets = [];
  for (const asset of ASSETS) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter, index) => {
      budgets.push({ year: 2026, assetId: asset.id, quarter, approvedRM: BUDGETS_2026[asset.id][index], notes: '' });
    });
  }

  const digitalMonths = months.filter((month) => month >= '2025-05');
  const digital = [];
  digitalMonths.forEach((month, index) => {
    const channels = {
      Facebook: { reach: Math.round(Math.min(180000, Math.max(40000, (40000 + (140000 * index) / 17) * rng.range(0.9, 1.1)))), engage: rng.range(0.035, 0.07) },
      Instagram: { reach: Math.round(Math.min(120000, Math.max(25000, (25000 + (95000 * index) / 17) * rng.range(0.9, 1.1)))), engage: rng.range(0.04, 0.08) },
      TikTok: { reach: Math.round(8000 + rng.int(0, 32000)), engage: rng.range(0.05, 0.1) },
      Website: { reach: Math.round(8000 + rng.int(0, 22000)), engage: rng.range(0.2, 0.45) },
      'Google Ads': { reach: 0, engage: 0 },
    };
    if (month >= '2026-07') {
      const adsSpend = rng.int(2000, 9000);
      channels['Google Ads'] = { reach: adsSpend * rng.int(40, 80), engage: 0.08, spend: adsSpend };
    }
    for (const [channel, spec] of Object.entries(channels)) {
      const parts = allocate(spec.reach, ASSETS.map((asset) => DIGITAL_WEIGHT[asset.id]));
      const engagements = allocate(Math.round(spec.reach * (spec.engage || 0)), ASSETS.map((asset) => DIGITAL_WEIGHT[asset.id]));
      const clicks = allocate(Math.round(spec.reach * (spec.engage || 0) * 0.22), ASSETS.map((asset) => DIGITAL_WEIGHT[asset.id]));
      const spendParts = allocate(spec.spend || 0, ASSETS.map((asset) => DIGITAL_WEIGHT[asset.id]));
      const followers = allocate(channel === 'Website' || channel === 'Google Ads' ? 0 : rng.int(80, 900), ASSETS.map((asset) => DIGITAL_WEIGHT[asset.id]));
      ASSETS.forEach((asset, assetIndex) => {
        digital.push({
          month,
          channel,
          assetId: asset.id,
          reach: parts[assetIndex],
          impressions: channel === 'Website' ? parts[assetIndex] : Math.round(parts[assetIndex] * 1.6),
          engagements: engagements[assetIndex],
          clicks: clicks[assetIndex],
          spendRM: spendParts[assetIndex] || 0,
          formSubmissions: 0,
          followersGained: followers[assetIndex] || 0,
        });
      });
    }
  });
  for (const person of profiles) {
    const month = person.firstSeen.slice(0, 7);
    let channel = null;
    if (person.sourceChannelFirst === 'Website form') channel = 'Website';
    if (person.sourceChannelFirst === 'Social lead form') channel = person.socialNetwork || 'Facebook';
    if (!channel) continue;
    const row = digital.find((item) => item.month === month && item.channel === channel && item.assetId === person.assetIds[0]);
    if (row) row.formSubmissions += 1;
  }

  const posts = [];
  for (let i = 0; i < 200; i += 1) {
    const act = activations[i % activations.length];
    const asset = ASSETS.find((item) => item.id === act.assetId);
    const channel = rng.pick(['Facebook', 'Instagram', 'TikTok']);
    const template = CAPTION_TEMPLATES[i % CAPTION_TEMPLATES.length];
    const reach = rng.int(800, 18000);
    const engagements = Math.round(reach * rng.range(0.03, 0.09));
    const comments = rng.int(0, 40);
    const positive = Math.round(comments * 0.6);
    const negative = Math.round(comments * 0.1);
    posts.push({
      id: `POST-${String(i + 1).padStart(3, '0')}`,
      date: act.startDate <= AS_OF ? act.startDate : addDays(AS_OF, -((i % 40) + 1)),
      channel,
      assetId: act.assetId,
      caption: template.replace('{name}', act.name).replace('{asset}', asset.shortCode),
      boosted: rng.next() < 0.15,
      reach,
      engagements,
      comments,
      positive,
      neutral: Math.max(0, comments - positive - negative),
      negative,
    });
  }

  const adCampaigns = [];
  const adsNames = ['Carian keluarga Shah Alam', 'Promosi hujung minggu', 'Hari terbuka pejabat'];
  digital.filter((row) => row.channel === 'Google Ads' && row.spendRM > 0).forEach((row) => {
    const parts = allocate(row.spendRM, [3, 2, 1]);
    const clicks = allocate(row.clicks, [3, 2, 1]);
    const impressions = allocate(row.impressions, [3, 2, 1]);
    const conversions = allocate(row.formSubmissions, [3, 2, 1]);
    adsNames.forEach((name, index) => {
      if (!parts[index]) return;
      adCampaigns.push({
        id: `ADS-${row.month}-${row.assetId}-${index}`,
        month: row.month,
        name,
        assetId: row.assetId,
        spendRM: parts[index],
        impressions: impressions[index],
        clicks: clicks[index],
        conversions: conversions[index],
      });
    });
  });

  const pageStats = WEB_PAGES.map((page) => ({
    ...page,
    submissions: profiles.filter((person) => person.webPage === page.path).length,
  }));
  const webReach = digital.filter((row) => row.channel === 'Website').reduce((sum, row) => sum + row.reach, 0);
  const sessionParts = allocate(webReach, [8, 6, 3, 3, 4, 2]);
  pageStats.forEach((page, index) => { page.sessions = sessionParts[index]; });

  const audit = [];
  const auditActions = [
    ['Viewed profile', 'Profile'],
    ['Exported segment', 'Segment'],
    ['Edited activation', 'Activation'],
    ['Imported file', 'Import'],
    ['Changed role', 'User'],
    ['Revealed contact', 'Profile'],
    ['Withdrew consent', 'Profile'],
    ['Deleted profile', 'Profile'],
  ];
  for (let i = 0; i < 60; i += 1) {
    const [action, targetType] = auditActions[i % auditActions.length];
    const person = profiles[rng.int(0, profiles.length - 1)];
    const act = activations[i % activations.length];
    audit.push({
      id: `AUD-${String(i + 1).padStart(3, '0')}`,
      timestamp: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T${String(8 + (i % 9)).padStart(2, '0')}:15:00+08:00`,
      userName: i % 3 === 0 ? 'Danish Hakim' : 'Farah Idris',
      role: i % 3 === 0 ? 'AMP Executive' : 'AMP Manager',
      action,
      targetType,
      targetId: targetType === 'Profile' ? person.id : targetType === 'Activation' ? act.id : targetType === 'Segment' ? SEGMENT_SEEDS[i % SEGMENT_SEEDS.length].id : imports[i % imports.length].id,
      details: `${action} · ${targetType === 'Profile' ? person.id : act.name}`,
    });
  }

  const deletionRequests = [2, 40, 90].map((index) => ({
    id: `DEL-${profiles[index].id}`,
    profileId: profiles[index].id,
    requestedBy: 'Farah Idris',
    requestedAt: '2026-10-12',
    status: 'Pending',
    note: 'Delete on request',
  }));

  const mobileIndex = new Map(profiles.map((person) => [person.mobile, person.id]));
  const emailIndex = new Map(profiles.map((person) => [person.email.toLowerCase(), person.id]));
  const legacyCount = profiles.filter((person) => person.importedFromLegacy).length;
  const unknownCount = profiles.filter((person) => person.consent.unknown).length;
  const summary = {
    assets: ASSETS.length,
    activations: activations.length,
    profiles: profiles.length,
    legacyProfiles: legacyCount,
    newProfiles: profiles.length - legacyCount,
    consentUnknown: unknownCount,
    marketingOptIn: profiles.filter((person) => person.consent.marketingOptIn).length,
    withChildren: profiles.filter((person) => person.childrenCount > 0).length,
    importRows: imports.reduce((sum, job) => sum + job.rowsTotal, 0),
    importImported: imports.reduce((sum, job) => sum + job.rowsImported, 0),
    importMerged: imports.reduce((sum, job) => sum + job.duplicatesMerged, 0),
    importRejected: imports.reduce((sum, job) => sum + job.rowsRejected, 0),
    spendLines: spend.length,
    posts: posts.length,
    audit: audit.length,
  };
  if (summary.profiles !== 16000) throw new Error(`Expected 16000 profiles, got ${summary.profiles}`);
  if (summary.legacyProfiles !== LEGACY_PROFILES) throw new Error(`Legacy ${summary.legacyProfiles}`);
  if (summary.consentUnknown !== CONSENT_UNKNOWN) throw new Error(`Unknown consent ${summary.consentUnknown}`);
  if (summary.importRows !== IMPORT_ROWS) throw new Error(`Import rows ${summary.importRows}`);
  if (summary.activations !== 70) throw new Error(`Activations ${summary.activations}`);

  return {
    asOf: AS_OF,
    assets: ASSETS.map((asset) => ({ ...asset, photoUrl: '', createdBy: 'Razak Ibrahim', createdAt: '2025-01-06T09:00:00+08:00' })),
    operators: OPERATORS.map((item) => ({ ...item, assetIds: item.assetIds.slice() })),
    activations,
    spend,
    forms,
    profiles,
    segments: SEGMENT_SEEDS.map((item) => ({ ...item, groups: item.groups.map((group) => ({ ...group, conditions: group.conditions.map((cond) => ({ ...cond })) })) })),
    digital,
    posts,
    adCampaigns,
    webPages: pageStats,
    budgets,
    imports,
    audit,
    users: USERS.map((user) => ({ ...user })),
    fields: FIELD_LIBRARY.map((field) => ({ ...field, options: field.options ? field.options.slice() : undefined })),
    deletionRequests,
    retentionMonths: 36,
    autoAnonymise: true,
    mobileIndex,
    emailIndex,
    summary,
    activationTypes: ACTIVATION_TYPES,
    footfallPreview: digitalMonths.map((month, index) => ({ month, visitors: 14000 + index * 420 })),
  };
}

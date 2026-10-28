import { CONSENT_VERSION } from './config.js';
import { findProfile } from './live.js';

export function blankOutcomes() {
  return {
    registrations: 0, attendanceScanned: 0, walkInCount: 0, totalAttendance: 0,
    newProfiles: 0, returningProfiles: 0, adults: 0, children: 0, avgGroupSize: 0,
    spendCapturedRM: 0, surveyResponses: 0, avgRating: null, positiveComments: 0,
    neutralComments: 0, negativeComments: 0, ratingCounts: [0, 0, 0, 0, 0], comments: [], hourly: [],
  };
}

export function normaliseMobile(value) {
  return String(value || '').replace(/\D/g, '');
}

export function findExistingId(data, state, mobile, email) {
  const digits = normaliseMobile(mobile);
  const mail = String(email || '').trim().toLowerCase();
  if (digits && data.mobileIndex.has(digits) && !state.profileDeleted?.[data.mobileIndex.get(digits)]) return data.mobileIndex.get(digits);
  if (mail && data.emailIndex.has(mail) && !state.profileDeleted?.[data.emailIndex.get(mail)]) return data.emailIndex.get(mail);
  for (const profile of state.profilesAdded || []) {
    if (state.profileDeleted?.[profile.id]) continue;
    if (digits && normaliseMobile(profile.mobile) === digits) return profile.id;
    if (mail && profile.email.toLowerCase() === mail) return profile.id;
  }
  return null;
}

export function areaForPostcode(data, postcode) {
  const known = {
    40000: 'Shah Alam', 40100: 'Shah Alam', 40150: 'Shah Alam', 40160: 'Shah Alam', 40170: 'Shah Alam',
    40200: 'Shah Alam', 40400: 'Shah Alam', 40460: 'Shah Alam', 46000: 'Petaling Jaya', 46050: 'Petaling Jaya',
    46200: 'Petaling Jaya', 47301: 'Petaling Jaya', 47810: 'Kota Damansara', 47500: 'Subang Jaya', 47600: 'Subang Jaya',
    41000: 'Klang', 41150: 'Klang', 41200: 'Klang',
  };
  if (known[postcode]) return known[postcode];
  const n = Number(postcode);
  if (n === 47810) return 'Kota Damansara';
  if (n >= 40000 && n <= 40470) return 'Shah Alam';
  if (n >= 47500 && n <= 47650) return 'Subang Jaya';
  if (n >= 41000 && n <= 42999) return 'Klang';
  if (n >= 46000 && n <= 47830) return 'Petaling Jaya';
  return 'Selangor';
  void data;
}

export function buildSubmission({ data, state, form, activation, values, touchpoint }) {
  const mobile = normaliseMobile(values.mobile);
  const email = String(values.email || '').trim();
  const existingId = findExistingId(data, state, mobile, email);
  const now = activation?.startDate && activation.startDate > '2026-10-28' ? '2026-10-28' : (activation?.endDate && activation.endDate < '2026-10-28' ? activation.endDate : '2026-10-28');
  const leadTypes = ['Visitor'];
  if (activation && /school|family|community|festive|kids/i.test(`${activation.type} ${activation.name}`)) leadTypes.push('Programme participant');
  if (values.interestedRent === 'Yes' && !leadTypes.includes('Prospective tenant')) leadTypes.push('Prospective tenant');
  if (values.interestedBuy === 'Yes' && !leadTypes.includes('Prospective buyer')) leadTypes.push('Prospective buyer');
  const interests = Array.isArray(values.interests) ? values.interests : String(values.interests || '').split(',').map((item) => item.trim()).filter(Boolean);
  const childrenAgeBands = Array.isArray(values.childrenAgeBands) ? values.childrenAgeBands : [];
  const base = {
    fullName: String(values.fullName || '').trim(),
    mobile,
    email,
    postcode: String(values.postcode || '').trim(),
    area: areaForPostcode(data, String(values.postcode || '').trim()),
    ageBand: values.ageBand || '',
    gender: values.gender || '',
    householdSize: Number(values.householdSize || 0) || null,
    childrenCount: Number(values.childrenCount || 0) || 0,
    childrenAgeBands,
    interests,
    heard: values.heard || '',
    party: values.party || '',
    visitPurpose: values.visitPurpose || '',
    interestedRent: values.interestedRent || 'No',
    interestedBuy: values.interestedBuy || 'No',
  };
  if (existingId) {
    const existing = findProfile(data, state, existingId);
    const links = [...(existing.links || []), { activationId: activation.id, isNew: false, spendRM: 0 }];
    const assetIds = [...new Set([...(existing.assetIds || []), activation.assetId])];
    return {
      kind: 'merge',
      id: existingId,
      patch: {
        ...base,
        fullName: base.fullName || existing.fullName,
        links,
        activationIds: links.map((link) => link.activationId),
        assetIds,
        totalActivationsAttended: links.length,
        lastSeen: now > existing.lastSeen ? now : existing.lastSeen,
        leadTypes: [...new Set([...(existing.leadTypes || []), ...leadTypes])],
        interests: [...new Set([...(existing.interests || []), ...interests])],
        consent: {
          ...existing.consent,
          marketingOptIn: values.marketingOptIn ? true : existing.consent.marketingOptIn,
          unknown: false,
          consentVersion: CONSENT_VERSION,
          consentDate: existing.consent.consentDate || now,
          source: existing.consent.source || 'Event QR',
        },
      },
      isNew: false,
      touchpoint,
    };
  }
  const id = `PR-N${String((state.seq || 1)).padStart(4, '0')}`;
  return {
    kind: 'create',
    isNew: true,
    touchpoint,
    profile: {
      id,
      ...base,
      leadTypes,
      firstSeen: now,
      lastSeen: now,
      sourceChannelFirst: 'Event QR',
      socialNetwork: null,
      webPage: null,
      assetIds: [activation.assetId],
      links: [{ activationId: activation.id, isNew: true, spendRM: 0 }],
      activationIds: [activation.id],
      totalActivationsAttended: 1,
      spendCapturedRM: 0,
      consent: {
        required: true,
        marketingOptIn: Boolean(values.marketingOptIn),
        unknown: false,
        consentDate: now,
        consentVersion: CONSENT_VERSION,
        source: touchpoint ? `Event QR · ${touchpoint}` : 'Event QR',
        withdrawn: false,
      },
      importedFromLegacy: false,
      legacySourceFile: null,
      createdFromActivationId: activation.id,
    },
  };
}

export function nextOutcomes(outcomes, { isNew, rating, comment }) {
  const next = {
    ...outcomes,
    ratingCounts: [...(outcomes.ratingCounts || [0, 0, 0, 0, 0])],
    comments: [...(outcomes.comments || [])],
    hourly: (outcomes.hourly || []).map((row) => ({ ...row })),
  };
  next.registrations += 1;
  next.attendanceScanned += 1;
  next.totalAttendance += 1;
  next.adults += 1;
  if (isNew) next.newProfiles += 1;
  else next.returningProfiles += 1;
  next.avgGroupSize = next.registrations ? Number((next.totalAttendance / next.registrations).toFixed(2)) : 0;
  if (rating) {
    const star = Math.min(5, Math.max(1, Number(rating)));
    const prevN = next.surveyResponses || 0;
    const prevAvg = next.avgRating || 0;
    next.surveyResponses = prevN + 1;
    next.avgRating = ((prevAvg * prevN) + star) / next.surveyResponses;
    next.ratingCounts[star - 1] += 1;
  }
  if (comment) next.comments = [...next.comments, { text: comment, sentiment: 'Not coded' }];
  if (next.hourly?.length) {
    const hour = next.hourly[Math.min(next.hourly.length - 1, 4)];
    hour.registrations += 1;
  }
  return next;
}

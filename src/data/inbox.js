export function sampleSubmissions(forms, profiles, qrCodes, liveSubs = []) {
  const byAct = new Map();
  for (const profile of profiles) {
    for (const link of profile.links || []) {
      let bucket = byAct.get(link.activationId);
      if (!bucket) {
        bucket = [];
        byAct.set(link.activationId, bucket);
      }
      if (bucket.length < 6) bucket.push({ profile, isNew: link.isNew });
    }
  }
  const rows = liveSubs.map((row) => ({ ...row }));
  for (const form of forms) {
    if (!form.activationId) continue;
    const qrs = qrCodes.filter((qr) => qr.formId === form.id);
    const linked = byAct.get(form.activationId) || [];
    linked.forEach((item, index) => {
      const qr = qrs[index % Math.max(1, qrs.length)];
      rows.push({
        id: `SUB-${form.id}-${item.profile.id}`,
        formId: form.id,
        qrId: qr?.id || '',
        touchpoint: qr?.touchpoint || 'Form',
        profileId: item.profile.id,
        profileName: item.profile.fullName,
        mobile: item.profile.mobile,
        submittedAt: item.isNew ? item.profile.firstSeen : (item.profile.lastSeen || form.updatedAt),
        answers: {},
        consent: { required: true, marketing: Boolean(item.profile.consent?.marketingOptIn) },
        isDuplicate: false,
        status: item.isNew ? 'New' : 'Matched to existing profile',
        assetId: form.assetIds?.[0] || '',
        activationId: form.activationId,
      });
    });
  }
  return rows;
}

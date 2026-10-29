import { useEffect, useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { FieldControl } from '../components/FormFields.jsx';
import Modal from '../components/Modal.jsx';
import { QrPreview } from '../components/QrArt.jsx';
import { auditEntry } from '../components/bits.jsx';
import { AS_OF_ISO } from '../data/config.js';
import { buildSubmission, nextOutcomes } from '../data/submit.js';
import { useAmp } from '../useAmp.jsx';
import { date } from '../format.js';

function liveActivation(data, state, id) {
  if (!id) return null;
  const base = [...data.activations, ...(state.activationsAdded || [])].find((item) => item.id === id);
  if (!base) return null;
  const patch = state.activationPatches?.[id];
  return patch ? { ...base, ...patch, outcomes: { ...base.outcomes, ...(patch.outcomes || {}) }, qrCodes: patch.qrCodes || base.qrCodes } : base;
}

export default function PublicForm({ kiosk = false }) {
  const { route, forms, qrCodes, data, state, dispatch } = useAmp();
  const id = route.params[0];
  const form = forms.find((item) => item.id === id);
  const [lang, setLang] = useState('EN');
  const [values, setValues] = useState({});
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(false);
  const [pin, setPin] = useState(false);
  const [code, setCode] = useState('');
  const [walk, setWalk] = useState({ adults: 0, children: 0 });
  const activation = form ? liveActivation(data, state, form.activationId) : null;
  useEffect(() => {
    if (!kiosk || !done) return undefined;
    const timer = setTimeout(() => {
      setDone(null);
      setValues({});
      setConsent(false);
      setMarketing(false);
      setError('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [kiosk, done]);
  if (!form) return <div className="public-shell"><h1>Form not found</h1></div>;
  const closed = form.status === 'Closed' || form.status === 'Archived' || form.active === false;
  const scheduled = form.status === 'Scheduled' || (form.opensAt && form.opensAt > AS_OF_ISO);
  const full = form.capacity && Number(form.submissionsCount || 0) >= Number(form.capacity);
  const t = (en, bm) => (lang === 'BM' ? bm : en);
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const matchQr = () => {
    const touch = route.search.tp || '';
    return qrCodes.find((qr) => qr.formId === form.id && (qr.sourceTag === touch || qr.touchpoint === touch || qr.touchpoint.toLowerCase().replace(/[^a-z0-9]+/g, '') === touch));
  };
  const bumpWalk = (key, delta) => {
    if (!activation) return;
    const next = Math.max(0, (activation.outcomes?.[key] || 0) + delta);
    const outcomes = { ...activation.outcomes, [key]: next, walkInCount: (activation.outcomes?.walkInCount || 0) + delta, totalAttendance: Math.max(0, (activation.outcomes?.totalAttendance || 0) + delta) };
    dispatch({ type: 'patchActivation', id: activation.id, patch: { outcomes } });
    setWalk((current) => ({ ...current, [key]: Math.max(0, current[key] + delta) }));
  };
  const submit = (event) => {
    event.preventDefault();
    if (closed || scheduled || full) return;
    if (!consent) {
      setError(t('Consent is required.', 'Persetujuan diperlukan.'));
      return;
    }
    for (const field of form.fields) {
      if (field.showIf && values[field.showIf.key] !== field.showIf.value) continue;
      if (field.required && !values[field.key]) {
        setError(t('Complete the required fields.', 'Lengkapkan medan yang diperlukan.'));
        return;
      }
    }
    const qr = matchQr();
    if (form.settings?.preventDuplicateByMobile && values.mobile) {
      const planPeek = buildSubmission({ data, state, form, activation, values, touchpoint: qr?.touchpoint || 'Form' });
      if (planPeek.kind === 'merge') {
        setError(t('This mobile number is already registered.', 'Nombor telefon ini sudah didaftarkan.'));
        return;
      }
    }
    const plan = buildSubmission({ data, state, form, activation, values: { ...values, marketingOptIn: marketing }, touchpoint: qr?.touchpoint || route.search.tp || 'Form' });
    const outcomes = activation ? nextOutcomes(activation.outcomes || {}, { isNew: plan.isNew, rating: values.rating, comment: values.comments }) : null;
    const qrCodesNext = activation ? (activation.qrCodes || []).map((code) => (qr && code.id === qr.id ? { ...code, scans: (code.scans || 0) + 1, submissions: (code.submissions || 0) + 1 } : code)) : null;
    const pass = form.settings?.issueEntryPass ? `PKNS-${state.seq}` : '';
    dispatch({
      type: 'applySubmission',
      created: plan.kind === 'create' ? plan.profile : null,
      merged: plan.kind === 'merge' ? { id: plan.id, patch: plan.patch } : null,
      activationId: activation?.id,
      outcomes,
      qrCodes: qrCodesNext,
      formId: form.id,
      formPatch: { submissionsCount: (form.submissionsCount || 0) + 1 },
      qrId: qr?.id,
      qrPatch: qr ? {
        scans: (qr.scans || 0) + 1,
        uniqueScans: (qr.uniqueScans || 0) + 1,
        submissions: (qr.submissions || 0) + 1,
        funnel: { ...(qr.funnel || {}), scans: (qr.funnel?.scans || qr.scans || 0) + 1, submitted: (qr.funnel?.submitted || qr.submissions || 0) + 1 },
      } : null,
      submission: {
        id: `SUB-L${state.seq}`,
        formId: form.id,
        qrId: qr?.id || '',
        touchpoint: qr?.touchpoint || 'Form',
        profileId: plan.kind === 'create' ? plan.profile.id : plan.id,
        profileName: values.fullName || plan.profile?.fullName || '',
        mobile: values.mobile || '',
        submittedAt: AS_OF_ISO,
        answers: values,
        consent: { required: true, marketing },
        isDuplicate: false,
        status: plan.isNew ? 'New' : 'Matched to existing profile',
        assetId: form.assetIds?.[0] || activation?.assetId || '',
        activationId: activation?.id || '',
      },
      audit: auditEntry(state, 'Edited activation', 'Form', form.id, plan.isNew ? 'New profile from public form' : 'Merged profile from public form'),
    });
    setDone({ pass });
  };
  const shell = kiosk ? 'kiosk-shell' : 'public-shell';
  const blocked = closed || scheduled || full;
  return (
    <div className={shell}>
      <div className="public-card">
        <header className="public-hero" style={{ borderTop: `6px solid ${form.design?.themeColour || '#E31E24'}` }}>
          {form.design?.showPKNSLogo !== false && <img src={logo} alt="PKNS" height="40" />}
          <div className="screen-actions">
            <button type="button" className={`btn${lang === 'EN' ? ' on' : ''}`} onClick={() => setLang('EN')}>EN</button>
            <button type="button" className={`btn${lang === 'BM' ? ' on' : ''}`} onClick={() => setLang('BM')}>BM</button>
          </div>
          <h1>{t(form.design?.headlineEN || form.publicTitle || form.name, form.design?.headlineBM || form.publicTitle || form.name)}</h1>
          {activation && <p className="info-card">{date(activation.startDate)} · {activation.specificLocation}</p>}
          <p>{t(form.design?.introEN || '', form.design?.introBM || '')}</p>
        </header>
        {kiosk && <p className="sample-badge">Submissions queued: 3</p>}
        {kiosk && activation && (
          <div className="info-card">
            <h2>{t('Walk-in counter', 'Kaunter walk-in')}</h2>
            <p>Adults {walk.adults} <button type="button" className="btn" onClick={() => bumpWalk('adults', 1)}>+</button> <button type="button" className="btn" onClick={() => bumpWalk('adults', -1)}>−</button></p>
            <p>Children {walk.children} <button type="button" className="btn" onClick={() => bumpWalk('children', 1)}>+</button> <button type="button" className="btn" onClick={() => bumpWalk('children', -1)}>−</button></p>
            <button type="button" className="btn" onClick={() => setPin(true)}>{t('Staff exit', 'Keluar kakitangan')}</button>
          </div>
        )}
        {blocked && (
          <div className="info-card">
            <h2>{closed ? t(form.closedMessageEN || 'This form is closed.', form.closedMessageBM || 'Borang ini ditutup.') : full ? t('Registration is full.', 'Pendaftaran sudah penuh.') : t('This form is not open yet.', 'Borang ini belum dibuka.')}</h2>
            {activation && <p>{activation.name}</p>}
          </div>
        )}
        {!blocked && done && (
          <div className="qr-thanks">
            <h2>{t(form.settings?.thankYouEN || form.thankYouMessage, form.settings?.thankYouBM || form.thankYouMessageBM)}</h2>
            {done.pass && (
              <>
                <p>{t('Entry pass', 'Pas masuk')} {done.pass}</p>
                <QrPreview value={done.pass} canvasId="entry-pass" />
              </>
            )}
            {form.settings?.showAddToCalendar && activation && <a className="btn" href={`#/activation/${activation.id}`}>{t('Add to calendar', 'Tambah ke kalendar')}</a>}
            {kiosk && <p>{t('A new form opens in 5 seconds.', 'Borang baharu dibuka dalam 5 saat.')}</p>}
          </div>
        )}
        {!blocked && !done && (
          <form onSubmit={submit}>
            {form.fields.filter((field) => !field.showIf || values[field.showIf.key] === field.showIf.value).map((field) => (
              <FieldControl key={field.key} field={field} lang={lang} value={values[field.key]} onChange={set} />
            ))}
            <div className="consent-pin">
              <p>{t(form.consentBlock.purposeTextEN, form.consentBlock.purposeTextBM)}</p>
              <label className="check-inline"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t(form.consentBlock.requiredConsent, form.consentBlock.requiredConsentBM)} *</span></label>
              <label className="check-inline"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>{t(form.consentBlock.marketingOptIn, form.consentBlock.marketingOptInBM)}</span></label>
              <button type="button" className="btn" onClick={() => setNotice(true)}>{t('Privacy notice', 'Notis privasi')}</button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary public-submit">{t('Submit', 'Hantar')}</button>
          </form>
        )}
      </div>
      <Modal open={notice} title={t('Privacy notice', 'Notis privasi')} onClose={() => setNotice(false)}>
        <p>{t(form.consentBlock.purposeTextEN, form.consentBlock.purposeTextBM)}</p>
        <a href="#/privacy">{t('Open the full notice', 'Buka notis penuh')}</a>
      </Modal>
      <Modal open={pin} title="Staff PIN" onClose={() => setPin(false)}>
        <input className="control" value={code} onChange={(event) => setCode(event.target.value)} aria-label="Staff PIN" />
        <button type="button" className="btn btn-primary" onClick={() => { if (code === '2468') window.location.hash = '#/forms'; }}>Exit kiosk</button>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { useAmp } from '../useAmp.jsx';
import { buildSubmission, nextOutcomes } from '../data/submit.js';
import { auditEntry } from '../components/bits.jsx';

export default function PublicForm() {
  const amp = useAmp();
  const { route, forms, data, state, dispatch } = amp;
  const id = route.params[0];
  const form = forms.find((item) => item.id === id);
  const [lang, setLang] = useState('EN');
  const [values, setValues] = useState({});
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!form) return <div className="qr-page"><h1>Form not found</h1></div>;
  const activation = [...data.activations, ...(state.activationsAdded || [])].map((act) => {
    const patch = state.activationPatches?.[act.id];
    return patch ? { ...act, ...patch, outcomes: { ...act.outcomes, ...(patch.outcomes || {}) }, qrCodes: patch.qrCodes || act.qrCodes } : act;
  }).find((act) => act.id === form.activationId);
  const label = (field) => (lang === 'BM' ? field.labelBM : field.labelEN);
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (!consent) {
      setError(lang === 'BM' ? 'Persetujuan diperlukan.' : 'Consent is required.');
      return;
    }
    for (const field of form.fields) {
      if (field.required && !values[field.key]) {
        setError(lang === 'BM' ? 'Lengkapkan medan yang diperlukan.' : 'Complete the required fields.');
        return;
      }
    }
    if (!activation) {
      setError('This form is not linked to an activation.');
      return;
    }
    setSaving(true);
    const touch = route.search.tp || 'Form';
    const plan = buildSubmission({ data, state, form, activation, values: { ...values, marketingOptIn: marketing }, touchpoint: touch });
    const outcomes = nextOutcomes(activation.outcomes || {}, { isNew: plan.isNew, rating: values.rating, comment: values.comments });
    const qrCodes = (activation.qrCodes || [{ id: `QR-${activation.id}`, touchpoint: 'Form', scans: 0 }]).map((code) => (
      code.touchpoint === touch ? { ...code, scans: (code.scans || 0) + 1 } : code
    ));
    dispatch({
      type: 'applySubmission',
      created: plan.kind === 'create' ? plan.profile : null,
      merged: plan.kind === 'merge' ? { id: plan.id, patch: plan.patch } : null,
      activationId: activation.id,
      outcomes,
      qrCodes,
      audit: auditEntry(state, 'Edited activation', 'Activation', activation.id, plan.isNew ? 'New profile from public form' : 'Merged profile from public form'),
    });
    setSaving(false);
    setDone(true);
  };
  if (done) {
    return (
      <div className="qr-page">
        <img src={logo} alt="PKNS" height="48" />
        <div className="qr-thanks"><h1>{lang === 'BM' ? form.thankYouMessageBM : form.thankYouMessage}</h1></div>
      </div>
    );
  }
  return (
    <div className="qr-page">
      <img src={logo} alt="PKNS" height="48" />
      <div className="screen-actions">
        <button type="button" className={`btn${lang === 'EN' ? ' on' : ''}`} onClick={() => setLang('EN')}>EN</button>
        <button type="button" className={`btn${lang === 'BM' ? ' on' : ''}`} onClick={() => setLang('BM')}>BM</button>
      </div>
      <h1>{form.name}</h1>
      <form onSubmit={submit}>
        {form.fields.map((field) => (
          <label key={field.key}>
            {label(field)}{field.required ? ' *' : ''}
            {field.type === 'select' || field.type === 'multiselect' ? (
              <select multiple={field.type === 'multiselect'} value={field.type === 'multiselect' ? (values[field.key] || []) : (values[field.key] || '')} onChange={(event) => {
                if (field.type === 'multiselect') set(field.key, [...event.target.selectedOptions].map((option) => option.value));
                else set(field.key, event.target.value);
              }}>
                {field.type === 'select' && <option value="">—</option>}
                {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === 'rating' ? (
              <select value={values[field.key] || ''} onChange={(event) => set(field.key, event.target.value)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input type={field.type === 'number' ? 'number' : 'text'} value={values[field.key] || ''} onChange={(event) => set(field.key, event.target.value)} />
            )}
          </label>
        ))}
        <div className="consent-pin">
          <p>{lang === 'BM' ? form.consentBlock.purposeTextBM : form.consentBlock.purposeTextEN}</p>
          <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> {lang === 'BM' ? form.consentBlock.requiredConsentBM : form.consentBlock.requiredConsent}</label>
          <label><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /> {lang === 'BM' ? form.consentBlock.marketingOptInBM : form.consentBlock.marketingOptIn}</label>
          <p><a href={form.consentBlock.privacyNoticeUrl}>Privacy notice</a></p>
        </div>
        {error && <p className="qr-problem">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : (lang === 'BM' ? 'Hantar' : 'Submit')}</button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import logo from '../assets/pkns-logo.png';
import Field from '../components/Field.jsx';
import { ASSETS } from '../data/config.js';
import { SPACE_TYPES } from '../qrEnquiry.js';
import { insertQrEnquiry, qrStoreConfigured } from '../qrStore.js';

const EMPTY = { name: '', business: '', spaceType: '', asset: '', phone: '', consent: false };

export default function QrForm() {
  const [fields, setFields] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState('');
  const [errors, setErrors] = useState({});

  const set = (key) => (event) => setFields((cur) => ({ ...cur, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setProblem('');
    const next = {};
    if (!fields.name.trim()) next.name = 'Enter the name';
    if (!fields.business.trim()) next.business = 'Enter the business';
    if (!fields.spaceType) next.spaceType = 'Choose a space type';
    if (!fields.asset) next.asset = 'Choose an asset';
    if (!fields.phone.trim()) next.phone = 'Enter a phone number';
    if (!fields.consent) next.consent = 'Agree to be contacted about this enquiry';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!qrStoreConfigured()) {
      setProblem('This demo form is not connected yet. Nothing was sent.');
      return;
    }
    setSending(true);
    const result = await insertQrEnquiry({
      name: fields.name.trim(),
      business: fields.business.trim(),
      space_type: fields.spaceType,
      asset: fields.asset,
      phone: fields.phone.trim(),
    });
    setSending(false);
    if (!result.ok) {
      setProblem('The form could not be sent. Please try again in a moment.');
      return;
    }
    setDone(true);
  };

  return (
    <main className="qr-page">
      <img className="login-logo" src={logo} alt="PKNS" />
      <h1>Send an enquiry</h1>
      <p className="qr-note" data-testid="qr-demo-note">Demo: please use made-up details</p>
      {done ? (
        <p className="qr-thanks" data-testid="qr-thanks">Sent. It will show on the enquiry pipeline under New.</p>
      ) : (
        <form noValidate onSubmit={submit}>
          <Field label="Name" error={errors.name}>
            <input name="name" autoComplete="name" value={fields.name} onChange={set('name')} />
          </Field>
          <Field label="Business" error={errors.business}>
            <input name="business" autoComplete="organization" value={fields.business} onChange={set('business')} />
          </Field>
          <Field label="Space type" error={errors.spaceType}>
            <select name="spaceType" value={fields.spaceType} onChange={set('spaceType')}>
              <option value="">Select…</option>
              {SPACE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Asset" error={errors.asset}>
            <select name="asset" value={fields.asset} onChange={set('asset')}>
              <option value="">Select…</option>
              {ASSETS.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input name="phone" type="tel" autoComplete="tel" value={fields.phone} onChange={set('phone')} />
          </Field>
          <label className="check-line">
            <input type="checkbox" checked={fields.consent} onChange={(event) => setFields((cur) => ({ ...cur, consent: event.target.checked }))} />
            <span>I agree to be contacted by PKNS about this enquiry</span>
          </label>
          {errors.consent ? <p className="field-error">{errors.consent}</p> : null}
          {problem ? <p className="qr-problem" role="status">{problem}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      )}
    </main>
  );
}

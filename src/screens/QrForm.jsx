import { useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { ASSETS } from '../data/config.js';
import { SPACE_TYPES } from '../qrEnquiry.js';
import { insertQrEnquiry, qrStoreConfigured } from '../qrStore.js';

const EMPTY = { name: '', business: '', spaceType: '', asset: '', phone: '' };

export default function QrForm() {
  const [fields, setFields] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState('');

  const set = (key) => (event) => setFields((cur) => ({ ...cur, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setProblem('');
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
        <form onSubmit={submit}>
          <label>
            Name
            <input name="name" autoComplete="name" required value={fields.name} onChange={set('name')} />
          </label>
          <label>
            Business
            <input name="business" autoComplete="organization" required value={fields.business} onChange={set('business')} />
          </label>
          <label>
            Space type
            <select name="spaceType" required value={fields.spaceType} onChange={set('spaceType')}>
              <option value="">Choose</option>
              {SPACE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Asset
            <select name="asset" required value={fields.asset} onChange={set('asset')}>
              <option value="">Choose</option>
              {ASSETS.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </label>
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" required value={fields.phone} onChange={set('phone')} />
          </label>
          {problem ? <p className="qr-problem" role="status">{problem}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      )}
    </main>
  );
}

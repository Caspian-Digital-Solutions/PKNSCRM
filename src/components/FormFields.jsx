import { areaForPostcode } from '../data/submit.js';
import { ChipSelect, EmojiRating, Stars, TextInput } from './controls.jsx';

export function FieldControl({ field, value, onChange, lang = 'EN' }) {
  const label = lang === 'BM' ? field.labelBM : field.labelEN;
  const set = (next) => onChange(field.key, next);
  if (field.type === 'multiselect') {
    return (
      <div className="field">
        <span className="field-label">{label}{field.required ? ' *' : ''}</span>
        <ChipSelect ariaLabel={label} options={field.options || []} value={Array.isArray(value) ? value : []} onChange={set} />
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <div className="field">
        <span className="field-label">{label}{field.required ? ' *' : ''}</span>
        <div className="radio-cards">
          {(field.options || []).map((option) => (
            <label key={option} className={`radio-card${value === option ? ' on' : ''}`}>
              <input type="radio" name={field.key} checked={value === option} onChange={() => set(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === 'rating') return <div className="field"><span className="field-label">{label}</span><Stars value={value} onChange={set} /></div>;
  if (field.type === 'emoji') return <div className="field"><span className="field-label">{label}</span><EmojiRating value={value} onChange={set} /></div>;
  if (field.type === 'phone') {
    return (
      <div className="field">
        <span className="field-label">{label}{field.required ? ' *' : ''}</span>
        <span className="money-input"><span>+60</span><TextInput ariaLabel={label} value={value || ''} onChange={set} placeholder="12 345 6789" /></span>
      </div>
    );
  }
  if (field.type === 'postcode') {
    return (
      <div className="field">
        <span className="field-label">{label}{field.required ? ' *' : ''}</span>
        <TextInput ariaLabel={label} value={value || ''} onChange={(next) => onChange(field.key, next.replace(/\D/g, '').slice(0, 5))} />
        {String(value || '').length === 5 ? <span className="field-hint">{areaForPostcode(null, value)}</span> : null}
      </div>
    );
  }
  if (field.key === 'comments') {
    return <label className="field"><span className="field-label">{label}</span><textarea className="control" value={value || ''} onChange={(event) => set(event.target.value)} /></label>;
  }
  return <label className="field"><span className="field-label">{label}{field.required ? ' *' : ''}</span><TextInput ariaLabel={label} type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'} value={value || ''} onChange={set} /></label>;
}

export function PhonePreview({ form, lang, setLang }) {
  return (
    <div className="phone-frame" aria-label="Phone preview">
      <div className="phone-frame-body">
        <div className="screen-actions">
          <button type="button" className={`btn${lang === 'EN' ? ' on' : ''}`} onClick={() => setLang('EN')}>EN</button>
          <button type="button" className={`btn${lang === 'BM' ? ' on' : ''}`} onClick={() => setLang('BM')}>BM</button>
        </div>
        <h3>{lang === 'BM' ? form.design?.headlineBM || form.publicTitle : form.design?.headlineEN || form.publicTitle || form.name}</h3>
        <p>{lang === 'BM' ? form.design?.introBM : form.design?.introEN}</p>
        {(form.fields || []).map((field) => <FieldControl key={field.key} field={field} lang={lang} value="" onChange={() => {}} />)}
        <div className="consent-pin">
          <label className="check-inline"><input type="checkbox" readOnly /><span>{lang === 'BM' ? form.consentBlock?.requiredConsentBM : form.consentBlock?.requiredConsent}</span></label>
          <label className="check-inline"><input type="checkbox" readOnly /><span>{lang === 'BM' ? form.consentBlock?.marketingOptInBM : form.consentBlock?.marketingOptIn}</span></label>
        </div>
      </div>
    </div>
  );
}

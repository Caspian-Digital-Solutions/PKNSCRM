import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { can } from '../access.js';
import { PageHead } from '../components/bits.jsx';
import { useAmp } from '../useAmp.jsx';
import { num } from '../format.js';

function publicUrl(formId, touchpoint) {
  const base = `${window.location.origin}${window.location.pathname}#/f/${formId}`;
  return touchpoint && touchpoint !== 'Form' ? `${base}?tp=${encodeURIComponent(touchpoint)}` : base;
}

export default function FormBuilder({ id }) {
  const { forms, activations, data, state, dispatch } = useAmp();
  const source = forms.find((form) => form.id === id);
  const [draft, setDraft] = useState(source);
  const [selected, setSelected] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [lang, setLang] = useState('EN');
  const [touch, setTouch] = useState('');
  if (!source || !draft) return <p>Form not found.</p>;
  const activation = activations.find((item) => item.id === draft.activationId) || data.activations.find((item) => item.id === draft.activationId);
  const fields = data.fields.concat(state.fieldsAdded || []).map((field) => ({ ...field, ...(state.fieldPatches?.[field.id] || {}) }));
  const library = fields.filter((field) => field.labelEN.toLowerCase().includes(libraryQuery.toLowerCase()));
  const addField = (field) => {
    if (draft.fields.some((item) => item.key === field.key)) return;
    setDraft({ ...draft, fields: [...draft.fields, { ...field, required: false }] });
  };
  const save = () => {
    dispatch({ type: 'patchForm', id, patch: draft });
    window.dispatchEvent(new CustomEvent('pkns-toast', { detail: { title: 'Form saved' } }));
  };
  const download = (canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${canvasId}.png`;
    link.click();
  };
  const previewFields = draft.fields;
  const consent = draft.consentBlock;
  const editableConsent = can(state.role, 'consent.edit');
  const qrs = activation?.qrCodes?.length ? activation.qrCodes : [{ id: `QR-${id}`, touchpoint: 'Form', scans: 0 }];
  const embed = `<iframe src="${publicUrl(id)}" title="${draft.name}" style="width:100%;max-width:420px;height:720px;border:0"></iframe>`;
  const selectedField = draft.fields.find((field) => field.key === selected);
  return (
    <section>
      <PageHead title={draft.name} lede={activation ? `Linked activation: ${activation.name}` : 'Not linked to an activation.'} actions={<button type="button" className="btn btn-primary" onClick={save}>Save form</button>} />
      <div className="builder">
        <div className="builder-col">
          <h2>Field library</h2>
          <input className="search-input" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search fields" aria-label="Search fields" />
          {library.map((field) => (
            <button key={field.id} type="button" className="btn" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', field.key)} onClick={() => addField(field)} style={{ display: 'block', marginTop: 8 }}>
              {field.labelEN}
            </button>
          ))}
        </div>
        <div
          className="builder-col"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const key = event.dataTransfer.getData('text/plain');
            const field = fields.find((item) => item.key === key);
            if (field) addField(field);
          }}
        >
          <h2>Form</h2>
          {previewFields.map((field, index) => (
            <div key={field.key} className="field-row">
              <button type="button" onClick={() => setSelected(field.key)}>{lang === 'BM' ? field.labelBM : field.labelEN}</button>
              <span>
                <button type="button" className="btn" onClick={() => setDraft({ ...draft, fields: previewFields.filter((item) => item.key !== field.key) })}>Remove</button>
                {index > 0 && <button type="button" className="btn" onClick={() => {
                  const next = previewFields.slice();
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  setDraft({ ...draft, fields: next });
                }}>Up</button>}
              </span>
            </div>
          ))}
          <div className="consent-pin">
            <strong>Consent block</strong>
            <p>{lang === 'BM' ? consent.purposeTextBM : consent.purposeTextEN}</p>
            <p>{lang === 'BM' ? consent.requiredConsentBM : consent.requiredConsent}</p>
            <p>{lang === 'BM' ? consent.marketingOptInBM : consent.marketingOptIn}</p>
            <p className="fine">This block is required and cannot be removed.</p>
          </div>
        </div>
        <div className="builder-col">
          <h2>Field settings</h2>
          {selectedField ? (
            <>
              <label>Label EN<input value={selectedField.labelEN} onChange={(event) => setDraft({ ...draft, fields: draft.fields.map((field) => field.key === selectedField.key ? { ...field, labelEN: event.target.value } : field) })} /></label>
              <label>Label BM<input value={selectedField.labelBM} onChange={(event) => setDraft({ ...draft, fields: draft.fields.map((field) => field.key === selectedField.key ? { ...field, labelBM: event.target.value } : field) })} /></label>
              <label><input type="checkbox" checked={selectedField.required} onChange={(event) => setDraft({ ...draft, fields: draft.fields.map((field) => field.key === selectedField.key ? { ...field, required: event.target.checked } : field) })} /> Required</label>
            </>
          ) : <p>Select a field.</p>}
          <h2>Consent text</h2>
          <label>Purpose EN<textarea rows={3} disabled={!editableConsent} value={consent.purposeTextEN} onChange={(event) => setDraft({ ...draft, consentBlock: { ...consent, purposeTextEN: event.target.value } })} /></label>
          <label>Purpose BM<textarea rows={3} disabled={!editableConsent} value={consent.purposeTextBM} onChange={(event) => setDraft({ ...draft, consentBlock: { ...consent, purposeTextBM: event.target.value } })} /></label>
          {!editableConsent && <p className="fine">Only an AMP Manager or System Admin can edit the consent text.</p>}
        </div>
      </div>
      <h2>Mobile preview</h2>
      <div className="screen-actions">
        <button type="button" className={`btn${lang === 'EN' ? ' on' : ''}`} onClick={() => setLang('EN')}>EN</button>
        <button type="button" className={`btn${lang === 'BM' ? ' on' : ''}`} onClick={() => setLang('BM')}>BM</button>
      </div>
      <div className="phone">
        {previewFields.map((field) => <p key={field.key}>{lang === 'BM' ? field.labelBM : field.labelEN}{field.required ? ' *' : ''}</p>)}
        <div className="consent-pin">
          <p>{lang === 'BM' ? consent.purposeTextBM : consent.purposeTextEN}</p>
          <p>{lang === 'BM' ? consent.requiredConsentBM : consent.requiredConsent}</p>
          <p>{lang === 'BM' ? consent.marketingOptInBM : consent.marketingOptIn}</p>
        </div>
      </div>
      <h2>QR codes</h2>
      <div className="card-grid">
        {qrs.map((code) => (
          <div key={code.id} className="info-card">
            <strong>{code.touchpoint}</strong>
            <p>Scans: {num(code.scans)}</p>
            <QRCodeCanvas id={code.id} value={publicUrl(id, code.touchpoint)} size={160} />
            <p><button type="button" className="btn" onClick={() => download(code.id)}>Download PNG</button></p>
            <p className="fine">{publicUrl(id, code.touchpoint)}</p>
          </div>
        ))}
      </div>
      {can(state.role, 'form.edit') && (
        <form className="stack-form" onSubmit={(event) => {
          event.preventDefault();
          if (!touch.trim() || !activation) return;
          const qrCodes = [...(activation.qrCodes || []), { id: `QR-${activation.id}-${touch.trim()}`, touchpoint: touch.trim(), scans: 0 }];
          dispatch({ type: 'patchActivation', id: activation.id, patch: { qrCodes } });
          setTouch('');
        }}>
          <label>Extra touchpoint<input value={touch} onChange={(event) => setTouch(event.target.value)} placeholder="Booth A" /></label>
          <button className="btn" type="submit">Add QR</button>
        </form>
      )}
      <h2>Embed on website</h2>
      <pre className="info-card">{embed}</pre>
    </section>
  );
}

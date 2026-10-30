import { useMemo, useState } from 'react';
import { can } from '../access.js';
import { PageHead, linkTo } from '../components/bits.jsx';
import { CheckInline, Field, SelectInput, TextInput, Toggle } from '../components/controls.jsx';
import { PhonePreview } from '../components/FormFields.jsx';
import { QrPreview } from '../components/QrArt.jsx';
import { AS_OF_ISO, CONSENT, FIELD_LIBRARY } from '../data/config.js';
import { FORM_TEMPLATES, PURPOSES } from '../data/formTemplates.js';
import { useAmp } from '../useAmp.jsx';
import { go } from '../router.js';

const STEPS = ['Start', 'Purpose and link', 'Build', 'Design', 'Settings', 'Publish'];
const GROUPS = [
  ['Contact', ['fullName', 'mobile', 'email', 'postcode']],
  ['Demographics', ['ageBand', 'gender']],
  ['Household', ['householdSize', 'childrenCount', 'childrenAgeBands']],
  ['Interests and intent', ['interests', 'heard', 'interestedRent', 'interestedBuy']],
  ['Event', ['party', 'visitPurpose']],
  ['Feedback', ['rating', 'comments']],
];

function consentFromConfig() {
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

function blankForm() {
  return {
    name: '',
    publicTitle: '',
    purpose: 'Activation registration',
    mode: 'Activation',
    activationId: '',
    assetIds: [],
    status: 'Draft',
    opensAt: '',
    closesAt: '',
    capacity: '',
    closedMessageEN: 'Registration for this activation is closed.',
    closedMessageBM: 'Pendaftaran untuk pengaktifan ini telah ditutup.',
    design: { themeColour: '#E31E24', showPKNSLogo: true, headlineEN: '', headlineBM: '', introEN: '', introBM: '' },
    settings: {
      preventDuplicateByMobile: true,
      requireOtp: false,
      thankYouEN: 'Thank you. Your response has been recorded.',
      thankYouBM: 'Terima kasih. Maklum balas anda telah direkodkan.',
      redirectUrl: '',
      showAddToCalendar: true,
      issueEntryPass: false,
    },
    fields: [],
    consentBlock: consentFromConfig(),
    language: 'BM+EN',
    active: false,
    submissionsCount: 0,
    viewsCount: 0,
    completionRate: null,
  };
}

function libraryField(key, required = false) {
  const src = FIELD_LIBRARY.find((item) => item.key === key);
  if (!src) return null;
  return { ...src, options: src.options ? src.options.slice() : undefined, required };
}

function fromTemplate(template, activations) {
  const draft = blankForm();
  draft.name = template.name;
  draft.publicTitle = template.name;
  draft.purpose = template.purpose;
  draft.mode = template.mode || 'Activation';
  draft.design.headlineEN = template.name;
  draft.design.headlineBM = template.name;
  draft.design.introEN = template.description;
  draft.fields = template.fields.map((key) => libraryField(key, key === 'fullName' || key === 'mobile')).filter(Boolean);
  if (draft.mode === 'Activation' && activations[0]) draft.activationId = activations[0].id;
  return draft;
}

export default function FormBuilder({ id }) {
  const { forms, allActivations, assets, qrCodes, data, state, dispatch, route } = useAmp();
  const existing = id && id !== 'new' ? forms.find((form) => form.id === id) : null;
  const [step, setStep] = useState(existing ? 2 : 0);
  const [draft, setDraft] = useState(() => {
    if (existing) {
      const copy = JSON.parse(JSON.stringify(existing));
      copy.publicTitle = copy.publicTitle || String(copy.name || '').split(' registration')[0];
      copy.purpose = copy.purpose || 'Activation registration';
      copy.mode = copy.mode || (copy.activationId ? 'Activation' : 'Always-on');
      copy.design = copy.design || { themeColour: '#E31E24', showPKNSLogo: true, headlineEN: copy.publicTitle, headlineBM: copy.publicTitle, introEN: '', introBM: '' };
      copy.settings = copy.settings || { preventDuplicateByMobile: true, requireOtp: false, thankYouEN: copy.thankYouMessage || '', thankYouBM: copy.thankYouMessageBM || '', redirectUrl: '', showAddToCalendar: true, issueEntryPass: false };
      copy.assetIds = copy.assetIds || [];
      return copy;
    }
    const template = FORM_TEMPLATES.find((item) => item.id === route.search.tpl);
    return template ? fromTemplate(template, allActivations) : blankForm();
  });
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState('EN');
  const [published, setPublished] = useState(Boolean(existing));
  const activation = allActivations.find((item) => item.id === draft.activationId) || data.activations.find((item) => item.id === draft.activationId);
  const editableConsent = can(state.role, 'consent.edit');
  const fields = useMemo(() => FIELD_LIBRARY.filter((field) => field.labelEN.toLowerCase().includes(query.toLowerCase())), [query]);
  const publicUrl = `${window.location.origin}${window.location.pathname}#/f/${existing?.id || 'preview'}`;
  const setField = (key, patch) => setDraft({ ...draft, fields: draft.fields.map((field) => (field.key === key ? { ...field, ...patch } : field)) });
  const addField = (key) => {
    if (draft.fields.some((field) => field.key === key)) return;
    const field = libraryField(key);
    if (field) setDraft({ ...draft, fields: [...draft.fields, field] });
  };
  const selectedField = draft.fields.find((field) => field.key === selected);
  const publish = () => {
    const formId = existing?.id || `FORM-L${state.seq}`;
    const form = {
      ...draft,
      id: formId,
      activationId: draft.mode === 'Always-on' ? null : draft.activationId || null,
      assetIds: draft.assetIds?.length ? draft.assetIds : (activation ? [activation.assetId] : []),
      publicTitle: draft.publicTitle || draft.name,
      status: 'Published',
      active: true,
      thankYouMessage: draft.settings.thankYouEN,
      thankYouMessageBM: draft.settings.thankYouBM,
      updatedAt: AS_OF_ISO,
      createdAt: existing?.createdAt || AS_OF_ISO,
    };
    if (existing) dispatch({ type: 'patchForm', id: formId, patch: form });
    else dispatch({ type: 'addForm', form });
    const hasQr = qrCodes.some((qr) => qr.formId === formId);
    if (!hasQr) {
      dispatch({
        type: 'addQr',
        qr: {
          id: `QR-L${state.seq}`,
          name: `${form.publicTitle} · Form`,
          formId,
          targetType: 'Form',
          targetUrl: `#/f/${formId}`,
          shortLink: `pkns.my/a/${formId.toLowerCase()}`,
          touchpoint: 'Form',
          sourceTag: 'form',
          assetId: form.assetIds[0] || null,
          activationId: form.activationId,
          status: 'Active',
          style: { foreground: '#111827', background: '#FFFFFF', logo: 'PKNS', frame: 'Scan to register', frameText: '', cornerStyle: 'Rounded' },
          scans: 0,
          uniqueScans: 0,
          submissions: 0,
          byDay: [],
          byHour: [],
          devices: { iOS: 0, Android: 0, Other: 0 },
          funnel: { scans: 0, opened: 0, started: 0, submitted: 0 },
          createdBy: 'Farah Idris',
          createdAt: AS_OF_ISO,
        },
      });
    }
    setPublished(true);
    window.dispatchEvent(new CustomEvent('pkns-toast', { detail: { title: 'Form published' } }));
    if (!existing) go('form', formId);
  };

  return (
    <section>
      <PageHead title={draft.publicTitle || draft.name || 'New form'} lede="Registration form" back={{ href: linkTo('forms', route.search), label: 'Forms & QR' }} />
      <ol className="stepper">
        {STEPS.map((label, index) => <li key={label}><span className={index === step ? 'on' : index < step ? 'done' : ''}>{index + 1}</span>{label}</li>)}
      </ol>
      {step === 0 && (
        <>
        <div className="card-grid forms">
          <button type="button" className="option-card" onClick={() => { setDraft(blankForm()); setStep(1); }}>
            <strong>Blank form</strong>
            <p>Start without a template</p>
            <p className="fine">0 fields</p>
          </button>
          {FORM_TEMPLATES.map((template) => (
            <button key={template.id} type="button" className="option-card" onClick={() => { setDraft(fromTemplate(template, allActivations)); setStep(1); }}>
              <strong>{template.name}</strong>
              <p>{template.description || template.purpose}</p>
              <p className="fine">{template.fields.length} fields</p>
            </button>
          ))}
        </div>
        <label className="field">Duplicate an existing form
            <select className="control" value="" onChange={(event) => {
              const source = forms.find((form) => form.id === event.target.value);
              if (!source) return;
              const copy = JSON.parse(JSON.stringify(source));
              copy.name = `${source.name} copy`;
              copy.status = 'Draft';
              setDraft(copy);
              setStep(1);
            }}>
              <option value="">Choose a form</option>
              {forms.map((form) => <option key={form.id} value={form.id}>{form.publicTitle || form.name}</option>)}
            </select>
          </label>
        </>
      )}
      {step === 1 && (
        <div className="wizard-narrow">
          <Field label="Purpose">
            <SelectInput ariaLabel="Purpose" value={draft.purpose} onChange={(purpose) => setDraft({ ...draft, purpose })} options={PURPOSES.map((item) => ({ id: item, label: item }))} />
          </Field>
          <div className="field">
            <span className="field-label">Mode</span>
            <div className="radio-cards is-pair">
              {[{ id: 'Activation', hint: 'Tied to one activation and its dates.' }, { id: 'Always-on', hint: 'Stays open for an asset, with no end date.' }].map((mode) => (
                <label key={mode.id} className={`radio-card${draft.mode === mode.id ? ' on' : ''}`}>
                  <input type="radio" name="mode" checked={draft.mode === mode.id} onChange={() => setDraft({ ...draft, mode: mode.id })} />
                  <span className="radio-copy"><strong>{mode.id}</strong><span>{mode.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
          {draft.mode === 'Activation' ? (
            <Field label="Linked activation">
              <SelectInput ariaLabel="Linked activation" value={draft.activationId || ''} placeholder="Search activations" onChange={(activationId) => {
                const act = allActivations.find((item) => item.id === activationId);
                setDraft({ ...draft, activationId, assetIds: act ? [act.assetId] : draft.assetIds, publicTitle: draft.publicTitle || String(act?.name || '').split(' – ')[0] });
              }} options={allActivations.map((act) => ({ id: act.id, label: act.name }))} />
            </Field>
          ) : (
            <Field label="Asset">
              <SelectInput ariaLabel="Asset" value={draft.assetIds?.[0] || ''} placeholder="Asset" onChange={(assetId) => setDraft({ ...draft, assetIds: assetId ? [assetId] : [] })} options={assets.map((asset) => ({ id: asset.id, label: asset.name }))} />
            </Field>
          )}
          <Field label="Internal name"><TextInput ariaLabel="Internal name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /></Field>
          <Field label="Public title (EN)"><TextInput ariaLabel="Public title (EN)" value={draft.publicTitle} onChange={(publicTitle) => setDraft({ ...draft, publicTitle, design: { ...draft.design, headlineEN: publicTitle } })} /></Field>
          <Field label="Public title (BM)"><TextInput ariaLabel="Public title (BM)" value={draft.design?.headlineBM || ''} onChange={(headlineBM) => setDraft({ ...draft, design: { ...draft.design, headlineBM } })} /></Field>
        </div>
      )}
      {step === 2 && (
        <div className="builder">
          <div className="builder-col">
            <h2>Field library</h2>
            <TextInput ariaLabel="Search fields" placeholder="Search fields" value={query} onChange={setQuery} />
            {GROUPS.map(([group, keys]) => (
              <div key={group}>
                <h3>{group}</h3>
                {fields.filter((field) => keys.includes(field.key)).map((field) => (
                  <button key={field.key} type="button" className="btn" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', field.key)} onClick={() => addField(field.key)}>{field.labelEN}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="builder-col" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addField(event.dataTransfer.getData('text/plain')); }}>
            <h2>Form</h2>
            {draft.fields.map((field, index) => (
              <div key={field.key} className="field-row">
                <button type="button" onClick={() => setSelected(field.key)}>{field.labelEN}{field.required ? ' *' : ''}</button>
                <span>
                  <button type="button" className="btn" onClick={() => setDraft({ ...draft, fields: draft.fields.filter((item) => item.key !== field.key) })}>Delete</button>
                  {index > 0 && <button type="button" className="btn" onClick={() => {
                    const next = draft.fields.slice();
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    setDraft({ ...draft, fields: next });
                  }}>Move up</button>}
                </span>
              </div>
            ))}
            <div className="consent-pin">
              <strong>Consent block</strong>
              <p>{draft.consentBlock.purposeTextEN}</p>
              <p className="fine">This block is required and cannot be removed.</p>
            </div>
          </div>
          <div className="builder-col">
            <h2>Field settings</h2>
            {selectedField ? (
              <>
                <TextInput ariaLabel="Label EN" value={selectedField.labelEN} onChange={(labelEN) => setField(selectedField.key, { labelEN })} />
                <TextInput ariaLabel="Label BM" value={selectedField.labelBM} onChange={(labelBM) => setField(selectedField.key, { labelBM })} />
                <CheckInline checked={selectedField.required} onChange={(required) => setField(selectedField.key, { required })}>Required</CheckInline>
                <SelectInput ariaLabel="Show this field if" value={selectedField.showIf?.key || ''} placeholder="Always show" onChange={(key) => setField(selectedField.key, { showIf: key ? { key, value: selectedField.showIf?.value || 'Yes' } : null })} options={draft.fields.filter((field) => field.key !== selectedField.key).map((field) => ({ id: field.key, label: field.labelEN }))} />
                {selectedField.showIf?.key ? <TextInput ariaLabel="Equals" value={selectedField.showIf.value || ''} onChange={(value) => setField(selectedField.key, { showIf: { ...selectedField.showIf, value } })} /> : null}
              </>
            ) : <p>Select a field.</p>}
            <h2>Consent text</h2>
            <label className="field">Purpose EN<textarea className="control" rows={3} disabled={!editableConsent} value={draft.consentBlock.purposeTextEN} onChange={(event) => setDraft({ ...draft, consentBlock: { ...draft.consentBlock, purposeTextEN: event.target.value } })} /></label>
            <label className="field">Purpose BM<textarea className="control" rows={3} disabled={!editableConsent} value={draft.consentBlock.purposeTextBM} onChange={(event) => setDraft({ ...draft, consentBlock: { ...draft.consentBlock, purposeTextBM: event.target.value } })} /></label>
            {!editableConsent && <p className="fine">Only an AMP Manager or System Admin can edit the consent text.</p>}
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="stack-form">
          <label className="field">Theme colour<input className="control" type="color" value={draft.design.themeColour || '#E31E24'} onChange={(event) => setDraft({ ...draft, design: { ...draft.design, themeColour: event.target.value } })} /></label>
          <CheckInline checked={draft.design.showPKNSLogo} onChange={(showPKNSLogo) => setDraft({ ...draft, design: { ...draft.design, showPKNSLogo } })}>Show PKNS logo</CheckInline>
          <TextInput ariaLabel="Headline EN" value={draft.design.headlineEN || ''} onChange={(headlineEN) => setDraft({ ...draft, design: { ...draft.design, headlineEN } })} />
          <TextInput ariaLabel="Headline BM" value={draft.design.headlineBM || ''} onChange={(headlineBM) => setDraft({ ...draft, design: { ...draft.design, headlineBM } })} />
          <label className="field">Intro EN<textarea className="control" rows={3} value={draft.design.introEN || ''} onChange={(event) => setDraft({ ...draft, design: { ...draft.design, introEN: event.target.value } })} /></label>
          <label className="field">Intro BM<textarea className="control" rows={3} value={draft.design.introBM || ''} onChange={(event) => setDraft({ ...draft, design: { ...draft.design, introBM: event.target.value } })} /></label>
          {activation && <p className="info-card">{activation.name} · {activation.startDate} · {activation.specificLocation}</p>}
        </div>
      )}
      {step === 4 && (
        <div className="stack-form">
          <label className="field">Opens<input className="control" type="datetime-local" value={(draft.opensAt || '').slice(0, 16)} onChange={(event) => setDraft({ ...draft, opensAt: event.target.value })} /></label>
          <label className="field">Closes<input className="control" type="datetime-local" value={(draft.closesAt || '').slice(0, 16)} onChange={(event) => setDraft({ ...draft, closesAt: event.target.value })} /></label>
          <TextInput ariaLabel="Capacity" type="number" value={draft.capacity || ''} onChange={(capacity) => setDraft({ ...draft, capacity })} />
          <Toggle checked={draft.settings.preventDuplicateByMobile} onChange={(preventDuplicateByMobile) => setDraft({ ...draft, settings: { ...draft.settings, preventDuplicateByMobile } })} label="Prevent duplicate entries by mobile number" />
          <p className="fine">One-time code check is Phase 2.</p>
          <TextInput ariaLabel="Thank you EN" value={draft.settings.thankYouEN} onChange={(thankYouEN) => setDraft({ ...draft, settings: { ...draft.settings, thankYouEN } })} />
          <TextInput ariaLabel="Thank you BM" value={draft.settings.thankYouBM} onChange={(thankYouBM) => setDraft({ ...draft, settings: { ...draft.settings, thankYouBM } })} />
          <TextInput ariaLabel="Redirect URL" value={draft.settings.redirectUrl || ''} onChange={(redirectUrl) => setDraft({ ...draft, settings: { ...draft.settings, redirectUrl } })} />
          <CheckInline checked={draft.settings.showAddToCalendar} onChange={(showAddToCalendar) => setDraft({ ...draft, settings: { ...draft.settings, showAddToCalendar } })}>Add to calendar on the success page</CheckInline>
          <CheckInline checked={draft.settings.issueEntryPass} onChange={(issueEntryPass) => setDraft({ ...draft, settings: { ...draft.settings, issueEntryPass } })}>Issue an entry pass</CheckInline>
        </div>
      )}
      {step === 5 && (
        <div className="stack-form">
          <p>{draft.name} · {draft.purpose} · {draft.mode}</p>
          <p>Public link</p>
          <p className="fine">{publicUrl}</p>
          <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(publicUrl)}>Copy link</button>
          <QrPreview value={publicUrl} canvasId={`publish-${id || 'new'}`} />
          <button type="button" className="btn" onClick={() => go('forms', { tab: 'qr' })}>Create more QR codes for touchpoints</button>
          <pre className="info-card">{`<iframe src="${publicUrl}" title="${draft.publicTitle || draft.name}" style="width:100%;max-width:420px;height:720px;border:0"></iframe>`}</pre>
          <button type="button" className="btn btn-primary" onClick={publish}>{published && existing ? 'Save and publish' : 'Publish form'}</button>
        </div>
      )}
      {step >= 2 && step <= 4 && <PhonePreview form={draft} lang={lang} setLang={setLang} />}
      <div className="screen-actions">
        {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 5 && <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>Continue</button>}
      </div>
    </section>
  );
}

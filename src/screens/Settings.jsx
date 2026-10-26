import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import Field from '../components/Field.jsx';
import { liveAssets } from '../data/selectors.js';
import { ASSETS, OFFICERS, SITC_TEMPLATE, WITHDRAWN_STAGE, ZONE_RULES, ZONES } from '../data/config.js';

const EXTRA_TYPES = ['Event space', 'Land', 'Residential', 'Township'];
const STATUSES = ['', 'Available', 'Occupied', 'Reserved', 'Vacant', 'Under redevelopment'];

function emptySpace() {
  return { name: '', size: '', rate: '', basis: 'per month', status: '' };
}

function blankForm() {
  return {
    name: '',
    type: ASSETS[0]?.type || 'Event space',
    location: '',
    entity: '',
    grouping: '',
    officer: 'aina',
    spaces: [],
  };
}

function slug(name, assets) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'asset';
  let id = base;
  let n = 2;
  while (assets.some((asset) => asset.id === id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export default function Settings() {
  const { state, dispatch, data } = useStore();
  const ui = useUi();
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const types = useMemo(() => {
    const list = [];
    const push = (name) => { if (name && !list.includes(name)) list.push(name); };
    ASSETS.forEach((asset) => push(asset.type));
    EXTRA_TYPES.forEach(push);
    state.customTypes.forEach(push);
    return list;
  }, [state.customTypes]);
  const [typeName, setTypeName] = useState('');
  const [form, setForm] = useState(blankForm);
  const [fromSitc, setFromSitc] = useState(false);
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('portfolio');

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const addType = (event) => {
    event.preventDefault();
    const name = typeName.trim();
    if (!name || types.includes(name)) return;
    dispatch({ type: 'addType', name });
    setTypeName('');
  };

  const fillSitc = () => {
    setFromSitc(true);
    setNotice(null);
    setForm({
      name: SITC_TEMPLATE.name,
      type: SITC_TEMPLATE.type,
      location: SITC_TEMPLATE.location,
      entity: SITC_TEMPLATE.entity,
      grouping: SITC_TEMPLATE.grouping || '',
      officer: SITC_TEMPLATE.officer,
      spaces: SITC_TEMPLATE.spaces.map((space) => ({
        name: space.name,
        size: space.size,
        rate: String(space.rate),
        basis: space.basis,
        status: 'Available',
      })),
    });
  };

  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const updateSpace = (index, patch) => {
    setForm((current) => ({
      ...current,
      spaces: current.spaces.map((space, i) => (i === index ? { ...space, ...patch } : space)),
    }));
  };

  const save = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setNotice({ kind: 'invalid' });
      return;
    }
    const id = fromSitc ? SITC_TEMPLATE.id : slug(name, assets);
    if (assets.some((asset) => asset.id === id)) {
      setNotice({ kind: 'exists', name });
      return;
    }
    const spaces = form.spaces
      .filter((space) => space.name.trim())
      .map((space) => {
        const rate = space.rate === '' ? null : Number(String(space.rate).replace(/,/g, ''));
        return {
          name: space.name.trim(),
          size: space.size.trim(),
          rate: Number.isFinite(rate) ? rate : null,
          basis: space.basis,
          ...(space.status.trim() ? { status: space.status.trim() } : {}),
        };
      });
    const asset = {
      id,
      name,
      short: fromSitc ? SITC_TEMPLATE.short : name,
      type: form.type,
      location: form.location.trim(),
      area: fromSitc ? SITC_TEMPLATE.area : form.location.trim(),
      entity: form.entity.trim(),
      grouping: form.grouping.trim() || null,
      officer: form.officer,
    };
    if (form.type === 'Event space' || spaces.length) asset.spaces = spaces;
    dispatch({ type: 'addAsset', asset });
    setNotice({ kind: 'saved', name });
    if (fromSitc || /SITC|Selangor International/.test(name)) {
      ui.notify({ title: 'SITC added to the portfolio', href: 'portfolio', action: 'View on portfolio' });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Asset',
      format: (value, row) => (row ? (
        <a href={`#/asset/${row.id}`} onClick={(event) => { event.preventDefault(); go('asset', row.id); }}>{value}</a>
      ) : value),
    },
    { key: 'type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'entity', label: 'Managing entity' },
    { key: 'grouping', label: 'Campaign grouping', format: (value) => value || '–' },
    { key: 'officer', label: 'Officer', format: (value) => data.officers[value]?.name || '–' },
  ];

  return (
    <section>
      <h1 className="page-title">Settings</h1>
      <p className="lead">Malls and offices today. Event spaces, land, residential and township assets are added here.</p>
      <div className="view-toggle" role="tablist" aria-label="Settings sections">
        <button type="button" role="tab" aria-selected={tab === 'portfolio'} className={tab === 'portfolio' ? 'on' : ''} onClick={() => setTab('portfolio')}>Portfolio</button>
        <button type="button" role="tab" aria-selected={tab === 'zones'} className={tab === 'zones' ? 'on' : ''} data-testid="audience-zones-tab" onClick={() => setTab('zones')}>Audience zones</button>
      </div>
      {tab === 'zones' ? <AudienceZoneSettings state={state} dispatch={dispatch} /> : (
      <>
      <h2 className="section-title">Asset types</h2>
      <ul className="type-list">
        {types.map((type) => <li key={type}>{type}</li>)}
      </ul>
      <form className="stack-form" onSubmit={addType}>
        <label className="grow">
          Add type
          <input value={typeName} onChange={(event) => setTypeName(event.target.value)} />
        </label>
        <button type="submit" className="btn">Add type</button>
      </form>

      <div className="section-row">
        <h2 className="section-title">Add asset</h2>
        <button type="button" className="btn" data-testid="fill-sitc" onClick={fillSitc}>Fill SITC sample</button>
      </div>
      <form noValidate onSubmit={save}>
        <div className="settings-form">
          <label>
            Name
            <input className="name-field" value={form.name} onChange={(event) => set({ name: event.target.value })} />
            {!form.name.trim() && notice?.kind === 'invalid' ? <span className="field-error">Enter the asset name</span> : null}
          </label>
          <Field label="Type">
            <select value={form.type} onChange={(event) => set({ type: event.target.value })}>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <label>
            Location
            <input value={form.location} onChange={(event) => set({ location: event.target.value })} />
          </label>
          <label>
            Managing entity
            <input value={form.entity} onChange={(event) => set({ entity: event.target.value })} />
          </label>
          <label>
            Campaign grouping
            <input value={form.grouping} onChange={(event) => set({ grouping: event.target.value })} />
          </label>
          <Field label="Officer">
            <select value={form.officer} onChange={(event) => set({ officer: event.target.value })}>
              {Object.values(OFFICERS).map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
            </select>
          </Field>
          <label>
            Image
            <span className="btn file-btn">Upload image<input type="file" accept="image/*" onChange={onFile} /></span>
          </label>
        </div>
        {preview ? <img className="image-preview" src={preview} alt="Preview of the selected asset image" /> : null}

        <h3 className="section-title">Spaces or units</h3>
        {form.spaces.map((space, index) => (
          <div key={index} className="space-row" data-testid="space-row">
            <label>
              Name
              <input value={space.name} onChange={(event) => updateSpace(index, { name: event.target.value })} />
            </label>
            <label>
              Size
              <input value={space.size} onChange={(event) => updateSpace(index, { size: event.target.value })} />
            </label>
            <label>
              Rate (RM)
              <input value={space.rate} inputMode="decimal" onChange={(event) => updateSpace(index, { rate: event.target.value })} />
            </label>
            <Field label="Basis">
              <select value={space.basis} onChange={(event) => updateSpace(index, { basis: event.target.value })}>
                <option value="per month">per month</option>
                <option value="per day">per day</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={space.status} onChange={(event) => updateSpace(index, { status: event.target.value })}>
                {STATUSES.map((status) => <option key={status || 'blank'} value={status}>{status || '–'}</option>)}
              </select>
            </Field>
            <button type="button" className="btn" onClick={() => set({ spaces: form.spaces.filter((_, i) => i !== index) })}>Remove</button>
          </div>
        ))}
        <div className="stage-actions">
          <button type="button" className="btn" onClick={() => set({ spaces: [...form.spaces, emptySpace()] })}>Add space</button>
          <button type="submit" className="btn btn-primary" data-testid="save-asset">Save asset</button>
        </div>
      </form>
      {notice?.kind === 'saved' ? (
        <p className="confirm" data-testid="asset-saved" role="status">
          {notice.name} is on the portfolio.{' '}
          <a href="#/portfolio" onClick={(event) => { event.preventDefault(); go('portfolio'); }}>View on the portfolio</a>
        </p>
      ) : null}
      {notice?.kind === 'exists' ? (
        <p className="confirm" data-testid="asset-exists" role="status">{notice.name} is already on the portfolio.</p>
      ) : null}

      <h2 className="section-title">Existing assets</h2>
      <DataTable columns={columns} rows={assets} exportName="assets" />
      </>
      )}
    </section>
  );
}

function AudienceZoneSettings({ state, dispatch }) {
  return (
    <div className="zone-settings" data-testid="audience-zones-settings">
      <h2 className="section-title">Stage to zone</h2>
      <p className="cell-note">{ZONE_RULES.mappingNote}</p>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Stages</th>
            </tr>
          </thead>
          <tbody>
            {ZONES.map((zone) => (
              <tr key={zone.id}>
                <td>Zone {zone.n} · {zone.label}</td>
                <td>{zone.stages.join(', ')}</td>
              </tr>
            ))}
            <tr>
              <td>Withdrawn</td>
              <td>{WITHDRAWN_STAGE}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2 className="section-title">Requirements</h2>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Zone</th>
              <th>Requirement</th>
              <th>Due</th>
              <th>Done when</th>
            </tr>
          </thead>
          <tbody>
            {ZONE_RULES.requirements.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{ZONES.find((zone) => zone.id === item.zone)?.label}</td>
                <td>{item.title}</td>
                <td>{item.due}</td>
                <td>{String(item.doneWhen).replace(/lead-form/gi, 'enquiry-form')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="section-title">Qualifiers</h2>
      <p className="cell-note">Qualifiers guide the decision. They never block a move.</p>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Qualifier</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {ZONE_RULES.qualifiers.map((item) => (
              <tr key={item.id}>
                <td>{item.from === 'suspect' ? 'Suspect' : 'Prospect'}</td>
                <td>{item.to}</td>
                <td>{item.label}</td>
                <td>{item.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="section-title">Triggers</h2>
      <div className="table-scroll">
        <table className="table data-table">
          <thead>
            <tr>
              <th>On</th>
              <th>Id</th>
              <th>When</th>
              <th>Then</th>
            </tr>
          </thead>
          <tbody>
            {ZONE_RULES.triggers.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    type="checkbox"
                    data-testid={`trigger-${item.id}`}
                    aria-label={`${item.id} ${item.when}`}
                    checked={state.triggers?.[item.id] !== false}
                    onChange={(event) => dispatch({ type: 'setTrigger', id: item.id, on: event.target.checked })}
                  />
                </td>
                <td>{item.id}</td>
                <td>{item.when}</td>
                <td>{item.then}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="section-title">Assignment</h2>
      <p>{ZONE_RULES.assignment}</p>
    </div>
  );
}

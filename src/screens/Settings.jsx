import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import { liveAssets } from '../data/selectors.js';
import { ASSETS, OFFICERS, SITC_TEMPLATE } from '../data/config.js';

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
    if (!name) return;
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

      <h2 className="section-title">Add asset</h2>
      <form onSubmit={save}>
        <div className="settings-form">
          <label>
            Name
            <input value={form.name} onChange={(event) => set({ name: event.target.value })} required />
          </label>
          <label>
            Type
            <select value={form.type} onChange={(event) => set({ type: event.target.value })}>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
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
          <label>
            Officer
            <select value={form.officer} onChange={(event) => set({ officer: event.target.value })}>
              {Object.values(OFFICERS).map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
            </select>
          </label>
          <label>
            Image
            <input type="file" accept="image/*" onChange={onFile} />
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
            <label>
              Basis
              <select value={space.basis} onChange={(event) => updateSpace(index, { basis: event.target.value })}>
                <option value="per month">per month</option>
                <option value="per day">per day</option>
              </select>
            </label>
            <label>
              Status
              <select value={space.status} onChange={(event) => updateSpace(index, { status: event.target.value })}>
                {STATUSES.map((status) => <option key={status || 'blank'} value={status}>{status || '–'}</option>)}
              </select>
            </label>
            <button type="button" className="btn" onClick={() => set({ spaces: form.spaces.filter((_, i) => i !== index) })}>Remove</button>
          </div>
        ))}
        <div className="stage-actions">
          <button type="button" className="btn" onClick={() => set({ spaces: [...form.spaces, emptySpace()] })}>Add space</button>
          <button type="button" className="btn" data-testid="fill-sitc" onClick={fillSitc}>Fill SITC sample</button>
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
    </section>
  );
}

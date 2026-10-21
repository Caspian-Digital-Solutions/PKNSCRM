export const RANGE_PRESETS = [
  { id: '2026-10', label: 'October 2026', from: '2026-10-01', to: '2026-10-31' },
  { id: '2026-09', label: 'September 2026', from: '2026-09-01', to: '2026-09-30' },
  { id: '2026-08', label: 'August 2026', from: '2026-08-01', to: '2026-08-31' },
  { id: '2026-07', label: 'July 2026', from: '2026-07-01', to: '2026-07-31' },
  { id: '2026-07-10', label: 'Jul–Oct 2026', from: '2026-07-01', to: '2026-10-31' },
  { id: 'custom', label: 'Custom' },
];

const DATE_MIN = '2026-07-01';
const DATE_MAX = '2026-10-31';

function optionName(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return item.name || item.label || item.id;
}

function optionValue(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return item.id;
}

function Select({ label, value, onChange, options, testId, selectClass }) {
  return (
    <label className={selectClass}>
      {label}
      <select data-testid={testId} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((item) => (
          <option key={optionValue(item)} value={optionValue(item)}>{optionName(item)}</option>
        ))}
      </select>
    </label>
  );
}

function Chip({ children, onRemove }) {
  return (
    <button type="button" className="active-chip" onClick={onRemove}>
      {children}
      <span aria-hidden="true">Remove</span>
    </button>
  );
}

export default function Filters({
  value,
  onChange,
  assets = [],
  campaigns = [],
  channels = [],
  officers = [],
  sources = [],
  types = [],
  locations = [],
  stages = [],
  statuses = [],
  floors = [],
  fields = ['asset', 'campaign', 'channel', 'officer', 'source', 'range'],
  rangePresets = RANGE_PRESETS,
  clearable = true,
  query = '',
  onQuery,
  periodDefault = '2026-10',
  extraChips = [],
  onClear,
  children,
}) {
  const v = {
    asset: '',
    campaign: '',
    channel: '',
    officer: '',
    source: '',
    type: '',
    location: '',
    stage: '',
    status: '',
    floor: '',
    preset: '2026-10',
    from: '2026-10-01',
    to: '2026-10-31',
    ...value,
  };
  const set = (patch) => onChange?.({ ...v, ...patch });
  const show = (name) => fields.includes(name);
  const nameOf = (options, current) => optionName(options.find((item) => optionValue(item) === current) || current);

  const onPreset = (preset) => {
    const found = rangePresets.find((p) => p.id === preset);
    if (!found || found.id === 'custom') {
      set({ preset: 'custom' });
      return;
    }
    set({ preset, from: found.from, to: found.to });
  };

  const clearAll = () => {
    onQuery?.('');
    onChange?.({
      ...v,
      asset: '',
      campaign: '',
      channel: '',
      officer: '',
      source: '',
      type: '',
      location: '',
      stage: '',
      status: '',
      floor: '',
      preset: periodDefault,
      from: rangePresets.find((item) => item.id === periodDefault)?.from || v.from,
      to: rangePresets.find((item) => item.id === periodDefault)?.to || v.to,
    });
    onClear?.();
  };

  const chips = [];
  if (query.trim()) chips.push({ key: 'query', label: `Search: ${query.trim()}`, remove: () => onQuery?.('') });
  if (show('asset') && v.asset) chips.push({ key: 'asset', label: `Asset: ${nameOf(assets, v.asset)}`, remove: () => set({ asset: '' }) });
  if (show('type') && v.type) chips.push({ key: 'type', label: `Type: ${nameOf(types, v.type)}`, remove: () => set({ type: '' }) });
  if (show('location') && v.location) chips.push({ key: 'location', label: `Location: ${nameOf(locations, v.location)}`, remove: () => set({ location: '' }) });
  if (show('campaign') && v.campaign) chips.push({ key: 'campaign', label: `Campaign: ${nameOf(campaigns, v.campaign)}`, remove: () => set({ campaign: '' }) });
  if (show('channel') && v.channel) chips.push({ key: 'channel', label: `Channel: ${nameOf(channels, v.channel)}`, remove: () => set({ channel: '' }) });
  if (show('source') && v.source) chips.push({ key: 'source', label: `Source: ${nameOf(sources, v.source)}`, remove: () => set({ source: '' }) });
  if (show('officer') && v.officer) chips.push({ key: 'officer', label: `Officer: ${nameOf(officers, v.officer)}`, remove: () => set({ officer: '' }) });
  if (show('stage') && v.stage) chips.push({ key: 'stage', label: `Stage: ${nameOf(stages, v.stage)}`, remove: () => set({ stage: '' }) });
  if (show('status') && v.status) chips.push({ key: 'status', label: `Status: ${nameOf(statuses, v.status)}`, remove: () => set({ status: '' }) });
  if (show('floor') && v.floor) chips.push({ key: 'floor', label: `Floor: ${nameOf(floors, v.floor)}`, remove: () => set({ floor: '' }) });
  if (show('range') && v.preset && v.preset !== periodDefault) {
    chips.push({ key: 'period', label: `Period: ${nameOf(rangePresets, v.preset)}`, remove: () => onPreset(periodDefault) });
  }
  const shownChips = [...chips, ...extraChips];
  const active = shownChips.length > 0;

  return (
    <div className="filter-bar" data-testid="filter-bar">
      <div className="filters">
        {onQuery && (
          <label className="filter-search">
            Search
            <input
              type="search"
              value={query}
              placeholder="Search"
              onChange={(event) => onQuery(event.target.value)}
            />
          </label>
        )}
        {show('asset') && <Select label="Asset" value={v.asset} options={assets} onChange={(asset) => set({ asset })} />}
        {show('type') && <Select label="Type" value={v.type} options={types} onChange={(type) => set({ type })} />}
        {show('location') && <Select label="Location" value={v.location} options={locations} onChange={(location) => set({ location })} />}
        {show('campaign') && <Select label="Campaign" value={v.campaign} options={campaigns} onChange={(campaign) => set({ campaign })} />}
        {show('channel') && <Select label="Channel" value={v.channel} options={channels} onChange={(channel) => set({ channel })} />}
        {show('source') && <Select label="Source" value={v.source} options={sources} onChange={(source) => set({ source })} />}
        {show('officer') && <Select label="Officer" value={v.officer} options={officers} onChange={(officer) => set({ officer })} />}
        {show('stage') && <Select label="Stage" value={v.stage} options={stages} onChange={(stage) => set({ stage })} />}
        {show('status') && <Select label="Status" value={v.status} options={statuses} onChange={(status) => set({ status })} />}
        {show('floor') && <Select label="Floor" value={v.floor} options={floors} onChange={(floor) => set({ floor })} />}
        {show('range') && (
          <label>
            Period
            <select value={v.preset} onChange={(e) => onPreset(e.target.value)}>
              {rangePresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        )}
        {children}
        {clearable && active && (
          <button type="button" className="text-btn" onClick={clearAll}>Clear filters</button>
        )}
      </div>
      {active && (
        <div className="active-chips">
          {shownChips.map((chip) => <Chip key={chip.key} onRemove={chip.remove}>{chip.label}</Chip>)}
        </div>
      )}
      {show('range') && v.preset === 'custom' && (
        <div className="filters">
          <label>
            From
            <input type="date" min={DATE_MIN} max={DATE_MAX} value={v.from} onChange={(e) => set({ from: e.target.value, preset: 'custom' })} />
          </label>
          <label>
            To
            <input type="date" min={DATE_MIN} max={DATE_MAX} value={v.to} onChange={(e) => set({ to: e.target.value, preset: 'custom' })} />
          </label>
        </div>
      )}
    </div>
  );
}

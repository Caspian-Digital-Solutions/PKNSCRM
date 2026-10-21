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

function Select({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((item) => (
          <option key={optionValue(item)} value={optionValue(item)}>{optionName(item)}</option>
        ))}
      </select>
    </label>
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
  fields = ['asset', 'campaign', 'channel', 'officer', 'source', 'range'],
  rangePresets = RANGE_PRESETS,
  clearable = true,
}) {
  const v = {
    asset: '',
    campaign: '',
    channel: '',
    officer: '',
    source: '',
    preset: '2026-10',
    from: '2026-10-01',
    to: '2026-10-31',
    ...value,
  };
  const set = (patch) => onChange?.({ ...v, ...patch });
  const show = (name) => fields.includes(name);

  const onPreset = (preset) => {
    const found = rangePresets.find((p) => p.id === preset);
    if (!found || found.id === 'custom') {
      set({ preset: 'custom' });
      return;
    }
    set({ preset, from: found.from, to: found.to });
  };

  return (
    <div className="filters">
      {show('asset') && <Select label="Asset" value={v.asset} options={assets} onChange={(asset) => set({ asset })} />}
      {show('campaign') && <Select label="Campaign" value={v.campaign} options={campaigns} onChange={(campaign) => set({ campaign })} />}
      {show('channel') && <Select label="Channel" value={v.channel} options={channels} onChange={(channel) => set({ channel })} />}
      {show('officer') && <Select label="Officer" value={v.officer} options={officers} onChange={(officer) => set({ officer })} />}
      {show('source') && <Select label="Source" value={v.source} options={sources} onChange={(source) => set({ source })} />}
      {show('range') && (
        <label>
          Period
          <select value={v.preset} onChange={(e) => onPreset(e.target.value)}>
            {rangePresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
      )}
      {clearable && (v.asset || v.campaign || v.channel || v.officer || v.source) && (
        <button type="button" className="text-btn" onClick={() => onChange?.({
          ...v,
          asset: '',
          campaign: '',
          channel: '',
          officer: '',
          source: '',
        })}
        >Clear filters</button>
      )}
      {show('range') && v.preset === 'custom' && (
        <>
          <label>
            From
            <input type="date" min={DATE_MIN} max={DATE_MAX} value={v.from} onChange={(e) => set({ from: e.target.value, preset: 'custom' })} />
          </label>
          <label>
            To
            <input type="date" min={DATE_MIN} max={DATE_MAX} value={v.to} onChange={(e) => set({ to: e.target.value, preset: 'custom' })} />
          </label>
        </>
      )}
    </div>
  );
}

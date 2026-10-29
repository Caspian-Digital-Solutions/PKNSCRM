import { ACTIVATION_TYPES, FILTER_CHANNELS } from '../data/config.js';
import { PRESETS } from '../filters.js';
import { setSearch } from '../router.js';
import { useAmp } from '../useAmp.jsx';

function Multi({ label, options, selected, allIds, param }) {
  const current = selected.length ? selected : allIds;
  const summary = !selected.length || selected.length === allIds.length ? 'All' : current.map((id) => options.find((item) => item.id === id)?.name || id).slice(0, 1).join('') + (current.length > 1 ? ` +${current.length - 1}` : '');
  const toggle = (id) => {
    const has = current.includes(id);
    const next = has ? current.filter((item) => item !== id) : [...current, id];
    if (!next.length || next.length === allIds.length) setSearch({ [param]: '' });
    else setSearch({ [param]: next.join(',') });
  };
  return (
    <details className="multi">
      <summary>{label}: {summary}</summary>
      <div className="multi-panel">
        {options.map((option) => (
          <label key={option.id}>
            <input type="checkbox" checked={current.includes(option.id)} onChange={() => toggle(option.id)} />
            <span>{option.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export default function GlobalFilters() {
  const { scope, operators, state } = useAmp();
  const assetOptions = scope.assets.filter((asset) => scope.allowed.includes(asset.id)).map((asset) => ({ id: asset.id, name: asset.name }));
  const operatorOptions = operators.map((item) => ({ id: item.id, name: item.name }));
  const typeOptions = ACTIVATION_TYPES.map((item) => ({ id: item, name: item }));
  const channelOptions = FILTER_CHANNELS.map((item) => ({ id: item, name: item }));
  const preset = scope.preset || 'l12';
  return (
    <div className="global-filters">
      <label>
        <span className="filter-name">Date range</span>
        <select value={preset} onChange={(event) => {
          const next = PRESETS.find((item) => item.id === event.target.value);
          if (!next || next.id === 'custom') setSearch({ preset: 'custom' });
          else setSearch({ preset: next.id, from: next.from, to: next.to });
        }}
        >
          {PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {preset === 'custom' && (
        <>
          <label>
            <span className="filter-name">From</span>
            <input type="date" value={scope.from} onChange={(event) => setSearch({ preset: 'custom', from: event.target.value })} />
          </label>
          <label>
            <span className="filter-name">To</span>
            <input type="date" value={scope.to} onChange={(event) => setSearch({ preset: 'custom', to: event.target.value })} />
          </label>
        </>
      )}
      <Multi label="Asset" options={assetOptions} selected={scope.unrestricted ? [] : (scope.assetIds.length === assetOptions.length ? [] : scope.assetIds)} allIds={assetOptions.map((item) => item.id)} param="asset" />
      {state.role !== 'operator' && operatorOptions.length > 0 && (
        <Multi label="Operator" options={operatorOptions} selected={scope.operatorIds} allIds={operatorOptions.map((item) => item.id)} param="operator" />
      )}
      <Multi label="Activation type" options={typeOptions} selected={scope.types} allIds={typeOptions.map((item) => item.id)} param="type" />
      <Multi label="Channel" options={channelOptions} selected={scope.channels} allIds={channelOptions.map((item) => item.id)} param="channel" />
      <label className="check-inline">
        <input
          type="checkbox"
          checked={scope.includeUpcoming !== false}
          onChange={(event) => setSearch({ upcoming: event.target.checked ? '' : '0' })}
        />
        <span>Include upcoming</span>
      </label>
    </div>
  );
}

import { useState } from 'react';
import { num } from '../format.js';

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ value, onChange, type = 'text', placeholder, required, ariaLabel }) {
  return (
    <input className="control" type={type} value={value ?? ''} required={required} placeholder={placeholder} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} />
  );
}

export function MoneyInput({ value, onChange, ariaLabel }) {
  const shown = value == null || value === '' ? '' : num(value).replace(/–/, '');
  return (
    <span className="money-input">
      <span>RM</span>
      <input
        className="control"
        inputMode="numeric"
        aria-label={ariaLabel || 'Amount in ringgit'}
        value={shown}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
      />
    </span>
  );
}

export function SelectInput({ value, onChange, options, placeholder = 'Select', ariaLabel }) {
  return (
    <select className="control" aria-label={ariaLabel} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const id = option.id ?? option;
        const label = option.label ?? option.name ?? option;
        return <option key={id} value={id}>{label}</option>;
      })}
    </select>
  );
}

export function ChipSelect({ value = [], onChange, options, ariaLabel }) {
  const chosen = new Set(value);
  const toggle = (id) => {
    const next = chosen.has(id) ? value.filter((item) => item !== id) : [...value, id];
    onChange(next);
  };
  return (
    <div className="chip-select" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const id = option.id ?? option;
        const label = option.label ?? option;
        const on = chosen.has(id);
        return (
          <button key={id} type="button" className={`choice-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(id)}>{label}</button>
        );
      })}
    </div>
  );
}

export function CheckInline({ checked, onChange, children }) {
  return (
    <label className="check-inline">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className={`switch${checked ? ' on' : ''}`} aria-pressed={Boolean(checked)} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
      <span>{label}</span>
    </button>
  );
}

export function RadioCards({ value, onChange, options, name }) {
  return (
    <div className="radio-cards" role="radiogroup">
      {options.map((option) => (
        <label key={option.id} className={`radio-card${value === option.id ? ' on' : ''}`}>
          <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} />
          <span className="radio-copy">
            <strong>{option.label}</strong>
            {option.hint ? <span>{option.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Dropzone({ accept, onFile, label = 'Drag and drop .xlsx or .csv', hint }) {
  const [name, setName] = useState('');
  return (
    <label className="dropzone">
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setName(file?.name || '');
          if (file) onFile(file);
        }}
      />
      <span>{name || label}</span>
      <span className="fine">{hint || 'or browse · .xlsx, .xls or .csv'}</span>
    </label>
  );
}

export function Stars({ value, onChange }) {
  return (
    <div className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" className={Number(value) >= star ? 'on' : ''} aria-label={`${star} star`} onClick={() => onChange(star)}>★</button>
      ))}
    </div>
  );
}

export function EmojiRating({ value, onChange }) {
  const faces = ['😞', '🙁', '😐', '🙂', '😄'];
  return (
    <div className="emoji-rate" role="radiogroup" aria-label="Rating">
      {faces.map((face, index) => (
        <button key={face} type="button" className={Number(value) === index + 1 ? 'on' : ''} aria-label={`${index + 1}`} onClick={() => onChange(index + 1)}>{face}</button>
      ))}
    </div>
  );
}

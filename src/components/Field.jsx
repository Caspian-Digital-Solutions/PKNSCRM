export default function Field({ label, hint, error, children }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {!error && hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

import { definitionById } from '../data/definitions.js';

export default function Term({ id, children }) {
  const def = definitionById(id);
  return (
    <span className="term" tabIndex={0}>
      <span className="term-label">{children || def?.name || id}</span>
      {def && (
        <span className="term-pop" role="tooltip">
          <strong>{def.name}</strong>
          <span>{def.formula}</span>
          {def.note ? <span>{def.note}</span> : null}
        </span>
      )}
    </span>
  );
}

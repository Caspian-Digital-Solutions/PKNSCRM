export function DescriptionList({ title, rows }) {
  const visible = (rows || []).filter((row) => row && (row.value != null && row.value !== ''));
  if (!title && visible.length === 0) return null;
  return (
    <section className="desc-group">
      {title ? <h2 className="overline">{title}</h2> : null}
      <dl className="desc-list">
        {visible.map((row) => (
          <div className="desc-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function Sparkline({ values = [] }) {
  const points = values.filter((value) => value != null && Number.isFinite(Number(value)));
  if (points.length < 2) return null;
  const width = 72;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const d = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = max === min ? height / 2 : height - ((value - min) / (max - min)) * (height - 2) - 1;
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--s1)" strokeWidth="2" />
    </svg>
  );
}

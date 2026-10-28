import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from 'recharts';
import { num, rmAxis } from '../format.js';

export const SERIES = ['#3D5A80', '#8A9A5B', '#C9A227', '#7D6B91', '#5C8D89', '#9C6644', '#5E6A82', '#8C7A6B'];

function tip(value, kind) {
  if (kind === 'rm') return rmAxis(value);
  return num(value);
}

export function TrendChart({ data, lines, money = false }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="month" tick={{ fill: '#231F20', fontSize: 14 }} />
          <YAxis tick={{ fill: '#231F20', fontSize: 14 }} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip formatter={(value, name) => [tip(value, money ? 'rm' : 'n'), name]} />
          <Legend />
          {lines.map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={SERIES[index % SERIES.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBars({ data, keys, money = false }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="month" tick={{ fill: '#231F20', fontSize: 14 }} />
          <YAxis tick={{ fill: '#231F20', fontSize: 14 }} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip formatter={(value, name) => [money ? rmAxis(value) : num(value), name]} />
          <Legend />
          {keys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="a" fill={SERIES[index % SERIES.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedArea({ data, keys }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="month" tick={{ fill: '#231F20', fontSize: 14 }} />
          <YAxis tick={{ fill: '#231F20', fontSize: 14 }} tickFormatter={(value) => num(value)} />
          <Tooltip formatter={(value, name) => [num(value), name]} />
          <Legend />
          {keys.map((key, index) => (
            <Area key={key} dataKey={key} stackId="a" stroke={SERIES[index % SERIES.length]} fill={SERIES[index % SERIES.length]} fillOpacity={0.35} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeasonChart({ data, lines, bands = [] }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="month" tick={{ fill: '#231F20', fontSize: 14 }} />
          <YAxis tick={{ fill: '#231F20', fontSize: 14 }} tickFormatter={(value) => num(value)} />
          <Tooltip formatter={(value, name) => [num(value), name]} />
          <Legend />
          {bands.map((band) => (
            <ReferenceArea key={band.name + band.start} x1={band.start} x2={band.end} fill="#3D5A80" fillOpacity={0.08} />
          ))}
          {lines.map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={SERIES[index % SERIES.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

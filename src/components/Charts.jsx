import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceArea } from 'recharts';
import { num, rm, rmAxis } from '../format.js';

export const PALETTE = ['#E31E24', '#1F6FEB', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];
export const SERIES = PALETTE;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthTick(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (!match) return text;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1].slice(2)}`;
}

function tip(value, kind) {
  if (kind === 'rm') return rm(value);
  return num(value);
}

export function TrendChart({ data, lines, money = false }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={monthTick} />
          <YAxis domain={[0, 'auto']} tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip formatter={(value, name) => [tip(value, money ? 'rm' : 'n'), name]} labelFormatter={monthTick} />
          <Legend />
          {lines.map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.colour || SERIES[index % SERIES.length]} strokeWidth={2} dot={false} />
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
          <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={monthTick} />
          <YAxis domain={[0, 'auto']} tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip formatter={(value, name) => [money ? rm(value) : num(value), name]} labelFormatter={monthTick} />
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
          <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={monthTick} />
          <YAxis domain={[0, 'auto']} tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={(value) => num(value)} />
          <Tooltip formatter={(value, name) => [num(value), name]} labelFormatter={monthTick} />
          <Legend />
          {keys.map((key, index) => (
            <Area key={key} type="monotone" dataKey={key} stackId="a" stroke={SERIES[index % SERIES.length]} fill={SERIES[index % SERIES.length]} fillOpacity={0.35} />
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
          <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={monthTick} />
          <YAxis domain={[0, 'auto']} tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={(value) => num(value)} />
          <Tooltip formatter={(value, name) => [num(value), name]} labelFormatter={monthTick} />
          <Legend />
          {bands.map((band) => (
            <ReferenceArea key={band.name + band.start} x1={band.start} x2={band.end} fill="#3D5A80" fillOpacity={0.08} />
          ))}
          {lines.map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.colour || SERIES[index % SERIES.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, bars, money = false, categoryKey = 'name' }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fill: '#374151', fontSize: 12 }} tickFormatter={monthTick} />
          <YAxis domain={[0, 'auto']} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip formatter={(value, name) => [money ? rm(value) : num(value), name]} />
          <Legend />
          {(bars || []).map((bar, index) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.colour || PALETTE[index % PALETTE.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBars({ data, colour = '#1F6FEB', onPick, valueKey = 'value', nameKey = 'name', money = false }) {
  const height = Math.max(200, (data?.length || 1) * 36);
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" horizontal={false} />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <YAxis type="category" dataKey={nameKey} width={128} tick={{ fill: '#374151', fontSize: 12 }} />
          <Tooltip formatter={(value) => (money ? rm(value) : num(value))} />
          <Legend />
          <Bar dataKey={valueKey} name={money ? 'Amount' : 'Count'} radius={[0, 4, 4, 0]} onClick={(row) => onPick?.(row)} cursor={onPick ? 'pointer' : undefined}>
            {(data || []).map((row, index) => <Cell key={row[nameKey] || index} fill={row.colour || colour || PALETTE[index % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VBars({ data, colour = '#E31E24', onPick }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} />
          <YAxis domain={[0, 'auto']} tickFormatter={(value) => num(value)} />
          <Tooltip formatter={(value) => num(value)} />
          <Legend />
          <Bar dataKey="value" name="Count" fill={colour} radius={[4, 4, 0, 0]} onClick={(row) => onPick?.(row)} label={(data || []).length <= 8 ? { position: 'top', fontSize: 11, formatter: (value) => num(value) } : false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, centre }) {
  return (
    <div className="chart-wrap donut-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={1}>
            {(data || []).map((row, index) => <Cell key={row.name || index} fill={row.colour || PALETTE[index % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [num(value), name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {centre ? <div className="donut-centre"><strong>{centre}</strong></div> : null}
    </div>
  );
}

export function Bubbles({ data }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E2E5EA" />
          <XAxis dataKey="x" name="Cost per attendee" tickFormatter={(value) => rmAxis(value)} />
          <YAxis dataKey="y" name="Attendance" domain={[0, 'auto']} tickFormatter={(value) => num(value)} />
          <ZAxis dataKey="z" range={[60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [name === 'Cost per attendee' ? rm(value) : num(value), name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''} />
          <Scatter data={data}>
            {(data || []).map((row, index) => <Cell key={row.id || index} fill={row.colour || PALETTE[index % PALETTE.length]} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

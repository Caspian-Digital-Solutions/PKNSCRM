import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceArea } from 'recharts';
import { num, pct, rm, rmAxis } from '../format.js';

export const PALETTE = ['#E31E24', '#1F6FEB', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B', '#84CC16', '#F97316'];
export const SERIES = PALETTE;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AXIS = { fill: '#374151', fontSize: 12 };
const GRID = <CartesianGrid stroke="#F1F5F9" vertical={false} />;

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

function ChartTip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label ? <strong>{monthTick(label)}</strong> : null}
      {payload.map((item) => (
        <p key={`${item.name}-${item.dataKey}`}>
          <i style={{ background: item.color || item.fill || item.payload?.colour || '#64748B' }} />
          <span>{item.name} · {tip(item.value, money ? 'rm' : 'n')}</span>
        </p>
      ))}
    </div>
  );
}

function yWidth(money) {
  return money ? 72 : 48;
}

function categoryWidth(data, key) {
  const longest = (data || []).reduce((max, row) => Math.max(max, String(row?.[key] || '').length), 0);
  return Math.min(180, Math.max(72, longest * 7));
}

export function TrendChart({ data, lines, money = false }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickFormatter={monthTick} interval={0} />
          <YAxis width={yWidth(money)} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip content={<ChartTip money={money} />} />
          {(lines || []).length > 1 ? <Legend /> : null}
          {(lines || []).map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.colour || SERIES[index % SERIES.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickFormatter={monthTick} interval={0} />
          <YAxis width={yWidth(money)} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip content={<ChartTip money={money} />} />
          {(keys || []).length > 1 ? <Legend /> : null}
          {(keys || []).map((key, index) => (
            <Bar key={key} dataKey={key} stackId="a" fill={SERIES[index % SERIES.length]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedArea({ data, keys }) {
  return (
    <div className="chart-wrap is-large">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickFormatter={monthTick} interval={0} />
          <YAxis width={48} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => num(value)} />
          <Tooltip content={<ChartTip />} />
          {(keys || []).length > 1 ? <Legend /> : null}
          {(keys || []).map((key, index) => (
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
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickFormatter={monthTick} interval={0} />
          <YAxis width={48} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => num(value)} />
          <Tooltip content={<ChartTip />} />
          {(lines || []).length > 1 ? <Legend /> : null}
          {bands.map((band) => (
            <ReferenceArea key={band.name + band.start} x1={band.start} x2={band.end} fill="#3D5A80" fillOpacity={0.08} />
          ))}
          {(lines || []).map((line, index) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.colour || SERIES[index % SERIES.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, bars, money = false, categoryKey = 'name' }) {
  const tilt = (data || []).length > 6;
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: tilt ? 28 : 8 }}>
          {GRID}
          <XAxis dataKey={categoryKey} tick={AXIS} interval={0} angle={tilt ? -30 : 0} textAnchor={tilt ? 'end' : 'middle'} height={tilt ? 60 : 30} tickFormatter={monthTick} />
          <YAxis width={yWidth(money)} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip content={<ChartTip money={money} />} />
          {(bars || []).length > 1 ? <Legend /> : null}
          {(bars || []).map((bar, index) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.colour || PALETTE[index % PALETTE.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBars({ data, colour = '#1F6FEB', onPick, valueKey = 'value', nameKey = 'name', money = false }) {
  const height = Math.max(220, (data?.length || 1) * 32 + 24);
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#F1F5F9" horizontal={false} vertical={false} />
          <XAxis type="number" domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <YAxis type="category" dataKey={nameKey} width={categoryWidth(data, nameKey)} interval={0} tick={AXIS} />
          <Tooltip content={<ChartTip money={money} />} />
          <Bar dataKey={valueKey} name={money ? 'Amount' : 'Count'} radius={[0, 4, 4, 0]} maxBarSize={28} onClick={(row) => onPick?.(row)} cursor={onPick ? 'pointer' : undefined}>
            {(data || []).map((row, index) => <Cell key={row[nameKey] || index} fill={row.colour || colour || PALETTE[index % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VBars({ data, colour = '#E31E24', onPick, money = false }) {
  const tilt = (data || []).length > 8;
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: tilt ? 28 : 8 }}>
          {GRID}
          <XAxis dataKey="name" tick={AXIS} interval={0} angle={tilt ? -30 : 0} textAnchor={tilt ? 'end' : 'middle'} height={tilt ? 64 : 32} />
          <YAxis width={yWidth(money)} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => (money ? rmAxis(value) : num(value))} />
          <Tooltip content={<ChartTip money={money} />} />
          <Bar dataKey="value" fill={colour} radius={[4, 4, 0, 0]} maxBarSize={48} onClick={(row) => onPick?.(row)} label={(data || []).length <= 8 ? { position: 'top', fontSize: 11, formatter: (value) => (money ? rmAxis(value) : num(value)) } : false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, centre, caption = 'Total' }) {
  const rows = (data || []).slice(0, 6);
  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  return (
    <div className="donut-block">
      <div className="chart-wrap donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={1}>
              {rows.map((row, index) => <Cell key={row.name || index} fill={row.colour || PALETTE[index % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<ChartTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-centre"><strong>{centre || num(total)}</strong><span>{caption}</span></div>
      </div>
      <ul className="chart-legend">
        {rows.map((row, index) => (
          <li key={row.name || index}>
            <i style={{ background: row.colour || PALETTE[index % PALETTE.length] }} />
            {row.name} · {num(row.value)} · {total ? `${Math.round((Number(row.value) / total) * 100)}%` : pct(null)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Bubbles({ data }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          {GRID}
          <XAxis type="number" dataKey="x" name="Cost per attendee" tick={AXIS} tickFormatter={(value) => rmAxis(value)} domain={[0, 'auto']} />
          <YAxis type="number" dataKey="y" name="Attendance" width={48} domain={[0, 'auto']} tick={AXIS} tickFormatter={(value) => num(value)} />
          <ZAxis dataKey="z" range={[60, 400]} name="New profiles" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTip />} />
          <Scatter data={data}>
            {(data || []).map((row, index) => <Cell key={row.id || index} fill={row.colour || PALETTE[index % PALETTE.length]} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

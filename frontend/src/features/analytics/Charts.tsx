import { BarChart3, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FlowPoint, Priority, TaskStatus, TrendPoint, WorkloadRow } from '@/api/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/dates';

const AXIS = { stroke: 'var(--line-strong)', tickLine: false, axisLine: false } as const;

/** Chart card with a chart/table toggle so every chart has an accessible table view. */
export function ChartCard({
  title,
  description,
  chart,
  table,
  height = 260,
}: {
  title: string;
  description?: string;
  chart: ReactNode;
  table: { headers: string[]; rows: (string | number)[][] };
  height?: number;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <Segmented
            label={`${title} view`}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: <span className="sr-only">Chart</span>, icon: <BarChart3 aria-hidden="true" /> },
              { value: 'table', label: <span className="sr-only">Table</span>, icon: <Table2 aria-hidden="true" /> },
            ]}
          />
        }
      />
      <CardBody>
        {view === 'chart' ? (
          <div style={{ height }} className="w-full">
            {chart}
          </div>
        ) : (
          <div className="scrollbar-thin overflow-auto" style={{ maxHeight: height }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={`py-1.5 ${j === 0 ? 'text-left text-ink-2' : 'text-right text-ink tabular'}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
}

/** Custom tooltip content; Recharts injects active/payload/label when rendering it. */
function ChartTooltip({ active, payload, label, labelFormatter }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: string | number; labelFormatter?: (l: string) => string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      {label !== undefined && <p className="mb-1 font-semibold text-ink">{labelFormatter ? labelFormatter(String(label)) : label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: p.payload?.fill ?? p.color }} aria-hidden="true" />
            <span className="flex-1">{p.name}</span>
            <span className="font-semibold text-ink tabular">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const legendFormatter = (value: string) => <span className="text-xs text-ink-2">{value}</span>;

// ---------------------------------------------------------------------------

export function StatusChart({ data }: { data: { status: TaskStatus; count: number }[] }) {
  const rows = data.map((d) => ({ name: STATUS_LABEL[d.status], count: d.count, fill: STATUS_COLOR[d.status] }));
  return (
    <ChartCard
      title="Tasks by status"
      description="All tasks in the workflow"
      height={220}
      table={{ headers: ['Status', 'Tasks'], rows: rows.map((r) => [r.name, r.count]) }}
      chart={
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 8 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={84} {...AXIS} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip />} />
            <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.fill} />
              ))}
              <LabelList dataKey="count" position="right" className="fill-[var(--ink-2)] text-xs tabular" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}

export function PriorityChart({ data }: { data: { priority: Priority; count: number }[] }) {
  const rows = data.map((d) => ({ name: PRIORITY_LABEL[d.priority], count: d.count }));
  return (
    <ChartCard
      title="Open tasks by priority"
      description="Tasks not yet Done"
      height={220}
      table={{ headers: ['Priority', 'Open tasks'], rows: rows.map((r) => [r.name, r.count]) }}
      chart={
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 8 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={64} {...AXIS} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip />} />
            <Bar dataKey="count" name="Open tasks" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
              <LabelList dataKey="count" position="right" className="fill-[var(--ink-2)] text-xs tabular" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}

export function WorkloadChart({ data }: { data: WorkloadRow[] }) {
  const rows = data.map((w) => ({ name: w.user.name.split(' ')[0], fullName: w.user.name, todo: w.todo, inProgress: w.inProgress, inReview: w.inReview, overdue: w.overdue, done: w.done }));
  const height = Math.max(200, rows.length * 40 + 60);
  const seg = { stroke: 'var(--surface)', strokeWidth: 2, isAnimationActive: false, maxBarSize: 22 } as const;
  return (
    <ChartCard
      title="Workload by member"
      description="Open tasks assigned to each person"
      height={height}
      table={{
        headers: ['Member', 'To Do', 'In Progress', 'In Review', 'Overdue', 'Done'],
        rows: rows.map((r) => [r.fullName, r.todo, r.inProgress, r.inReview, r.overdue, r.done]),
      }}
      chart={
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} strokeDasharray="0" />
            <XAxis type="number" allowDecimals={false} {...AXIS} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={72} {...AXIS} tick={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<ChartTooltip labelFormatter={(l) => rows.find((r) => r.name === l)?.fullName ?? l} />}
            />
            <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} formatter={legendFormatter} />
            <Bar dataKey="todo" name="To Do" stackId="w" fill={STATUS_COLOR.TODO} {...seg} />
            <Bar dataKey="inProgress" name="In Progress" stackId="w" fill={STATUS_COLOR.IN_PROGRESS} {...seg} />
            <Bar dataKey="inReview" name="In Review" stackId="w" fill={STATUS_COLOR.IN_REVIEW} radius={[0, 4, 4, 0]} {...seg} />
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}

export function TrendChart({ data, title = 'Completion trend', description = 'Tasks created and completed per week (last 8 weeks)' }: { data: TrendPoint[]; title?: string; description?: string }) {
  const rows = data.map((p) => ({ week: formatDate(p.weekStart, 'd MMM'), created: p.created, completed: p.completed }));
  return (
    <ChartCard
      title={title}
      description={description}
      table={{ headers: ['Week of', 'Created', 'Completed'], rows: rows.map((r) => [r.week, r.created, r.completed]) }}
      chart={
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" {...AXIS} tick={{ fontSize: 12 }} dy={6} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} {...AXIS} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }} content={<ChartTooltip labelFormatter={(l) => `Week of ${l}`} />} />
            <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} formatter={legendFormatter} />
            <Line
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--series-1)' }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--series-2)' }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      }
    />
  );
}

/**
 * Cumulative flow: how many tasks sat in each status at the end of each day, replayed from the
 * status-change history. Bands widen where work piles up (e.g. a growing In Review band).
 */
export function FlowChart({ data }: { data: FlowPoint[] }) {
  const rows = data.map((p) => ({ day: formatDate(p.date, 'd MMM'), done: p.done, inReview: p.inReview, inProgress: p.inProgress, todo: p.todo }));
  const series: { key: 'done' | 'inReview' | 'inProgress' | 'todo'; status: TaskStatus }[] = [
    { key: 'done', status: 'DONE' },
    { key: 'inReview', status: 'IN_REVIEW' },
    { key: 'inProgress', status: 'IN_PROGRESS' },
    { key: 'todo', status: 'TODO' },
  ];
  return (
    <ChartCard
      title="Flow — last 28 days"
      description="Tasks in each status at the end of each day, from recorded status changes"
      height={280}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" {...AXIS} interval={6} fontSize={12} />
            <YAxis allowDecimals={false} {...AXIS} fontSize={12} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--line-strong)' }} />
            <Legend iconType="square" iconSize={10} formatter={legendFormatter} />
            {series.map((s) => (
              <Area
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={STATUS_LABEL[s.status]}
                stackId="flow"
                stroke="var(--surface)"
                strokeWidth={2}
                fill={STATUS_COLOR[s.status]}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      }
      table={{
        headers: ['Day', 'To Do', 'In Progress', 'In Review', 'Done'],
        rows: data.map((p) => [formatDate(p.date, 'EEE d MMM'), p.todo, p.inProgress, p.inReview, p.done]),
      }}
    />
  );
}

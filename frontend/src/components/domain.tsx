import { AlertCircle, ArrowDown, ArrowUp, CalendarClock, ChevronsUp, Equal } from 'lucide-react';
import type { Health, Priority, ProjectStatus, Role, TaskCounts, TaskStatus } from '@/api/types';
import { cn } from '@/lib/cn';
import {
  HEALTH_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  ROLE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from '@/lib/constants';
import { daysUntil, formatDueDate } from '@/lib/dates';
import { Badge, type Tone } from './ui/Badge';

export function StatusDot({ status, className }: { status: TaskStatus; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ backgroundColor: STATUS_COLOR[status] }} aria-hidden="true" />;
}

const STATUS_TONE: Record<TaskStatus, Tone> = { TODO: 'neutral', IN_PROGRESS: 'info', IN_REVIEW: 'warning', DONE: 'success' };

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>
      <StatusDot status={status} className="size-1.5" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_ICON: Record<Priority, typeof ArrowUp> = { URGENT: ChevronsUp, HIGH: ArrowUp, MEDIUM: Equal, LOW: ArrowDown };

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const Icon = PRIORITY_ICON[priority];
  return <Icon className={cn('size-4 shrink-0', className)} style={{ color: PRIORITY_COLOR[priority] }} aria-label={`${PRIORITY_LABEL[priority]} priority`} strokeWidth={2.5} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-ink-2">
      <PriorityIcon priority={priority} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const HEALTH_TONE: Record<Health, Tone> = { NOT_STARTED: 'neutral', ON_TRACK: 'success', AT_RISK: 'warning', OFF_TRACK: 'danger', COMPLETED: 'brand' };

export function HealthBadge({ health, className }: { health: Health; className?: string }) {
  return (
    <Badge tone={HEALTH_TONE[health]} className={className}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {HEALTH_LABEL[health]}
    </Badge>
  );
}

export const HEALTH_COLOR: Record<Health, string> = {
  NOT_STARTED: '#94a3b8',
  ON_TRACK: '#10b981',
  AT_RISK: '#f59e0b',
  OFF_TRACK: '#ef4444',
  COMPLETED: '#6366f1',
};

const ROLE_TONE: Record<Role, Tone> = { OWNER: 'brand', MANAGER: 'info', MEMBER: 'neutral', VIEWER: 'neutral' };

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>;
}

const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = { ACTIVE: 'success', ON_HOLD: 'warning', COMPLETED: 'brand', ARCHIVED: 'neutral' };

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_STATUS_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</Badge>;
}

/** Coloured square with the project's initial, used as a project "logo". */
export function ProjectMark({ name, color, size = 'md', className }: { name: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'size-5 text-[10px] rounded', md: 'size-8 text-sm rounded-lg', lg: 'size-11 text-lg rounded-xl' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center font-bold text-white', s, className)} style={{ backgroundColor: color }} aria-hidden="true">
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/** Due date with colour coding: red if overdue, amber if due within 2 days. */
export function DueDate({ date, done, className, showIcon = true }: { date: string | null; done?: boolean; className?: string; showIcon?: boolean }) {
  if (!date) return <span className={cn('text-[13px] text-subtle', className)}>No due date</span>;
  const n = daysUntil(date);
  const tone = done ? 'text-muted' : n < 0 ? 'text-danger font-medium' : n <= 2 ? 'text-warning font-medium' : 'text-ink-2';
  const Icon = !done && n < 0 ? AlertCircle : CalendarClock;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] whitespace-nowrap', tone, className)} title={date}>
      {showIcon && <Icon className="size-3.5" aria-hidden="true" />}
      {formatDueDate(date)}
      {!done && n < 0 && <span className="sr-only">(overdue)</span>}
    </span>
  );
}

/**
 * A project drawn as a small tower of its tasks, the 2D twin of the 3D skyline on Today:
 * bronze approved work at the base, then in review, in progress and not started; a red
 * outline around the overdue share of the open work.
 */
export function ProjectTower({ counts, className, height = 44 }: { counts: TaskCounts; className?: string; height?: number }) {
  const width = 16;
  const layers: [number, string][] = [
    [counts.done, 'var(--model-done)'],
    [counts.inReview, 'var(--model-review)'],
    [counts.inProgress, 'var(--model-progress)'],
    [counts.todo, 'var(--model-todo)'],
  ];
  const total = Math.max(1, counts.total);
  const unit = height / total;
  let y = height;
  const open = counts.todo + counts.inProgress + counts.inReview;
  // Open work sits on top of the tower, so the overdue share is drawn from the top down.
  const overdueH = Math.min(open, counts.overdue) * unit;
  return (
    <svg
      width={width + 4}
      height={height + 2}
      viewBox={`-2 -1 ${width + 4} ${height + 2}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={`${counts.done} approved, ${counts.inReview} in review, ${counts.inProgress} in progress, ${counts.todo} not started${counts.overdue ? `, ${counts.overdue} overdue` : ''}`}
    >
      {counts.total === 0 && <rect x={0} y={height - 2} width={width} height={2} fill="var(--model-todo)" />}
      {layers.map(([n, fill], i) => {
        if (n <= 0) return null;
        const h = n * unit;
        y -= h;
        return <rect key={i} x={0} y={y} width={width} height={h} fill={fill} stroke="var(--canvas)" strokeWidth={0.5} />;
      })}
      {overdueH > 0 && <rect x={-1.5} y={0} width={width + 3} height={overdueH} fill="none" stroke="var(--danger)" strokeWidth={1} />}
    </svg>
  );
}

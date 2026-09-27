import { CalendarClock, CheckCircle2, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { ProjectSummary } from '@/api/types';
import { HealthBadge, ProjectStatusBadge, ProjectTower, RoleBadge } from '@/components/domain';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { daysUntil, formatDate } from '@/lib/dates';

export function ProjectCard({ project: p }: { project: ProjectSummary }) {
  const days = p.deadline ? daysUntil(p.deadline) : null;
  const closed = p.status === 'COMPLETED' || p.status === 'ARCHIVED';
  return (
    <Link
      to={`/projects/${p.id}`}
      className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop focus-visible:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <ProjectTower counts={p.taskCounts} height={40} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-ink group-hover:text-accent">{p.name}</h3>
          <p className="font-mono text-xs text-muted">{p.key}</p>
        </div>
        {p.status === 'ACTIVE' ? <HealthBadge health={p.health} /> : <ProjectStatusBadge status={p.status} />}
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-muted">{p.description || 'No description yet.'}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted">
            <span className="font-medium text-ink tabular">{p.taskCounts.done}</span> of <span className="tabular">{p.taskCounts.total}</span> tasks approved
          </span>
          <span className="font-semibold text-ink tabular">{p.progress}%</span>
        </div>
        <ProgressBar value={p.progress} color="var(--model-done)" label={`${p.name} progress`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Avatar user={p.owner} size="xs" />
          <Users className="size-3.5" aria-hidden="true" />
          <span className="tabular">{p.memberCount}</span>
          <span className="sr-only">members</span>
        </span>
        {p.taskCounts.overdue > 0 && !closed && (
          <span className="inline-flex items-center gap-1 font-medium text-danger">
            <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" />
            {p.taskCounts.overdue} overdue
          </span>
        )}
        {p.deadline && (
          <span className={cn('ml-auto inline-flex items-center gap-1', !closed && days !== null && days < 0 && 'text-danger', !closed && days !== null && days >= 0 && days <= 7 && 'text-warning')}>
            {closed ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <CalendarClock className="size-3.5" aria-hidden="true" />}
            {formatDate(p.deadline, 'd MMM')}
          </span>
        )}
        <span className={cn(!p.deadline && 'ml-auto')}>
          <RoleBadge role={p.myRole} />
        </span>
      </div>
    </Link>
  );
}

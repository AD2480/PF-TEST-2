import { ArrowUpRight, CheckCircle2, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router';
import type { ApprovedItem, AttentionItem, AttentionKind, Severity } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/dates';

export const KIND_LABEL: Record<AttentionKind, string> = {
  REVIEW_WAITING: 'Review waiting',
  CHANGES_REQUESTED: 'Changes requested',
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due soon',
  AWAITING_REVIEW: 'Waiting on reviewer',
  PROJECT_RISK: 'Project health',
  MILESTONE_RISK: 'Milestone',
  WORKLOAD: 'Workload',
  UNASSIGNED: 'Unassigned',
  BLOCKED: 'Blocked',
  BLOCKING: 'Holding up work',
};

const SEVERITY: Record<Severity, { label: string; bar: string; text: string }> = {
  HIGH: { label: 'Now', bar: 'bg-danger', text: 'text-danger' },
  MEDIUM: { label: 'Soon', bar: 'bg-warning', text: 'text-warning' },
  LOW: { label: 'Worth a look', bar: 'bg-line-strong', text: 'text-muted' },
};

/** One item: severity rule, what kind of rule fired, the reason in words, and the records behind it. */
function AttentionRow({ item }: { item: AttentionItem }) {
  const sev = SEVERITY[item.severity];
  return (
    <li className="group relative">
      <Link to={item.link} className="grid grid-cols-[3px_1fr_auto] gap-x-4 py-4 pr-1 transition-colors hover:bg-surface-2/60">
        <span className={cn('row-span-3 h-full', sev.bar)} aria-hidden="true" />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cn('caps', sev.text)}>{KIND_LABEL[item.kind]}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: item.projectColor }} aria-hidden="true" />
            {item.projectName}
          </span>
        </p>
        <ArrowUpRight className="row-span-3 size-4 self-center text-subtle transition-colors group-hover:text-accent" aria-hidden="true" />
        <p className="mt-1.5 text-[15px] leading-snug font-light text-ink">{item.title}</p>
        <div className="mt-1 space-y-2">
          <p className="max-w-3xl text-[13px] leading-relaxed text-ink-2">{item.reason}</p>
          {item.refs.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Records">
              {item.refs.map((r) => (
                <li key={r} className="border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </li>
  );
}

/** Attention items grouped Now / Soon / Worth a look. Order comes from the server (severity, then date). */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const groups = (['HIGH', 'MEDIUM', 'LOW'] as const).map((s) => ({ s, list: items.filter((i) => i.severity === s) })).filter((g) => g.list.length > 0);
  return (
    <div className="space-y-8">
      {groups.map(({ s, list }) => (
        <section key={s} aria-labelledby={`attention-${s}`}>
          <h3 id={`attention-${s}`} className="flex items-baseline justify-between border-b border-ink/80 pb-2">
            <span className="caps text-ink">{SEVERITY[s].label}</span>
            <span className="numeral text-xl text-muted">{String(list.length).padStart(2, '0')}</span>
          </h3>
          <ul className="divide-y divide-line">
            {list.map((i) => (
              <AttentionRow key={i.id} item={i} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** "What evidence proves completion": recent approvals and what they were approved on. */
export function ApprovedList({ items }: { items: ApprovedItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={`${a.taskId}-${a.version}`}>
          <Link to={a.link} className="group flex items-start gap-3 py-3.5 transition-colors hover:bg-surface-2/60">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] text-ink group-hover:text-accent">
                <span className="mr-1.5 font-mono text-xs text-muted">{a.taskKey}</span>
                {a.title}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <Avatar user={a.reviewer} size="sm" />
                <span>
                  {a.reviewer.name.split(' ')[0]} approved v{a.version} {timeAgo(a.approvedAt)}
                </span>
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
                <FileCheck2 className="size-3.5 text-muted" aria-hidden="true" />
                {a.evidenceCount} {a.evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
                {a.criteriaCount > 0 && ` · ${a.criteriaCount} ${a.criteriaCount === 1 ? 'criterion' : 'criteria'} met`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

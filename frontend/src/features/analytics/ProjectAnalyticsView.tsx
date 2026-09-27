import { AlertTriangle, CalendarClock, CheckCircle2, Gauge, Timer } from 'lucide-react';
import { useProjectAnalyticsQuery } from '@/api/endpoints';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Spinner';
import { StatGrid, StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { MiniTaskList } from '@/features/tasks/MiniTaskList';
import { AiStatusDraft } from '@/features/ai/AiPanels';
import { FlowChart, PriorityChart, StatusChart, TrendChart, WorkloadChart } from './Charts';
import { HealthCard } from './HealthCard';

export function ProjectAnalyticsView({ projectId, color, showExpected = true }: { projectId: number; color?: string; showExpected?: boolean }) {
  const { data: a, isLoading, isError, error, refetch, isFetching } = useProjectAnalyticsQuery(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }
  if (isError || !a) return <ErrorState error={error} onRetry={refetch} title="Couldn’t load analytics" />;

  return (
    <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-80' : ''}`}>
      <StatGrid cols={4}>
        <StatTile label="Progress" value={`${a.progress}%`} icon={Gauge} tone="brand" hint={`${a.taskCounts.done} of ${a.taskCounts.total} tasks done`} />
        <StatTile label="Overdue" value={a.taskCounts.overdue} icon={AlertTriangle} tone={a.taskCounts.overdue ? 'danger' : 'neutral'} hint="Open tasks past their due date" />
        <StatTile
          label="Avg. cycle time"
          value={a.averageCycleDays === null ? '—' : `${a.averageCycleDays} d`}
          icon={Timer}
          tone="info"
          hint={a.averageCycleDays === null ? 'No task has been started and approved yet' : 'First start to approval, approved tasks'}
        />
        <StatTile
          label="First-time approval"
          value={a.approvalRate === null ? '—' : `${a.approvalRate}%`}
          icon={CheckCircle2}
          tone="success"
          hint={a.approvalRate === null ? 'No reviewed tasks yet' : 'Reviewed tasks approved on their first submission'}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <HealthCard health={a.health} reasons={a.healthReasons} progress={a.progress} expected={showExpected ? a.expectedProgress : null} color={color} />
        <div className="lg:col-span-2">
          <TrendChart data={a.completionTrend} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusChart data={a.statusDistribution} />
        <PriorityChart data={a.priorityDistribution} />
      </div>

      <FlowChart data={a.flow} />

      <section aria-labelledby="review-flow" className="border border-line bg-surface">
        <div className="border-b border-line px-4 py-3.5 sm:px-6">
          <h2 id="review-flow" className="caps text-ink">
            Review flow
          </h2>
          <p className="mt-1 text-xs text-muted">From submissions, reviews and status changes. Medians, so one outlier doesn’t skew them.</p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-5">
          {[
            { label: 'Submissions', value: String(a.reviewStats.submissions), hint: `${a.reviewStats.reviewed} reviewed · ${a.reviewStats.pending} waiting` },
            { label: 'Time to review', value: a.reviewStats.medianHoursToReview === null ? '—' : a.reviewStats.medianHoursToReview < 48 ? `${Math.round(a.reviewStats.medianHoursToReview)}h` : `${Math.round(a.reviewStats.medianHoursToReview / 24)}d`, hint: 'Median, submission → decision' },
            { label: 'Changes requested', value: a.reviewStats.reworkRate === null ? '—' : `${a.reviewStats.reworkRate}%`, hint: 'Share of reviews sending work back' },
            ...a.timeInStatus.map((t) => ({
              label: t.status === 'IN_PROGRESS' ? 'In progress for' : 'In review for',
              value: t.medianDays === null ? '—' : `${t.medianDays}d`,
              hint: t.samples ? `Median of ${t.samples} finished ${t.samples === 1 ? 'stay' : 'stays'}` : 'No finished stays yet',
            })),
          ].map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <dt className="eyebrow">{s.label}</dt>
              <dd className="numeral mt-4 text-[32px] leading-none text-ink">{s.value}</dd>
              <dd className="mt-2 text-xs text-muted">{s.hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      <AiStatusDraft projectId={a.projectId} />

      {a.workload.length > 0 && <WorkloadChart data={a.workload} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overdue tasks" description="Open tasks whose due date has passed" />
          <CardBody className="py-2">
            {a.overdueTasks.length ? (
              <MiniTaskList tasks={a.overdueTasks} showAssignee />
            ) : (
              <EmptyState icon={CheckCircle2} title="Nothing overdue" description="Every open task is on schedule." compact />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming deadlines" description="Open tasks due in the next 14 days" />
          <CardBody className="py-2">
            {a.upcomingDeadlines.length ? (
              <MiniTaskList tasks={a.upcomingDeadlines} showAssignee />
            ) : (
              <EmptyState icon={CalendarClock} title="No upcoming deadlines" compact />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

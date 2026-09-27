import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Flag, Loader, Send } from 'lucide-react';
import { Link } from 'react-router';
import { useProjectActivityQuery, useProjectAnalyticsQuery } from '@/api/endpoints';
import { RoleBadge } from '@/components/domain';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Spinner';
import { StatGrid, StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ActivityList } from '@/features/activity/ActivityList';
import { HealthCard } from '@/features/analytics/HealthCard';
import { ForecastCard } from '@/features/model/ForecastCard';
import { useProjectContext } from '@/features/projects/projectContext';
import { MiniTaskList } from '@/features/tasks/MiniTaskList';
import { dueRelative, formatDate } from '@/lib/dates';

export function OverviewPage() {
  const { project } = useProjectContext();
  const { data: a, isLoading, isError, error, refetch } = useProjectAnalyticsQuery(project.id);
  const { data: activity } = useProjectActivityQuery({ projectId: project.id, size: 6 });
  const c = project.taskCounts;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <StatGrid cols={5}>
        <StatTile label="To do" value={c.todo} icon={CircleDashed} tone="neutral" to="tasks?status=TODO" />
        <StatTile label="In progress" value={c.inProgress} icon={Loader} tone="info" to="tasks?status=IN_PROGRESS" />
        <StatTile label="In review" value={c.inReview} icon={Send} tone="warning" to="tasks?status=IN_REVIEW" />
        <StatTile label="Done" value={c.done} icon={CheckCircle2} tone="success" to="tasks?status=DONE" />
        <StatTile label="Overdue" value={c.overdue} icon={AlertTriangle} tone={c.overdue ? 'danger' : 'neutral'} to="tasks?due=overdue" className="col-span-2 lg:col-span-1" />
      </StatGrid>

      <ForecastCard project={project} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="About this project" />
            <CardBody>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-2">{project.description || 'No description yet.'}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Owner</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-medium text-ink">
                    <Avatar user={project.owner} size="xs" /> <span className="truncate">{project.owner.name}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Start</dt>
                  <dd className="mt-1 font-medium text-ink">{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Deadline</dt>
                  <dd className="mt-1 font-medium text-ink">{formatDate(project.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Tasks</dt>
                  <dd className="mt-1 font-medium text-ink tabular">{c.total}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Upcoming deadlines"
              description="Open tasks due in the next 14 days"
              action={
                <Link to="tasks?due=week" className="text-xs font-medium text-accent hover:underline">
                  View all
                </Link>
              }
            />
            <CardBody className="py-2">
              {isLoading ? (
                <Skeleton className="my-2 h-24 w-full" />
              ) : isError ? (
                <ErrorState error={error} onRetry={refetch} />
              ) : a && (a.overdueTasks.length > 0 || a.upcomingDeadlines.length > 0) ? (
                <>
                  {a.overdueTasks.length > 0 && (
                    <>
                      <p className="pt-2 text-xs font-semibold text-danger">Overdue</p>
                      <MiniTaskList tasks={a.overdueTasks.slice(0, 5)} showAssignee />
                    </>
                  )}
                  {a.upcomingDeadlines.length > 0 && (
                    <>
                      {a.overdueTasks.length > 0 && <p className="pt-3 text-xs font-semibold text-muted">Coming up</p>}
                      <MiniTaskList tasks={a.upcomingDeadlines.slice(0, 6)} showAssignee />
                    </>
                  )}
                </>
              ) : (
                <EmptyState icon={CalendarClock} title="Nothing due soon" description="No open tasks are due in the next two weeks." compact />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Link to="activity" className="text-xs font-medium text-accent hover:underline">
                  View all
                </Link>
              }
            />
            <CardBody>{activity ? <ActivityList items={activity.content} compact /> : <Skeleton className="h-40 w-full" />}</CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {a ? (
            <HealthCard health={a.health} reasons={a.healthReasons} progress={a.progress} expected={project.status === 'ACTIVE' ? a.expectedProgress : null} color={project.color} />
          ) : (
            <Skeleton className="h-56 w-full rounded-xl" />
          )}

          <Card>
            <CardHeader
              title="Milestones"
              action={
                <Link to="milestones" className="text-xs font-medium text-accent hover:underline">
                  Manage
                </Link>
              }
            />
            <CardBody className="space-y-4">
              {a?.milestones.length === 0 && <EmptyState icon={Flag} title="No milestones" description="Milestones group tasks into checkpoints." compact />}
              {a?.milestones.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
                      {m.completed ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Completed" /> : <Flag className="size-4 shrink-0 text-muted" aria-hidden="true" />}
                      <span className="truncate">{m.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{m.completed ? formatDate(m.dueDate, 'd MMM') : dueRelative(m.dueDate)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={m.progress} color={m.completed ? 'var(--success)' : undefined} label={`${m.name} progress`} />
                    <span className="w-16 shrink-0 text-right text-xs text-muted tabular">
                      {m.doneCount}/{m.taskCount}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Team"
              description={`${project.members.length} members`}
              action={
                <Link to="team" className="text-xs font-medium text-accent hover:underline">
                  Manage
                </Link>
              }
            />
            <CardBody className="py-2">
              <ul className="divide-y divide-line">
                {project.members.slice(0, 7).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <Avatar user={m.user} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{m.user.name}</p>
                      <p className="truncate text-xs text-muted">{m.openTaskCount} open tasks</p>
                    </div>
                    <RoleBadge role={m.role} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

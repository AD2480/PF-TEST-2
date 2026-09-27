import { Flag, FolderKanban, Plus, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { lazy, Suspense, useState } from 'react';
import { useDashboardQuery } from '@/api/endpoints';
import { useAppSelector } from '@/app/store';
import { PageContainer } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ApprovedList, AttentionList } from '@/features/dashboard/AttentionList';
import { PendingInvitations } from '@/features/projects/InvitationList';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';
import { MiniTaskList } from '@/features/tasks/MiniTaskList';
import { cn } from '@/lib/cn';
import { daysUntil, formatDueDate } from '@/lib/dates';
import { useDocumentTitle } from '@/lib/hooks';

// three.js is only downloaded when the skyline is shown.
const PortfolioSkylineCanvas = lazy(() => import('@/features/model/PortfolioSkylineCanvas'));

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  useDocumentTitle('Today');
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useDashboardQuery();
  const [creating, setCreating] = useState(false);
  const high = data?.attention.filter((a) => a.severity === 'HIGH').length ?? 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={
          <>
            {greeting()}, <span className="accent-serif">{user?.name.split(' ')[0]}</span>
          </>
        }
        description={
          data
            ? [
                data.attention.length
                  ? `${data.attention.length} ${data.attention.length === 1 ? 'thing needs' : 'things need'} a decision${high ? `, ${high} of them now` : ''}`
                  : 'Nothing needs a decision right now',
                `${data.stats.awaitingMyReview} awaiting your review`,
                `${data.stats.myOpenTasks} open ${data.stats.myOpenTasks === 1 ? 'task' : 'tasks'} of yours${data.stats.myOverdueTasks ? ` (${data.stats.myOverdueTasks} overdue)` : ''}`,
                `${data.stats.completedThisWeek} approved this week`,
              ].join(' · ') + '.'
            : undefined
        }
        actions={
          <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="mt-8 space-y-10">
        <PendingInvitations />

        {isLoading ? (
          <>
            <Skeleton className="h-[340px]" />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </>
        ) : isError || !data ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load Mission Control" />
        ) : (
          <>
            <section aria-labelledby="skyline-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Your portfolio, as built</p>
                  <h2 id="skyline-heading" className="mt-2 font-display text-[26px] leading-tight font-extralight tracking-[-0.03em] text-ink">
                    {data.projects.length} active {data.projects.length === 1 ? 'project' : 'projects'} <span className="text-accent-display">in bronze and stone</span>
                  </h2>
                </div>
                <p className="hidden max-w-sm text-right text-xs leading-relaxed text-muted md:block">
                  One tower per project, one layer per status. Bronze is approved work; a red sleeve is overdue work. Drag to turn it; click a tower or a row to open the project.
                </p>
              </div>
              {data.projects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No active projects"
                  description="Your projects appear here as towers you can turn and open."
                  action={
                    <Button size="sm" leftIcon={<Plus />} onClick={() => setCreating(true)}>
                      Create one
                    </Button>
                  }
                />
              ) : (
                <Suspense fallback={<Skeleton className="h-[340px]" />}>
                  <PortfolioSkylineCanvas projects={data.projects} />
                </Suspense>
              )}
            </section>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-12">
                <section aria-labelledby="attention-heading">
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">What needs attention</p>
                      <h2 id="attention-heading" className="mt-2 font-display text-[26px] leading-tight font-extralight tracking-[-0.03em] text-ink">
                        {data.attention.length === 0 ? (
                          'All clear'
                        ) : (
                          <>
                            {data.attention.length} {data.attention.length === 1 ? 'thing' : 'things'} <span className="text-accent-display">to decide</span>
                          </>
                        )}
                      </h2>
                    </div>
                    <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
                      Each item says which rule raised it and links to the record. Nothing here is estimated.
                    </p>
                  </div>
                  {data.attention.length ? (
                    <AttentionList items={data.attention} />
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="Nothing needs a decision"
                      description="No reviews waiting, nothing overdue, no requested changes and no project or milestone at risk."
                      compact
                    />
                  )}
                </section>

                <section aria-labelledby="next-heading">
                  <div className="mb-3 flex items-end justify-between border-b border-ink/80 pb-2">
                    <h2 id="next-heading" className="caps text-ink">
                      Up next for you
                    </h2>
                    <Link to="/my-tasks" className="text-xs font-medium text-accent hover:underline">
                      All my tasks
                    </Link>
                  </div>
                  {data.myTasks.length ? (
                    <MiniTaskList tasks={data.myTasks} showProject />
                  ) : (
                    <EmptyState icon={Sparkles} title="Nothing assigned to you" description="Open tasks assigned to you appear here, soonest due first." compact />
                  )}
                </section>

              </div>

              <aside className="space-y-10">
                <section aria-labelledby="proven-heading">
                  <div className="mb-1 border-b border-ink/80 pb-2">
                    <h2 id="proven-heading" className="caps text-ink">
                      Proven done
                    </h2>
                    <p className="mt-1 text-xs text-muted">Approved in the last 14 days, and the evidence it was approved on.</p>
                  </div>
                  {data.recentlyApproved.length ? (
                    <ApprovedList items={data.recentlyApproved} />
                  ) : (
                    <p className="py-4 text-[13px] text-muted">Nothing was approved in the last 14 days.</p>
                  )}
                </section>

                <section aria-labelledby="upcoming-heading">
                  <h2 id="upcoming-heading" className="caps border-b border-ink/80 pb-2 text-ink">
                    Next three weeks
                  </h2>
                  {data.upcoming.length ? (
                    <ul className="divide-y divide-line">
                      {data.upcoming.map((u) => {
                        const n = daysUntil(u.date);
                        return (
                          <li key={`${u.type}-${u.id}`}>
                            <Link to={u.link} className="flex items-center gap-4 py-3 transition-colors hover:bg-surface-2/60">
                              <span className={cn('w-10 shrink-0 text-center leading-none', u.overdue ? 'text-danger' : n <= 2 ? 'text-warning' : 'text-ink')}>
                                <span className="numeral block text-[26px]">{u.date.slice(8)}</span>
                                <span className="caps mt-1 block text-[9px] text-muted">{new Date(`${u.date}T00:00:00`).toLocaleString('en', { month: 'short' })}</span>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1 truncate text-[13px] text-ink">
                                  {u.type === 'MILESTONE' && <Flag className="size-3.5 shrink-0 text-accent" aria-label="Milestone" />}
                                  <span className="truncate">{u.title}</span>
                                </span>
                                <span className="block truncate text-xs text-muted">
                                  {u.projectName} · {u.overdue ? <span className="text-danger">overdue</span> : formatDueDate(u.date)}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="py-4 text-[13px] text-muted">No deadlines or milestones in the next three weeks.</p>
                  )}
                </section>

              </aside>
            </div>
          </>
        )}
      </div>
      <ProjectFormDialog open={creating} onOpenChange={setCreating} onSaved={(p) => navigate(`/projects/${p.id}`)} />
    </PageContainer>
  );
}

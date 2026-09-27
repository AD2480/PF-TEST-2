import { BarChart3, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useProjectsQuery } from '@/api/endpoints';
import { HealthBadge, ProjectMark, ProjectStatusBadge } from '@/components/domain';
import { PageContainer } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { HealthRulesDialog } from '@/features/analytics/HealthCard';
import { ProjectAnalyticsView } from '@/features/analytics/ProjectAnalyticsView';
import { formatDate } from '@/lib/dates';
import { useDocumentTitle, useUrlState } from '@/lib/hooks';

export function AnalyticsPage() {
  useDocumentTitle('Reports');
  const { data, isLoading, isError, error, refetch } = useProjectsQuery({ size: 100 });
  const [f, setF] = useUrlState({ project: '' });
  const [rulesOpen, setRulesOpen] = useState(false);
  const projects = data?.content ?? [];
  const selected = projects.find((p) => String(p.id) === f.project) ?? projects.find((p) => p.status === 'ACTIVE') ?? projects[0];

  return (
    <PageContainer wide>
      <PageHeader eyebrow="Reports"
        title="Across your projects"
        description="Progress, workload and trends calculated from your project records."
        actions={
          <Button variant="secondary" leftIcon={<Info />} onClick={() => setRulesOpen(true)}>
            Health rules
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Create a project and add tasks to see analytics." action={<Link to="/projects" className="text-sm font-medium text-accent hover:underline">Go to projects</Link>} />
      ) : (
        <div className="mt-6 space-y-8">
          <Card>
            <CardHeader title="Portfolio overview" description="All projects you are a member of" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead className="bg-surface-2/60 text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Project</th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold">Health</th>
                    <th scope="col" className="w-56 px-3 py-2.5 text-left font-semibold">Progress</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Open</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Overdue</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {projects.map((p) => (
                    <tr key={p.id} className={selected?.id === p.id ? 'bg-brand-soft/30' : undefined}>
                      <td className="px-5 py-2.5">
                        <button type="button" onClick={() => setF({ project: String(p.id) })} className="flex items-center gap-2.5 text-left font-medium text-ink hover:text-accent">
                          <ProjectMark name={p.name} color={p.color} size="sm" />
                          {p.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">{p.status === 'ACTIVE' ? <HealthBadge health={p.health} /> : <ProjectStatusBadge status={p.status} />}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={p.progress} color={p.color} label={`${p.name} progress`} />
                          <span className="w-9 text-right text-xs tabular">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">{p.taskCounts.total - p.taskCounts.done}</td>
                      <td className={`px-3 py-2.5 text-right tabular ${p.taskCounts.overdue ? 'font-semibold text-danger' : ''}`}>{p.taskCounts.overdue}</td>
                      <td className="px-5 py-2.5 text-right text-muted">{formatDate(p.deadline, 'd MMM yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selected && (
            <section aria-labelledby="project-analytics-heading" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="project-analytics-heading" className="flex items-center gap-2.5 text-base font-semibold text-ink">
                  <ProjectMark name={selected.name} color={selected.color} size="sm" />
                  {selected.name}
                </h2>
                <Select aria-label="Choose project" value={selected.id} onChange={(e) => setF({ project: e.target.value })} className="w-full sm:w-64">
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <ProjectAnalyticsView key={selected.id} projectId={selected.id} color={selected.color} showExpected={selected.status === 'ACTIVE'} />
            </section>
          )}
        </div>
      )}
      <HealthRulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </PageContainer>
  );
}

import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { useProjectQuery } from '@/api/endpoints';
import { errorStatus } from '@/api/errors';
import type { Health, ProjectStatus, Role } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import type { ProjectOutletContext } from '@/features/projects/projectContext';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { useDocumentTitle } from '@/lib/hooks';
import { can } from '@/lib/permissions';
import { NotFoundPage } from '../NotFoundPage';

/**
 * Six chapters instead of eleven tabs. Each chapter owns one or more existing routes; chapters
 * with several routes show them as modes underneath (e.g. Work: Board · List).
 */
interface Chapter {
  numeral: string;
  label: string;
  /** Where the chapter link goes. */
  to: string;
  /** Route segments (first segment after /projects/:id) that belong to this chapter. */
  segments: string[];
  modes?: { to: string; label: string }[];
}

const CHAPTERS: Chapter[] = [
  {
    numeral: 'I',
    label: 'Overview',
    to: '',
    segments: ['', 'analytics', 'activity'],
    modes: [
      { to: '', label: 'Summary' },
      { to: 'analytics', label: 'Analytics' },
      { to: 'activity', label: 'Activity' },
    ],
  },
  {
    numeral: 'II',
    label: 'Work',
    to: 'board',
    segments: ['board', 'tasks'],
    modes: [
      { to: 'board', label: 'Board' },
      { to: 'tasks', label: 'List' },
    ],
  },
  { numeral: 'III', label: 'Model', to: 'model', segments: ['model'] },
  {
    numeral: 'IV',
    label: 'Schedule',
    to: 'timeline',
    segments: ['timeline', 'map', 'plan', 'milestones'],
    modes: [
      { to: 'timeline', label: 'Timeline' },
      { to: 'map', label: 'Dependencies' },
      { to: 'plan', label: 'What if' },
      { to: 'milestones', label: 'Milestones' },
    ],
  },
  { numeral: 'V', label: 'People', to: 'team', segments: ['team'] },
  { numeral: 'VI', label: 'Settings', to: 'settings', segments: ['settings'] },
];

const HEALTH_WORD: Record<Health, string> = {
  NOT_STARTED: 'Not started',
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  OFF_TRACK: 'Off track',
  COMPLETED: 'Completed',
};

const STATUS_WORD: Record<ProjectStatus, string> = { ACTIVE: 'Active', ON_HOLD: 'On hold', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
const ROLE_WORD: Record<Role, string> = { OWNER: 'Owner', MANAGER: 'Manager', MEMBER: 'Member', VIEWER: 'Viewer' };

export function ProjectLayout() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: project, isLoading, isError, error, refetch } = useProjectQuery(id, { skip: !Number.isFinite(id) });
  const [newTask, setNewTask] = useState<{ open: boolean; defaults?: Parameters<ProjectOutletContext['openNewTask']>[0] }>({ open: false });
  useDocumentTitle(project?.name);

  if (!Number.isFinite(id)) return <NotFoundPage />;

  if (isLoading) {
    return (
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-3 w-full max-w-xl" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    const status = errorStatus(error);
    if (status === 404) return <NotFoundPage title="Project not found" description="It may have been deleted, or the link is wrong." />;
    if (status === 403) {
      return (
        <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
          <p className="eyebrow">No access</p>
          <h1 className="mt-3 font-display text-[34px] font-light tracking-[-0.03em] text-ink">You aren’t a member of this project.</h1>
          <p className="mt-2 text-[14px] text-muted">Ask the owner or a manager to invite you.</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/projects')}>
            Back to projects
          </Button>
        </div>
      );
    }
    return <ErrorState error={error} onRetry={refetch} className="min-h-[60vh]" />;
  }

  const context: ProjectOutletContext = {
    project,
    openNewTask: (defaults) => setNewTask({ open: true, defaults }),
  };

  // Which chapter and mode are we in? Task pages (/tasks/:id…) belong to Work but no mode.
  const rest = location.pathname.replace(`/projects/${project.id}`, '').replace(/^\//, '');
  const segments = rest.split('/');
  const first = segments[0] ?? '';
  const deep = first === 'tasks' && segments.length > 1 && segments[1] !== '';
  const chapter = CHAPTERS.find((c) => c.segments.includes(first)) ?? CHAPTERS[0];
  const base = `/projects/${project.id}`;
  const expected = project.status === 'ACTIVE' ? project.expectedProgress : null;
  const TitleTag = deep ? 'p' : 'h1';

  return (
    <div>
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className={cn('flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between', deep ? 'pt-5 pb-4' : 'pt-8 pb-6')}>
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="caps flex items-center gap-2 text-muted">
                <Link to="/projects" className="hover:text-ink">
                  Projects
                </Link>
                <span aria-hidden="true">/</span>
                <span className="font-mono tracking-normal text-ink-2">{project.key}</span>
              </nav>
              <TitleTag
                className={cn(
                  'mt-3 font-display font-light tracking-[-0.035em] break-words text-ink',
                  deep ? 'text-[22px] leading-tight' : 'text-[34px] leading-[1.05] sm:text-[46px]',
                )}
              >
                {deep ? <Link to={base}>{project.name}</Link> : project.name}
              </TitleTag>
              {!deep && (
                <p className="caps mt-4 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  <span className={project.health === 'OFF_TRACK' ? 'text-danger' : project.health === 'AT_RISK' ? 'text-warning' : 'text-ink'}>
                    {project.status === 'ACTIVE' ? HEALTH_WORD[project.health] : STATUS_WORD[project.status]}
                  </span>
                  <span>{ROLE_WORD[project.myRole]}</span>
                  <span>
                    {formatDate(project.startDate, 'd MMM')} — {project.deadline ? formatDate(project.deadline, 'd MMM yyyy') : 'No deadline'}
                  </span>
                  <span>{project.memberCount} people</span>
                </p>
              )}
            </div>
            <div className="flex items-end gap-6">
              {!deep && (
                <div className="w-44" aria-label={`${project.progress}% of tasks approved${expected !== null ? `, ${expected}% expected by today` : ''}`}>
                  <p className="numeral text-[40px] leading-none text-ink">
                    {project.progress}
                    <span className="text-[20px] text-muted">%</span>
                  </p>
                  <div className="relative mt-2 h-px bg-line-strong" aria-hidden="true">
                    <div className="absolute inset-y-[-1px] left-0 bg-accent" style={{ width: `${project.progress}%` }} />
                    {expected !== null && <div className="absolute -top-1.5 h-3.5 w-px bg-ink" style={{ left: `${expected}%` }} title={`Expected by today: ${expected}%`} />}
                  </div>
                  <p className="caps mt-2 text-[9.5px] text-muted">Approved{expected !== null ? ` · expected ${expected}%` : ''}</p>
                </div>
              )}
              {can.createTask(project.myRole) && project.status !== 'ARCHIVED' && <Button onClick={() => setNewTask({ open: true })}>New task</Button>}
            </div>
          </div>

          <nav className="scrollbar-thin -mx-4 flex gap-7 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Project chapters">
            {CHAPTERS.map((c) => {
              const active = c === chapter;
              return (
                <Link
                  key={c.label}
                  to={c.to ? `${base}/${c.to}` : base}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'caps relative flex h-11 shrink-0 items-center gap-2 transition-colors',
                    active ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent' : 'text-muted hover:text-ink',
                  )}
                >
                  <span className="font-mono text-[10px] tracking-normal text-subtle">{c.numeral}</span>
                  {c.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {chapter.modes && !deep && (
        <div className="border-b border-line bg-surface/60">
          <nav className="mx-auto flex max-w-[1600px] gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label={`${chapter.label} views`}>
            {chapter.modes.map((m) => (
              <NavLink
                key={m.label}
                to={m.to ? `${base}/${m.to}` : base}
                end={m.to === '' || m.to === 'tasks'}
                className={({ isActive }) =>
                  cn('flex h-10 shrink-0 items-center text-[13px] transition-colors', isActive ? 'text-ink underline decoration-accent underline-offset-[14px]' : 'text-muted hover:text-ink')
                }
              >
                {m.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Keyed by project so per-project page state (e.g. saved plan scenarios) never carries over. */}
      <Suspense fallback={<div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8"><Skeleton className="h-96" /></div>}>
        <Outlet key={context.project.id} context={context} />
      </Suspense>

      <TaskFormDialog open={newTask.open} onOpenChange={(open) => setNewTask((s) => ({ ...s, open }))} project={project} defaults={newTask.defaults} />
    </div>
  );
}

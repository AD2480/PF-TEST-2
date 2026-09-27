import { ArrowRight, GitFork, List, Network, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useDependenciesQuery } from '@/api/endpoints';
import type { Dependency, DependencyTask } from '@/api/types';
import { DueDate, StatusBadge } from '@/components/domain';
import { Avatar } from '@/components/ui/Avatar';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useProjectContext } from '@/features/projects/projectContext';
import { cn } from '@/lib/cn';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/constants';
import { buildIndex, downstream, layoutGraph, longestOpenChain, upstream, type GraphNode } from '@/lib/dependencies';
import { useDocumentTitle, useUrlState } from '@/lib/hooks';

const NODE_W = 212;
const NODE_H = 68;
const GAP_X = 76;
const GAP_Y = 18;
const PAD = 24;

const nodeX = (n: GraphNode) => PAD + n.layer * (NODE_W + GAP_X);
const nodeY = (n: GraphNode) => PAD + n.row * (NODE_H + GAP_Y);

function edgeTone(d: Dependency): 'late' | 'done' | 'open' {
  if (d.blocker.status === 'DONE') return 'done';
  if (d.blocker.overdue && d.blocked.status !== 'DONE') return 'late';
  return 'open';
}

/** A titled list of related tasks in the inspector. */
function TaskListSection({ title, items }: { title: string; items: DependencyTask[] }) {
  return (
    <section>
      <h3 className="caps mb-1 text-[10px] text-muted">{title}</h3>
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-2 text-[13px]">
              <span className="font-mono text-xs text-muted">{t.key}</span>
              <span className={cn('min-w-0 flex-1 truncate', t.status === 'DONE' ? 'text-muted line-through' : 'text-ink')}>{t.title}</span>
              {t.overdue && <span className="text-xs font-medium text-danger">Overdue</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-[13px] text-muted">None.</p>
      )}
    </section>
  );
}

/** Side panel for the selected task: what it waits on and what waits on it. */
function Inspector({ task, deps, projectId, onClose }: { task: DependencyTask; deps: Dependency[]; projectId: number; onClose: () => void }) {
  const waiting = deps.filter((d) => d.blocked.id === task.id).map((d) => d.blocker);
  const holding = deps.filter((d) => d.blocker.id === task.id).map((d) => d.blocked);
  return (
    <aside className="border border-line bg-surface p-5 lg:sticky lg:top-20" aria-label={`${task.key} dependencies`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted">{task.key}</p>
          <h2 className="mt-1 text-[17px] leading-snug font-light text-ink">{task.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Close details">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={task.status} />
        <DueDate date={task.dueDate} done={task.status === 'DONE'} className="text-xs" />
        {task.assignee && (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Avatar user={task.assignee} size="sm" /> {task.assignee.name}
          </span>
        )}
      </div>
      <div className="mt-5 space-y-4">
        <TaskListSection title="Waiting on" items={waiting} />
        <TaskListSection title="Holding up" items={holding} />
      </div>
      <Link to={`/projects/${projectId}/tasks/${task.id}`} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
        Open task <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}

/**
 * Interactive dependency map. Columns are "how many tasks must finish first", so every
 * arrow points right. Hover or focus a task to trace what it waits on and what waits on
 * it; select it for details. A list view offers the same information without the drawing.
 */
export function DependencyMapPage() {
  const { project } = useProjectContext();
  useDocumentTitle(`${project.name} · Map`);
  const [f, setF] = useUrlState({ view: 'map', done: '', focus: '' });
  const hideDone = f.done !== 'show';
  const { data: deps, isLoading, isError, error, refetch } = useDependenciesQuery(project.id);
  const [hover, setHover] = useState<number | null>(null);
  const selected = f.focus ? Number(f.focus) : null;
  const scroller = useRef<HTMLDivElement>(null);

  const graph = useMemo(() => layoutGraph(deps ?? [], { hideDone }), [deps, hideDone]);
  const chain = useMemo(() => longestOpenChain(deps ?? []), [deps]);
  const index = useMemo(() => buildIndex(deps ?? []), [deps]);
  const active = hover ?? selected;
  const related = useMemo(() => {
    if (active === null || !deps) return null;
    return { up: upstream(deps, active), down: downstream(deps, active) };
  }, [active, deps]);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.task.id, n])), [graph]);
  const selectedTask = selected !== null ? (nodeById.get(selected)?.task ?? deps?.flatMap((d) => [d.blocker, d.blocked]).find((t) => t.id === selected)) : undefined;

  // Scroll a task focused from elsewhere (e.g. the task page's "Map" link) into view once,
  // as soon as its node exists — not on every click or background refetch.
  const scrolledFor = useRef<number | null>(null);
  useEffect(() => {
    if (!selected || !scroller.current || scrolledFor.current === selected) return;
    const node = scroller.current.querySelector<HTMLElement>(`[data-node="${selected}"]`);
    if (!node) return;
    scrolledFor.current = selected;
    node.scrollIntoView({ block: 'center', inline: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [selected, graph]);

  const width = graph.layers ? PAD * 2 + graph.layers * NODE_W + (graph.layers - 1) * GAP_X : 0;
  const height = graph.rows ? PAD * 2 + graph.rows * NODE_H + (graph.rows - 1) * GAP_Y : 0;
  const isRelated = (id: number) => !related || id === active || related.up.has(id) || related.down.has(id);
  const edgeOn = (d: Dependency) => {
    if (!related || active === null) return true;
    const upSet = new Set([...related.up, active]);
    const downSet = new Set([...related.down, active]);
    return (upSet.has(d.blocker.id) && upSet.has(d.blocked.id)) || (downSet.has(d.blocker.id) && downSet.has(d.blocked.id));
  };
  const select = (id: number | null) => setF({ focus: id === null ? '' : String(id) });

  const openTasks = new Set((deps ?? []).flatMap((d) => [d.blocker, d.blocked]).filter((t) => t.status !== 'DONE').map((t) => t.id));
  const lateEdges = (deps ?? []).filter((d) => edgeTone(d) === 'late').length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">What’s blocking</p>
          <h2 className="mt-2 font-display text-[26px] leading-tight font-extralight tracking-[-0.03em] text-ink">
            {deps?.length ?? 0} {deps?.length === 1 ? 'dependency' : 'dependencies'}
            {lateEdges > 0 && <span className="text-danger"> · {lateEdges} behind an overdue task</span>}
          </h2>
          {chain.length > 0 && (
            <p className="mt-2 max-w-3xl text-[13px] text-ink-2">
              Longest chain of unfinished work: {chain.map((t) => t.key).join(' → ')}{' '}
              <span className="text-muted">
                ({chain.length} tasks in a row, counted by tasks, not by duration — so this is not a critical path. Estimated finish dates are on the Plan tab.)
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="View"
            value={f.view === 'list' ? 'list' : 'map'}
            onChange={(v) => setF({ view: v })}
            options={[
              { value: 'map', label: 'Map', icon: <Network /> },
              { value: 'list', label: 'List', icon: <List /> },
            ]}
          />
          <label className="flex h-9 items-center gap-2 border border-line-strong bg-surface px-3 text-[13px] text-ink">
            <input type="checkbox" checked={!hideDone} onChange={(e) => setF({ done: e.target.checked ? 'show' : '' })} className="size-4 accent-[var(--brand)]" />
            Show finished links
          </label>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !deps || deps.length === 0 ? (
        <EmptyState
          icon={GitFork}
          title="No dependencies yet"
          description="Open a task and use “Add a blocker” to record what has to finish first. The map, the board and Mission Control will then show what’s blocked and why."
        />
      ) : f.view === 'list' ? (
        <DependencyList deps={deps} hideDone={hideDone} projectId={project.id} openIds={openTasks} index={index} />
      ) : graph.nodes.length === 0 ? (
        <EmptyState icon={GitFork} title="All linked work is finished" description="Tick “Show finished links” to see completed dependencies." />
      ) : (
        <div className={cn('grid gap-6', selectedTask && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
          <div className="min-w-0">
            <div ref={scroller} className="scrollbar-thin overflow-auto border border-line bg-surface" style={{ maxHeight: '70vh' }}>
              <div className="relative" style={{ width, height }} onMouseLeave={() => setHover(null)}>
                <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
                  <defs>
                    {(['open', 'late', 'done'] as const).map((tone) => (
                      <marker key={tone} id={`arrow-${tone}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L8,4 L0,8 z" fill={tone === 'late' ? 'var(--danger)' : tone === 'done' ? 'var(--line-strong)' : 'var(--ink-2)'} />
                      </marker>
                    ))}
                  </defs>
                  {graph.edges.map((d) => {
                    const a = nodeById.get(d.blocker.id);
                    const b = nodeById.get(d.blocked.id);
                    if (!a || !b) return null;
                    const x1 = nodeX(a) + NODE_W;
                    const y1 = nodeY(a) + NODE_H / 2;
                    const x2 = nodeX(b) - 2;
                    const y2 = nodeY(b) + NODE_H / 2;
                    const mid = (x1 + x2) / 2;
                    const tone = edgeTone(d);
                    return (
                      <path
                        key={d.id}
                        d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                        fill="none"
                        stroke={tone === 'late' ? 'var(--danger)' : tone === 'done' ? 'var(--line-strong)' : 'var(--ink-2)'}
                        strokeWidth={tone === 'late' ? 1.75 : 1.1}
                        strokeDasharray={tone === 'done' ? '3 3' : undefined}
                        markerEnd={`url(#arrow-${tone})`}
                        opacity={edgeOn(d) ? 1 : 0.12}
                        style={{ transition: 'opacity 150ms' }}
                      />
                    );
                  })}
                </svg>
                {graph.nodes.map((n) => {
                  const t = n.task;
                  const waiting = (index.blockersOf.get(t.id) ?? []).filter((d) => d.blocker.status !== 'DONE').length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-node={t.id}
                      onMouseEnter={() => setHover(t.id)}
                      onFocus={() => setHover(t.id)}
                      onBlur={() => setHover(null)}
                      onClick={() => {
                        scrolledFor.current = t.id; // it's on screen already: don't scroll
                        select(selected === t.id ? null : t.id);
                      }}
                      aria-pressed={selected === t.id}
                      aria-label={`${t.key} ${t.title}, ${STATUS_LABEL[t.status]}${t.overdue ? ', overdue' : ''}${waiting ? `, waiting on ${waiting}` : ''}`}
                      className={cn(
                        'absolute flex flex-col justify-between border bg-surface py-2 pr-2.5 pl-3.5 text-left transition-opacity',
                        t.overdue ? 'border-danger' : 'border-line-strong',
                        selected === t.id && 'ring-2 ring-accent',
                        !isRelated(t.id) && 'opacity-25',
                      )}
                      style={{ left: nodeX(n), top: nodeY(n), width: NODE_W, height: NODE_H }}
                    >
                      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: STATUS_COLOR[t.status] }} aria-hidden="true" />
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted">{t.key}</span>
                        <span className="text-[10px] text-muted">{STATUS_LABEL[t.status]}</span>
                      </span>
                      <span className={cn('line-clamp-1 text-[13px] text-ink', t.status === 'DONE' && 'text-muted line-through')}>{t.title}</span>
                      <span className="flex items-center justify-between gap-2 text-[11px]">
                        <DueDate date={t.dueDate} done={t.status === 'DONE'} className="text-[11px]" showIcon={false} />
                        <Avatar user={t.assignee} size="sm" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-6 bg-ink-2" aria-hidden="true" /> must finish first
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-6 bg-danger" aria-hidden="true" /> blocker is overdue
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-6 border-t border-dashed border-line-strong" aria-hidden="true" /> blocker finished
              </span>
              <span>Hover or focus a task to trace its chain. Select it for details.</span>
            </p>
          </div>
          {selectedTask && <Inspector task={selectedTask} deps={deps} projectId={project.id} onClose={() => select(null)} />}
        </div>
      )}
    </div>
  );
}

/** Accessible alternative to the drawing: every task with what it waits on and what it holds up. */
function DependencyList({ deps, hideDone, projectId, openIds, index }: { deps: Dependency[]; hideDone: boolean; projectId: number; openIds: Set<number>; index: ReturnType<typeof buildIndex> }) {
  const tasks = new Map<number, DependencyTask>();
  for (const d of deps) {
    tasks.set(d.blocker.id, d.blocker);
    tasks.set(d.blocked.id, d.blocked);
  }
  const rows = [...tasks.values()]
    .filter((t) => !hideDone || openIds.has(t.id))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  const keysOf = (list: Dependency[] | undefined, side: 'blocker' | 'blocked') =>
    (list ?? []).map((d) => d[side]).filter((t) => !hideDone || t.status !== 'DONE');
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-line">
          <tr className="caps text-[10px] text-muted">
            <th className="px-4 py-3 font-semibold">Task</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Waiting on</th>
            <th className="px-4 py-3 font-semibold">Holding up</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => (
            <tr key={t.id} className="align-top">
              <td className="px-4 py-3">
                <Link to={`/projects/${projectId}/tasks/${t.id}`} className="hover:text-accent">
                  <span className="mr-2 font-mono text-xs text-muted">{t.key}</span>
                  {t.title}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={t.status} />
                {t.overdue && <span className="ml-2 text-xs font-medium text-danger">Overdue</span>}
              </td>
              {(['blockersOf', 'blocking'] as const).map((k) => {
                const list = keysOf(index[k].get(t.id), k === 'blockersOf' ? 'blocker' : 'blocked');
                return (
                  <td key={k} className="px-4 py-3">
                    {list.length ? (
                      <ul className="space-y-0.5">
                        {list.map((x) => (
                          <li key={x.id} className={cn('font-mono text-xs', x.overdue ? 'text-danger' : x.status === 'DONE' ? 'text-muted line-through' : 'text-ink-2')}>
                            {x.key}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

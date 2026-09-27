import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ProjectSummary } from '@/api/types';
import { cn } from '@/lib/cn';
import { PortfolioSkyline, type SkylineProject } from '@/three/PortfolioSkyline';
import { onThemeChange, webglAvailable } from '@/three/sceneUtils';

/**
 * Today's portfolio skyline with its text equivalent: every tower is also a row in the list,
 * and pointing at either highlights both. Clicking a tower or a row opens the project.
 */
export default function PortfolioSkylineCanvas({ projects, className }: { projects: ProjectSummary[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const skyline = useRef<PortfolioSkyline | null>(null);
  const navigate = useNavigate();
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const canRender = useMemo(() => webglAvailable(), []);
  const data = useMemo<SkylineProject[]>(
    () =>
      projects.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        todo: p.taskCounts.todo,
        inProgress: p.taskCounts.inProgress,
        inReview: p.taskCounts.inReview,
        done: p.taskCounts.done,
        overdue: p.taskCounts.overdue,
      })),
    [projects],
  );

  useEffect(() => {
    if (!canRender || !host.current) return;
    const s = new PortfolioSkyline(
      host.current,
      (id, x, y) => {
        setHover(id === null ? null : { id, x, y });
        setActive(id);
      },
      (id) => navigate(`/projects/${id}`),
    );
    skyline.current = s;
    const stop = onThemeChange(() => s.refreshTheme());
    return () => {
      stop();
      s.dispose();
      skyline.current = null;
    };
  }, [canRender, navigate]);

  useEffect(() => skyline.current?.setProjects(data), [data]);

  const hovered = hover ? projects.find((p) => p.id === hover.id) : undefined;
  const point = (id: number | null) => {
    setActive(id);
    skyline.current?.highlight(id);
  };

  return (
    <div className={cn('grid gap-px border border-line bg-line lg:grid-cols-[minmax(0,1fr)_340px]', className)}>
      {canRender && <div ref={host} className="relative h-[340px] bg-surface" aria-hidden="true" />}
      <ol className={cn('divide-y divide-line bg-surface', !canRender && 'lg:col-span-2')}>
        {projects.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => navigate(`/projects/${p.id}`)}
              onMouseEnter={() => point(p.id)}
              onMouseLeave={() => point(null)}
              onFocus={() => point(p.id)}
              onBlur={() => point(null)}
              className={cn('flex w-full items-baseline gap-4 px-5 py-3 text-left transition-colors', active === p.id ? 'bg-surface-2' : 'hover:bg-surface-2')}
            >
              <span className="w-6 shrink-0 font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-ink">{p.name}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {p.taskCounts.done}/{p.taskCounts.total} approved
                  {p.taskCounts.overdue > 0 && <span className="text-danger"> · {p.taskCounts.overdue} overdue</span>}
                </span>
              </span>
              <span className="numeral text-[22px] text-ink-2">{p.progress}%</span>
            </button>
          </li>
        ))}
      </ol>
      {hovered && hover && (
        <div className="pointer-events-none fixed z-50 border border-line bg-surface px-3 py-2 shadow-pop" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <p className="font-mono text-[11px] text-muted">{hovered.key}</p>
          <p className="text-[13px] font-medium text-ink">{hovered.name}</p>
          <p className="mt-1 text-xs text-muted">
            {hovered.taskCounts.done} approved · {hovered.taskCounts.inReview} in review · {hovered.taskCounts.inProgress} in progress · {hovered.taskCounts.todo} not started
          </p>
        </div>
      )}
    </div>
  );
}

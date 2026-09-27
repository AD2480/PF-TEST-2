import { Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskStatus } from '@/api/types';
import { cn } from '@/lib/cn';
import { STATUS_LABEL } from '@/lib/constants';
import { blockStateAt, countsAt, dayToIso, statusAt, type ModelBlock, type ProjectModel } from '@/three/projectModel';
import { ProjectModelScene } from '@/three/ProjectModelScene';
import { onThemeChange, prefersReducedMotion, webglAvailable } from '@/three/sceneUtils';
import { HistoryForecastChart } from '@/features/model/HistoryForecastChart';
import { buildSampleModel, SAMPLE_PROJECT, sampleSummary } from './sampleProject';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function short(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const MATERIAL: Record<TaskStatus, string> = {
  TODO: 'Not started',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Approved',
};

/** Replay speed and pauses for the looping exhibit. */
const PLAY_MS = 16_000;
const HOLD_AT_TODAY_MS = 1_600;
const HOLD_AT_END_MS = 3_200;

export interface SampleModelExhibitProps {
  /** Loop the replay by itself. Never for reduced motion; paused while off-screen. */
  autoPlay?: boolean;
  /** A scrubber so the reader can move through time themselves. */
  scrubber?: boolean;
  legend?: boolean;
  /** The history-and-forecast graph under the model, synced with the replay. */
  chart?: boolean;
  /** Small caps label in the top bar. */
  label?: string;
  className?: string;
}

/**
 * The sample project as a small exhibit: the same 3D model as a project's Model page, replaying
 * its six weeks from the record and then the scheduler's estimate. Dragging turns it; the page
 * keeps the wheel and touch scrolling. Hover reads a block; clicking traces what it waits on.
 */
export default function SampleModelExhibit({ autoPlay = true, scrubber = false, legend = true, chart = true, label, className }: SampleModelExhibitProps) {
  const model = useMemo(() => buildSampleModel(), []);
  const canRender = useMemo(() => webglAvailable(), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const byId = useMemo(() => new Map(model.blocks.map((b) => [b.id, b])), [model]);
  const start = useMemo(() => Math.max(0, Math.min(...model.blocks.map((b) => b.createdDay)) - 0.5), [model]);
  const end = Math.max(model.todayDay, model.projectionEnd ?? model.todayDay);

  const frame = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ProjectModelScene | null>(null);
  const [day, setDay] = useState(autoPlay && !reduced ? start : model.todayDay);
  const [playing, setPlaying] = useState(autoPlay && !reduced);
  const [onScreen, setOnScreen] = useState(true);
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!canRender || !host.current) return;
    const s = new ProjectModelScene(
      host.current,
      {
        onHover: (id, x, y) => setHover(id === null ? null : { id, x, y }),
        onSelect: (id) => setSelected(id),
      },
      'exhibit',
    );
    s.setModel(model);
    scene.current = s;
    const stop = onThemeChange(() => s.refreshTheme());
    return () => {
      stop();
      s.dispose();
      scene.current = null;
    };
  }, [canRender, model]);

  useEffect(() => scene.current?.setTime(day), [day]);
  useEffect(() => scene.current?.setSelected(selected), [selected]);

  // Only animate while at least a tenth of the exhibit is on screen.
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The replay: start → a short pause at today → the estimate → a pause at the end → (loop).
  const dayRef = useRef(day);
  dayRef.current = day;
  useEffect(() => {
    if (!playing || !onScreen) return;
    let raf = 0;
    let last = performance.now();
    let holdUntil = 0;
    let afterHold: 'continue' | 'restart' = 'continue';
    const rate = (end - start) / PLAY_MS;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (holdUntil) {
        if (now >= holdUntil) {
          holdUntil = 0;
          if (afterHold === 'restart') {
            dayRef.current = start;
            setDay(start);
          }
        }
      } else {
        const prev = dayRef.current;
        let next = Math.min(end, prev + dt * rate);
        if (prev < model.todayDay && next >= model.todayDay) {
          next = model.todayDay;
          holdUntil = now + HOLD_AT_TODAY_MS;
          afterHold = 'continue';
        }
        if (next >= end) {
          if (!autoPlay) {
            dayRef.current = end;
            setDay(end);
            setPlaying(false);
            return;
          }
          holdUntil = now + HOLD_AT_END_MS;
          afterHold = 'restart';
        }
        dayRef.current = next;
        setDay(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, onScreen, start, end, autoPlay, model.todayDay]);

  const togglePlay = () => {
    if (!playing && dayRef.current >= end - 0.05) setDay(start);
    setPlaying((p) => !p);
  };

  const summary = sampleSummary(model);
  const counts = countsAt(model, day);
  // Anything after now is an estimate (the counts switch to the projection there too).
  const mode = day > model.todayDay + 1e-6 ? 'Estimate' : day < model.todayDay - 0.25 ? 'Recorded' : 'Today';
  const iso = dayToIso(model.originMs, day);
  const hovered = hover ? byId.get(hover.id) : undefined;
  const picked = selected !== null ? byId.get(selected) : undefined;

  if (!canRender) {
    return (
      <div className={cn('flex flex-col justify-end border border-line bg-surface p-6', className)}>
        <p className="caps text-muted">{label ?? 'Sample project'}</p>
        <p className="mt-3 max-w-md font-display text-xl font-light text-ink">This browser can’t draw 3D right now.</p>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">{summary}</p>
      </div>
    );
  }

  return (
    <figure ref={frame} className={cn('relative flex min-h-0 flex-col border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <p className="caps truncate text-muted">{label ?? `Sample project · ${SAMPLE_PROJECT.name}`}</p>
        <button
          type="button"
          onClick={togglePlay}
          className="caps flex shrink-0 items-center gap-1.5 text-ink hover:text-accent"
          aria-label={playing ? 'Pause the replay' : 'Play the replay'}
        >
          {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-canvas">
        <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-hidden="true" />
        {hovered && hover && <Tooltip model={model} block={hovered} day={day} x={hover.x} y={hover.y} />}
      </div>

      {chart && (
        <div className="border-t border-line px-4 pt-3">
          <HistoryForecastChart
            model={model}
            start={start}
            end={end}
            day={day}
            inset={0}
            height={104}
            onScrub={(d) => {
              setPlaying(false);
              setDay(d);
            }}
          />
        </div>
      )}

      {scrubber && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-2">
          <span className="caps w-14 shrink-0 text-muted">Time</span>
          <input
            type="range"
            min={start}
            max={end}
            step={0.05}
            value={Math.min(end, Math.max(start, day))}
            onChange={(e) => {
              setPlaying(false);
              setDay(Number(e.target.value));
            }}
            aria-label="Replay time"
            aria-valuetext={`${short(iso)}, ${mode.toLowerCase()}`}
            className="model-scrubber relative w-full"
          />
          <button type="button" onClick={() => setDay(model.todayDay)} className="caps shrink-0 text-muted hover:text-ink">
            Today
          </button>
        </div>
      )}

      <figcaption className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-line px-4 py-3">
        <p className="sr-only">{summary}</p>
        <div className="flex items-end gap-4" aria-hidden="true">
          <span className="numeral text-[32px] leading-none text-ink tabular">{short(iso)}</span>
          <span className="pb-0.5">
            <span className={cn('caps block', mode === 'Estimate' ? 'text-accent' : mode === 'Today' ? 'text-ink' : 'text-muted')}>{mode}</span>
            <span className="mt-0.5 block text-[11.5px] text-muted tabular">
              {ORDER.map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(' · ')}
            </span>
          </span>
        </div>
        {legend && (
          <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-muted" aria-label="Legend">
            {ORDER.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3.5" style={{ background: `var(--model-${s === 'TODO' ? 'todo' : s === 'IN_PROGRESS' ? 'progress' : s === 'IN_REVIEW' ? 'review' : 'done'})` }} aria-hidden="true" />
                {MATERIAL[s]}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3.5 border border-ink-2" aria-hidden="true" />
              Estimate
            </li>
          </ul>
        )}
      </figcaption>

      {picked && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-4 py-2 text-[12.5px] text-ink-2" role="status">
          <span className="font-mono text-[11px] text-muted">{picked.key}</span>
          <span className="font-medium text-ink">{picked.title}</span>
          <span className="text-muted">{traceText(model, picked, byId)}</span>
          <button type="button" onClick={() => setSelected(null)} className="caps ml-auto text-muted hover:text-ink">
            Clear
          </button>
        </div>
      )}
    </figure>
  );
}

function traceText(model: ProjectModel, block: ModelBlock, byId: Map<number, ModelBlock>): string {
  const waits = block.blockedBy.map((id) => byId.get(id)?.key).filter(Boolean);
  const unblocks = model.links.filter((l) => l.blockerId === block.id).map((l) => byId.get(l.blockedId)?.key).filter(Boolean);
  const parts = [waits.length ? `waits on ${waits.join(', ')}` : 'waits on nothing', unblocks.length ? `unblocks ${unblocks.join(', ')}` : 'unblocks nothing'];
  return parts.join(' · ');
}

function Tooltip({ model, block, day, x, y }: { model: ProjectModel; block: ModelBlock; day: number; x: number; y: number }) {
  const s = blockStateAt(block, day, model.todayDay, true);
  const status = s.status ?? statusAt(block, model.todayDay);
  const due = block.dueDay !== null ? short(dayToIso(model.originMs, block.dueDay)) : null;
  return (
    <div className="pointer-events-none fixed z-50 max-w-64 border border-line bg-surface px-3 py-2 shadow-pop" style={{ left: x + 14, top: y + 14 }}>
      <p className="font-mono text-[11px] text-muted">{block.key}</p>
      <p className="text-[13px] font-medium text-ink">{block.title}</p>
      <p className="mt-1 text-xs text-muted">
        {status ? MATERIAL[status] : 'Not created yet'}
        {s.overdue ? ' · overdue' : ''} · {block.assigneeName ?? 'Unassigned'}
        {due && status !== 'DONE' ? ` · due ${due}` : ''}
      </p>
      {s.estimated && block.projected && <p className="caps mt-1 text-accent">Estimate</p>}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { FlowSculpture, STAGES } from '@/three/FlowSculpture';
import { onThemeChange, webglAvailable } from '@/three/sceneUtils';

/**
 * The interactive sculpture on the sign-in page, with the stage names as real text beside it.
 * Pointing at a slab (or a name) highlights both. Without WebGL only the names are shown.
 */
export default function FlowSculptureCanvas({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const sculpture = useRef<FlowSculpture | null>(null);
  const [active, setActive] = useState(-1);
  const canRender = useMemo(() => webglAvailable(), []);

  useEffect(() => {
    if (!canRender || !host.current) return;
    const s = new FlowSculpture(host.current, setActive);
    sculpture.current = s;
    const stop = onThemeChange(() => s.refreshTheme());
    return () => {
      stop();
      s.dispose();
      sculpture.current = null;
    };
  }, [canRender]);

  const point = (i: number) => {
    setActive(i);
    sculpture.current?.highlight(i);
  };

  return (
    <div className={cn('grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_220px]', className)}>
      {canRender && <div ref={host} className="h-[min(40vh,380px)] w-full cursor-grab" aria-hidden="true" />}
      <ol className="space-y-3" aria-label="How work moves through ProjectFlow">
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onMouseEnter={() => point(i)}
              onMouseLeave={() => point(-1)}
              onFocus={() => point(i)}
              onBlur={() => point(-1)}
              className={cn('block w-full border-l py-1 pl-3 text-left transition-colors', active === i ? 'border-accent' : 'border-line-strong')}
            >
              <span className={cn('caps block', active === i ? 'text-accent' : 'text-ink')}>{s.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">{s.note}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

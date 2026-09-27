import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { AssistantButton } from '@/features/assistant/AssistantButton';
import { AssistantPanel } from '@/features/assistant/AssistantPanel';
import { AssistantProvider } from '@/features/assistant/AssistantProvider';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';
import { useLiveUpdates } from '@/features/live/useLiveUpdates';
import { cn } from '@/lib/cn';
import { CommandPalette } from '../CommandPalette';
import { PageSpinner } from '../ui/Spinner';
import { Masthead } from './Masthead';

/**
 * The frame around every signed-in page: a masthead and the page. No sidebar, no title bar;
 * see docs/REDESIGN.md for why.
 */
export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const live = useLiveUpdates();
  const main = useRef<HTMLElement>(null);

  // ⌘K / Ctrl+K anywhere; "/" when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // After navigating, move focus to the new page's heading so screen readers announce it and
  // keyboard users start at the top. Filters and tabs that only change ?query don't count.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      const heading = main.current?.querySelector<HTMLElement>('h1');
      const target = heading ?? main.current;
      if (!target) return;
      if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return (
    <AssistantProvider>
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[100] bg-brand px-3 py-2 text-white dark:text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Masthead onOpenSearch={() => setPaletteOpen(true)} live={live} />
      <main id="main" ref={main} className="flex-1 focus:outline-none [&_h1:focus]:outline-none" tabIndex={-1}>
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <ProjectFormDialog open={creating} onOpenChange={setCreating} onSaved={(p) => navigate(`/projects/${p.id}`)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNewProject={() => setCreating(true)} />
      <AssistantButton />
      <AssistantPanel />
    </div>
    </AssistantProvider>
  );
}

/** Standard page padding and max width, aligned with the masthead. */
export function PageContainer({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10', wide ? 'max-w-[1600px]' : 'max-w-[1600px]', className)}>{children}</div>;
}

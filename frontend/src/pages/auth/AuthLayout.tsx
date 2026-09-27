import { lazy, Suspense, type ReactNode } from 'react';
import { Link } from 'react-router';
import { PublicHeader } from '@/components/layout/PublicFrame';
import { BackendStatus } from '@/features/auth/BackendStatus';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/hooks';

// Both bring three.js, so they load after the form is already usable.
const SampleModelExhibit = lazy(() => import('@/features/public/SampleModelExhibit'));
const FlowSculptureCanvas = lazy(() => import('@/features/model/FlowSculptureCanvas'));

/**
 * Sign-in and registration. On large screens the left half is an exhibit: the sample project
 * replaying itself (sign-in) or the four stages of work (registration). The right half is the form.
 * On small screens only the form is shown, under the same public header as the front page.
 */
export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  exhibit = 'model',
}: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  /** 'none': just the form, for pages reached from emails and small account tasks. */
  exhibit?: 'model' | 'stages' | 'none';
}) {
  // The exhibit only exists on large screens; don't download three.js or start WebGL on phones.
  const wide = useMediaQuery('(min-width: 1024px)') && exhibit !== 'none';
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a href="#main" className="caps sr-only z-50 bg-surface px-3 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main" className={exhibit === 'none' ? 'flex flex-1' : 'grid flex-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'}>
        {wide && (
        <section className="flex min-h-0 flex-col border-r border-line px-10 py-10 xl:px-14" aria-label="About ProjectFlow">
          <p className="eyebrow">{exhibit === 'model' ? 'Exhibit · A project you can walk around' : 'Exhibit · How work moves'}</p>
          <h2 className="mt-4 max-w-xl font-display text-[38px] leading-[1.04] font-extralight tracking-[-0.04em] text-ink xl:text-[46px]">
            Work you can walk around.
            <br />
            <span className="text-accent-display">Done when it’s proven.</span>
          </h2>
          <div className="mt-8 flex min-h-[440px] flex-1 flex-col">
            <Suspense fallback={<div className="flex-1 border border-line bg-surface" />}>
              {exhibit === 'model' ? (
                <SampleModelExhibit className="flex-1" chart={false} label="Sample project · replaying its six weeks" />
              ) : (
                <div className="flex flex-1 flex-col justify-center border border-line bg-surface p-8">
                  <FlowSculptureCanvas />
                </div>
              )}
            </Suspense>
          </div>
          <p className="mt-4 max-w-xl text-[12.5px] leading-relaxed text-muted">
            {exhibit === 'model'
              ? 'Each block is a task: its length is the time it took, its row the person doing it, its height its priority. Bronze blocks were approved against their criteria; outlines are estimates.'
              : 'Criteria are written before work starts, evidence is submitted, and someone else approves it. That is the only way a task becomes done.'}
          </p>
        </section>
        )}

        <section className={cn('flex flex-col items-center justify-center bg-surface px-5 py-10 sm:px-10', exhibit === 'none' && 'flex-1 bg-canvas')}>
          <div className="w-full max-w-sm">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-display text-[34px] leading-tight font-light tracking-[-0.03em] text-ink">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">
              <BackendStatus />
              {children}
            </div>
            <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>
            <p className="mt-5 flex flex-wrap gap-x-4 text-xs text-muted">
              <Link to="/privacy" className="inline-block py-1.5 hover:text-ink">
                Privacy policy
              </Link>
              <Link to="/terms" className="inline-block py-1.5 hover:text-ink">
                Terms and conditions
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

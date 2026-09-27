import { Moon, Sun } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { themeChanged } from '@/app/uiSlice';
import { buttonClass } from '@/components/ui/buttonStyles';
import { USE_MOCK_API } from '@/config';
import { openCookieSettings } from '@/features/consent/consent';
import { cn } from '@/lib/cn';
import { Logo, Wordmark } from './Logo';

const NAV = [
  { to: '/introduction', label: 'Introduction' },
  { to: '/#workflow', label: 'How it works' },
  { to: '/#roles', label: 'Roles' },
];

/** Light ⇄ dark for visitors; the choice is remembered like the in-app setting. */
function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const dark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  return (
    <button
      type="button"
      onClick={() => dispatch(themeChanged(dark ? 'light' : 'dark'))}
      className="flex size-9 items-center justify-center text-muted hover:text-ink"
      aria-label={dark ? 'Use the light theme' : 'Use the dark theme'}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** The public masthead: front page, introduction and the sign-in pages share it. */
export function PublicHeader() {
  const signedIn = useAppSelector((s) => s.auth.token !== null);
  const location = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="ProjectFlow, front page">
          <Logo className="[&_svg]:size-7" />
        </Link>
        {USE_MOCK_API && (
          <span className="caps hidden border border-accent/50 px-1.5 py-0.5 text-[9.5px] text-accent sm:inline" title="Demo mode: data lives in this browser only">
            Demo
          </span>
        )}

        <nav aria-label="Public" className="ml-4 hidden items-center gap-7 md:flex">
          {NAV.map((item) => {
            const active = item.to === '/introduction' ? location.pathname === '/introduction' : location.pathname === '/' && location.hash === item.to.slice(1);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn('caps border-b py-1 transition-colors', active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink')}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          {signedIn ? (
            <Link to="/dashboard" className={buttonClass('primary', 'sm')}>
              Open ProjectFlow
            </Link>
          ) : (
            <>
              <Link to="/login" className={cn('caps inline-block py-2', location.pathname === '/login' ? 'text-accent' : 'text-ink hover:text-accent')}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  const link = 'inline-block py-1 text-[13px] text-ink-2 hover:text-accent';
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-10">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">A project you can walk around, where work is done when it’s proven.</p>
        </div>
        <div>
          <p className="caps text-muted">Learn</p>
          <ul className="mt-2 space-y-0.5">
            <li>
              <Link to="/introduction" className={link}>
                Introduction
              </Link>
            </li>
            <li>
              <Link to="/#workflow" className={link}>
                How work moves
              </Link>
            </li>
            <li>
              <Link to="/#roles" className={link}>
                Roles and permissions
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="caps text-muted">Account</p>
          <ul className="mt-2 space-y-0.5">
            <li>
              <Link to="/login" className={link}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className={link}>
                Create an account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="caps text-muted">Legal</p>
          <ul className="mt-2 space-y-0.5">
            <li>
              <Link to="/privacy" className={link}>
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={link}>
                Terms and conditions
              </Link>
            </li>
            <li>
              <button type="button" onClick={openCookieSettings} className={link}>
                Cookie settings
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted sm:px-6 lg:px-10">
          <p>ProjectFlow · Capstone project · {year} · Built with React, Spring Boot and MySQL</p>
          {USE_MOCK_API && <p>Demo mode: this copy runs without a server, and its data stays in this browser.</p>}
        </div>
      </div>
    </footer>
  );
}

/**
 * Frame for public pages: header, content, footer. Opens each page at the top, or at the section
 * named in the URL's #hash (the router doesn't scroll by itself).
 */
export function PublicPage({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const target = () => document.getElementById(decodeURIComponent(hash.slice(1)));
    const el = target();
    if (el) {
      el.scrollIntoView({ block: 'start' });
      return;
    }
    // The section may not have rendered yet; try again on the next frame.
    const raf = requestAnimationFrame(() => target()?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a href="#main" className="caps sr-only z-50 bg-surface px-3 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      {footer && <PublicFooter />}
    </div>
  );
}

import * as RD from '@radix-ui/react-dialog';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useProjectsQuery, useUnreadCountQuery } from '@/api/endpoints';
import { loggedOut, useAppDispatch, useAppSelector } from '@/app/store';
import { mobileNavSet, themeChanged, type ThemePreference } from '@/app/uiSlice';
import { USE_MOCK_API } from '@/config';
import type { LiveStatus } from '@/features/live/useLiveUpdates';
import { cn } from '@/lib/cn';
import { PALETTE_SHORTCUT } from '../CommandPalette';
import { Menu, MenuCheckItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../ui/Menu';
import { Wordmark } from './Logo';

/** The five places. Everything else is reached from these or from ⌘K. */
export const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Today' },
  { to: '/my-tasks', label: 'My work' },
  { to: '/projects', label: 'Projects' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/analytics', label: 'Reports' },
] as const;

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

const LIVE: Record<LiveStatus, { label: string; dot: string }> = {
  live: { label: 'Live', dot: 'bg-success' },
  connecting: { label: 'Connecting', dot: 'bg-warning' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-warning' },
  offline: { label: 'Offline', dot: 'bg-danger' },
  demo: { label: 'Demo', dot: 'bg-accent' },
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('caps relative flex h-16 items-center transition-colors', isActive ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent' : 'text-muted hover:text-ink');

/**
 * A typographic masthead instead of a sidebar and a title bar: wordmark, five places in small
 * capitals, and on the right search, inbox (with a count, not a red bubble) and your name.
 * Below `lg` everything folds into a full-screen index.
 */
export function Masthead({ onOpenSearch, live }: { onOpenSearch: () => void; live: LiveStatus }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const theme = useAppSelector((s) => s.ui.theme);
  const indexOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  // The live connection pushes new notifications; poll only as a fallback when it isn't live.
  const { data: unread = 0 } = useUnreadCountQuery(undefined, { pollingInterval: live === 'live' || live === 'demo' ? 0 : 60_000 });
  const firstName = user?.name.split(' ')[0] ?? 'Account';

  const signOut = () => {
    dispatch(loggedOut());
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-3" aria-label="ProjectFlow, today">
          <Wordmark />
          {USE_MOCK_API && (
            <span className="caps border border-accent/50 px-1.5 py-0.5 text-[9.5px] text-accent" title="Demo mode: data lives in this browser only">
              Demo
            </span>
          )}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <button type="button" onClick={onOpenSearch} className="caps hidden items-center gap-2 text-muted hover:text-ink sm:flex" aria-label={`Search and commands (${PALETTE_SHORTCUT})`}>
            Search
            <kbd className="border border-line-strong px-1.5 py-0.5 font-sans text-[9.5px] tracking-normal">{PALETTE_SHORTCUT}</kbd>
          </button>
          <NavLink to="/inbox" className={({ isActive }) => cn('caps hidden sm:flex', isActive ? 'text-ink' : 'text-muted hover:text-ink')} aria-label={`Inbox, ${unread} unread`}>
            Inbox
            {unread > 0 && <span className="ml-1.5 text-accent tabular">{unread > 99 ? '99+' : unread}</span>}
          </NavLink>
          {/* In demo mode the badge by the wordmark already says so. */}
          {live !== 'demo' && (
            <span className="caps hidden items-center gap-1.5 text-[9.5px] text-muted xl:flex" role="status">
              <span className={cn('size-1.5', LIVE[live].dot)} aria-hidden="true" />
              <span className="sr-only">Live updates: </span>
              {LIVE[live].label}
            </span>
          )}
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="caps hidden text-ink hover:text-accent lg:block" aria-label="Account and appearance">
                {firstName}
              </button>
            </MenuTrigger>
            <MenuContent className="w-60">
              <div className="px-2 py-2">
                <p className="truncate text-[13px] font-medium text-ink">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <MenuSeparator />
              <MenuItem onSelect={() => navigate('/settings')}>Profile</MenuItem>
              <MenuItem onSelect={() => navigate('/settings?tab=security')}>Password and sign-in</MenuItem>
              <MenuItem onSelect={() => navigate('/introduction')}>Introduction</MenuItem>
              <MenuSeparator />
              <MenuLabel>Appearance</MenuLabel>
              {THEMES.map((t) => (
                <MenuCheckItem key={t.value} checked={theme === t.value} onSelect={() => dispatch(themeChanged(t.value))}>
                  {t.label}
                </MenuCheckItem>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={signOut}>Sign out</MenuItem>
            </MenuContent>
          </Menu>
          <button type="button" className="caps text-ink lg:hidden" onClick={() => dispatch(mobileNavSet(true))} aria-label="Open the index">
            Index
          </button>
        </div>
      </div>

      <IndexOverlay open={indexOpen} onOpenChange={(o) => dispatch(mobileNavSet(o))} onOpenSearch={onOpenSearch} unread={unread} onSignOut={signOut} />
    </header>
  );
}

/** Small screens: the whole navigation as a numbered catalogue index. */
function IndexOverlay({
  open,
  onOpenChange,
  onOpenSearch,
  unread,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSearch: () => void;
  unread: number;
  onSignOut: () => void;
}) {
  const location = useLocation();
  const { data: projects } = useProjectsQuery({ status: 'ACTIVE', size: 8 }, { skip: !open });
  const close = () => onOpenChange(false);
  const entries = [...PRIMARY_NAV, { to: '/inbox', label: unread ? `Inbox · ${unread}` : 'Inbox' }, { to: '/settings', label: 'Settings' }];
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Content className="fixed inset-0 z-50 overflow-y-auto bg-canvas px-6 py-6 animate-fade-in focus:outline-none">
          <div className="flex items-center justify-between">
            <RD.Title className="caps text-muted">Index</RD.Title>
            <RD.Description className="sr-only">Every place in ProjectFlow and your active projects</RD.Description>
            <RD.Close className="caps text-ink">Close</RD.Close>
          </div>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {entries.map((e, i) => (
              <li key={e.to}>
                <Link to={e.to} onClick={close} className="flex items-baseline gap-5 py-4" aria-current={location.pathname.startsWith(e.to) ? 'page' : undefined}>
                  <span className="w-6 font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                  <span className={cn('font-display text-[30px] leading-none font-light tracking-[-0.03em]', location.pathname.startsWith(e.to) ? 'text-accent-display' : 'text-ink')}>
                    {e.label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => {
              close();
              onOpenSearch();
            }}
            className="caps mt-6 text-ink"
          >
            Search · {PALETTE_SHORTCUT}
          </button>
          {projects && projects.content.length > 0 && (
            <section className="mt-10">
              <h2 className="caps text-muted">Active projects</h2>
              <ul className="mt-3 space-y-2">
                {projects.content.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} onClick={close} className="flex items-baseline gap-3 text-[15px] text-ink">
                      <span className="font-mono text-[11px] text-muted">{p.key}</span>
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="mt-10 flex gap-8">
            <Link to="/introduction" onClick={close} className="caps text-muted">
              Introduction
            </Link>
            <button type="button" onClick={onSignOut} className="caps text-muted">
              Sign out
            </button>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

import { cn } from '@/lib/cn';

/**
 * ProjectFlow mark: three stages (circle → square → filled square) joined by a
 * single rule — work flowing from idea to done — set on the modular grid.
 */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  // `inverted` is for always-dark backgrounds (e.g. the sign-in panel) in either theme.
  const bg = inverted ? '#f2f1ec' : 'var(--ink)';
  const fg = inverted ? '#0f0f0e' : 'var(--canvas)';
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" fill={bg} />
      <path d="M8.5 16H23.5" stroke={fg} strokeWidth="1.6" />
      <circle cx="8.5" cy="16" r="3.2" fill={bg} stroke={fg} strokeWidth="1.6" />
      <rect x="13" y="13" width="6" height="6" fill={bg} stroke={fg} strokeWidth="1.6" />
      <rect x="20.3" y="12.8" width="6.4" height="6.4" fill={fg} />
    </svg>
  );
}

/** Wordmark: wide-tracked capitals, "PROJECT" in ink and "FLOW" in thin bronze. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-[13px] font-semibold tracking-[0.22em] text-ink uppercase', className)}>
      Project<span className="font-light text-accent">flow</span>
    </span>
  );
}

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!collapsed && <Wordmark />}
    </span>
  );
}

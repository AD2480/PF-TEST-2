import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'brand' | 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  hint?: ReactNode;
  to?: string;
  className?: string;
}

const tones = {
  brand: 'text-ink',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
  neutral: 'text-subtle',
};

/**
 * Modular grid of stat tiles: cells share hairline rules like a printed grid.
 * Use `cols` for the large-screen column count (2 on small screens).
 */
export function StatGrid({ children, cols = 4, className }: { children: ReactNode; cols?: 3 | 4 | 5; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden border border-line bg-line',
        cols === 3 && 'lg:grid-cols-3',
        cols === 4 && 'lg:grid-cols-4',
        cols === 5 && 'lg:grid-cols-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, icon: Icon, tone = 'brand', hint, to, className }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <Icon className={cn('size-4 shrink-0', tones[tone])} aria-hidden="true" />
      </div>
      <p className={cn('numeral mt-6 text-[44px] leading-none', tone === 'danger' ? 'text-danger' : 'text-ink')}>{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = cn('block bg-surface p-5 sm:p-6', className);
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:bg-surface-2')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

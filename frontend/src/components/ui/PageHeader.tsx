import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Editorial page header: small uppercase eyebrow, large display title and a
 * hairline rule underneath, with actions aligned to the baseline.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-[32px] leading-[1.05] font-light tracking-[-0.035em] text-ink sm:text-[42px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

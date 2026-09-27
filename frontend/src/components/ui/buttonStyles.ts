import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover dark:text-canvas disabled:hover:bg-brand',
  secondary: 'bg-transparent text-ink border border-line-strong hover:border-ink',
  outline: 'border border-line-strong text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-canvas',
  link: 'text-accent hover:underline underline-offset-4 !px-0 !h-auto !normal-case !tracking-normal',
};

/* Text buttons use small wide-tracked capitals, like a catalogue's "BUY NOW". */
const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[10px] gap-1 uppercase tracking-[0.14em]',
  sm: 'h-8 px-3.5 text-[10.5px] gap-1.5 uppercase tracking-[0.14em]',
  md: 'h-9 px-4 text-[11px] gap-2 uppercase tracking-[0.16em]',
  lg: 'h-11 px-6 text-[11.5px] gap-2 uppercase tracking-[0.18em]',
  icon: 'h-9 w-9',
  'icon-sm': 'h-7 w-7',
};

/** Button styling for elements that aren't <button>, e.g. a router <Link> that looks like a button. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
    '[&_svg]:size-4 [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
    className,
  );
}

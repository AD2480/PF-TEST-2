import { Mic, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useAssistant } from './assistantContext';

/**
 * The assistant's button, in the corner of every signed-in page. It shows when the "Hey
 * ProjectFlow" listener is on, so listening is never hidden.
 */
export function AssistantButton() {
  const a = useAssistant();
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(a.open);
  // When the panel closes with focus inside it (or lost), focus comes back here.
  useEffect(() => {
    if (wasOpen.current && !a.open) {
      const active = document.activeElement;
      const panel = document.querySelector('[data-assistant-panel]');
      if (!active || active === document.body || panel?.contains(active)) button.current?.focus();
    }
    wasOpen.current = a.open;
  }, [a.open]);
  if (a.open) return null;
  // Say what is really happening: listening now, or switched on but paused (hidden tab, push-to-talk).
  const wakeText = a.wakeActive ? 'Listening for “Hey ProjectFlow”.' : a.wakeEnabled ? 'Wake phrase on, not listening right now.' : '';
  return (
    <button
      ref={button}
      type="button"
      data-assistant-button=""
      onClick={() => a.setOpen(true)}
      className={cn(
        'fixed right-4 bottom-4 z-30 flex h-12 items-center gap-2.5 bg-brand px-4 text-white shadow-pop transition-colors hover:bg-brand-hover sm:right-6 sm:bottom-6 dark:text-canvas',
      )}
      aria-label={`Open the assistant (Alt+A)${wakeText ? `. ${wakeText}` : ''}`}
      title={wakeText ? `Assistant · Alt+A · ${wakeText}` : 'Assistant · Alt+A'}
    >
      <Sparkles className="size-4" aria-hidden="true" />
      <span className="caps hidden text-[10.5px] sm:inline">Assistant</span>
      {a.wakeEnabled && (
        <span className="flex items-center gap-1 border-l border-white/30 pl-2.5 dark:border-canvas/30" aria-hidden="true">
          <Mic className={cn('size-3.5', !a.wakeActive && 'opacity-60')} />
          <span className={cn('size-1.5 rounded-full', a.wakeActive ? 'animate-pulse bg-[var(--model-review)]' : 'bg-white/50 dark:bg-canvas/50')} />
        </span>
      )}
    </button>
  );
}

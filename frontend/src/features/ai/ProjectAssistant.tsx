import { ArrowUp, Info, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAiAskProjectMutation, useAiStatusQuery } from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import type { AiAnswer } from '@/api/types';
import { FormError } from '@/components/ui/Form';
import { ProposalCard } from '@/features/assistant/ProposalCard';
import { useProjectContext } from '@/features/projects/projectContext';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { forecastFromModel } from '@/lib/projectAnalysis';
import type { ProjectModel } from '@/three/projectModel';

const SUGGESTIONS = [
  'Are we on track for the deadline?',
  'What changed in the last 7 days?',
  'What is holding up the most work?',
  'Which tasks needed more than one review round?',
  'How is open work spread across the team?',
];
const MAX = 500;

interface Turn {
  question: string;
  answer: AiAnswer;
}

/**
 * "Ask about this project". The server builds the context from this project's records (after
 * checking membership) and adds the scheduler estimate shown here, labelled as an estimate. The
 * assistant can't change anything; when no AI provider is configured it says so instead of
 * answering.
 */
export function ProjectAssistant({ projectId, model, className }: { projectId: number; model: ProjectModel; className?: string }) {
  const { project } = useProjectContext();
  const status = useAiStatusQuery();
  const [ask, state] = useAiAskProjectMutation();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const idByKey = useMemo(() => new Map(model.blocks.map((b) => [b.key, b.id])), [model]);

  const available = !!status.data?.available;
  const reason = status.data?.reason ?? null;

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || state.isLoading) return;
    setError(null);
    // Keep keyboard focus in the question box (suggestion buttons disappear once asked).
    input.current?.focus();
    try {
      const answer = await ask({
        projectId,
        body: {
          question: q,
          // The server accepts answers up to 4000 characters as history.
          previous: turns.slice(-3).map((t) => ({ question: t.question, answer: t.answer.answer.slice(0, 3900) })),
          forecast: forecastFromModel(model),
        },
      }).unwrap();
      setTurns((t) => [...t, { question: q, answer }]);
      setText('');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  return (
    <section className={cn('flex flex-col border border-line bg-surface', className)} aria-labelledby="assistant-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="assistant-title" className="caps flex items-center gap-2 text-ink">
            <Sparkles className="size-3.5 text-accent" aria-hidden="true" /> Ask about this project
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            An AI assistant that answers from this project’s records and the scheduler’s estimate. It can’t change anything.
          </p>
        </div>
        {turns.length > 0 && (
          <button type="button" onClick={() => setTurns([])} className="caps text-muted hover:text-ink">
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 space-y-5 px-5 py-4" aria-live="polite">
        {status.isLoading ? (
          <Spinner label="Checking AI availability" className="size-4 text-muted" />
        ) : status.isError ? (
          <div className="border-l-2 border-line-strong pl-3">
            <p className="text-[13px] font-medium text-ink">Couldn’t check whether AI assistance is available.</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{getErrorMessage(status.error)}</p>
            <button type="button" onClick={() => void status.refetch()} className="caps mt-2 text-accent hover:text-ink">
              Try again
            </button>
          </div>
        ) : !available ? (
          <div className="border-l-2 border-line-strong pl-3">
            <p className="text-[13px] font-medium text-ink">The assistant isn’t available here.</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{reason ?? 'AI assistance is not configured on this server.'}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">The analysis on this page is computed from the records and works without AI.</p>
          </div>
        ) : turns.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed text-muted">
            Ask about progress, delays, dependencies or workload. Answers cite the tasks they rely on and say when the records don’t cover something.
          </p>
        ) : null}

        {turns.map((t, i) => (
          <article key={i} className="space-y-2">
            <p className="text-[13px] font-medium text-ink">{t.question}</p>
            <p className="caps flex items-center gap-1.5 text-[9px] text-accent">
              <Sparkles className="size-3" aria-hidden="true" /> AI answer{t.answer.model ? ` · ${t.answer.model}` : ''}
            </p>
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{t.answer.answer}</p>
            {t.answer.citedTasks.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
                <span className="caps text-[9px] text-muted">Based on</span>
                {t.answer.citedTasks.map((key) => {
                  const id = idByKey.get(key);
                  return id !== undefined ? (
                    <Link key={key} to={`/projects/${projectId}/tasks/${id}`} className="font-mono text-accent hover:underline">
                      {key}
                    </Link>
                  ) : (
                    <span key={key} className="font-mono text-muted">
                      {key}
                    </span>
                  );
                })}
              </p>
            )}
            {t.answer.notInRecords.length > 0 && (
              <div className="bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
                <p className="caps text-[9px] text-muted">Not in the records</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {t.answer.notInRecords.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {(t.answer.proposals ?? []).map((p, j) => (
              <ProposalCard
                key={j}
                project={project}
                origin="ai"
                draft={
                  p.type === 'START_TASK'
                    ? { type: 'start', key: p.taskKey ?? '' }
                    : { type: 'create', title: p.title, description: p.description, priority: p.priority, due: p.dueDate, assignee: p.assigneeName, estimate: p.estimateDays }
                }
              />
            ))}
            <details className="text-[11.5px] text-muted">
              <summary className="cursor-pointer hover:text-ink">What this answer can and can’t tell you</summary>
              <ul className="mt-1.5 space-y-1">
                {t.answer.limits.map((l) => (
                  <li key={l} className="flex gap-1.5">
                    <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    {l}
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}

        {state.isLoading && (
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <Spinner className="size-3.5" /> Reading the project’s records…
          </p>
        )}
        <FormError message={error} />
      </div>

      <div className="border-t border-line px-5 py-4">
        {available && turns.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={state.isLoading}
                onClick={() => void send(s)}
                className="border border-line-strong px-2.5 py-1 text-left text-[12px] text-ink-2 hover:border-ink hover:text-ink disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="assistant-question" className="sr-only">
            Your question
          </label>
          <textarea
            id="assistant-question"
            ref={input}
            rows={2}
            maxLength={MAX}
            value={text}
            disabled={!available}
            readOnly={state.isLoading}
            aria-busy={state.isLoading || undefined}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Not while an input method is composing (Enter confirms the composition there).
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={available ? 'Ask a question about this project…' : 'Unavailable'}
            className="min-h-[44px] flex-1 resize-none border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-subtle focus:border-ink focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!available || state.isLoading || !text.trim()}
            className="flex size-11 shrink-0 items-center justify-center bg-brand text-white hover:bg-brand-hover disabled:opacity-40 dark:text-canvas"
            aria-label="Ask"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
        {available && (
          <p className="mt-2 text-[11px] text-muted">
            {text.length}/{MAX} · {status.data?.remainingThisHour ?? 0} questions left this hour · Enter to send, Shift+Enter for a new line
          </p>
        )}
      </div>
    </section>
  );
}

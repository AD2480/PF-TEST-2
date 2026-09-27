import * as RD from '@radix-ui/react-dialog';
import { ArrowUp, Info, Mic, Sparkles, Square, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAiAskProjectMutation, useAiStatusQuery, useBoardTasksQuery, useMyTasksQuery, useProjectQuery, useProjectsQuery } from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import type { AiAnswer, ProjectDetail, Task } from '@/api/types';
import { Spinner } from '@/components/ui/Spinner';
import { useProjectModel } from '@/features/model/useProjectModel';
import { parseIntent, suggestNext, type Intent } from '@/lib/assistantIntents';
import { cn } from '@/lib/cn';
import { STATUS_LABEL } from '@/lib/constants';
import { forecastFromModel, recentChanges, shortDate } from '@/lib/projectAnalysis';
import { dayToIso, type ProjectModel } from '@/three/projectModel';
import { useAssistant, type InputSource, type Reply } from './assistantContext';
import { ProposalCard } from './ProposalCard';
import { speak, stopSpeaking, voiceErrorMessage, voiceInputSupported, voiceOutputSupported } from './voice';

const SOURCE_LABEL: Record<Reply['kind'], string | null> = {
  info: null,
  facts: 'Computed from the records · no AI',
  changes: 'Computed from the records · no AI',
  tasks: 'Computed from the records · no AI',
  action: 'Command · nothing changes until you confirm',
  ai: 'AI',
};

/** Short text for reading a reply aloud, saying where it came from. */
function spoken(r: Reply): string {
  switch (r.kind) {
    case 'info':
      return r.text;
    case 'facts':
      return `From the records. ${r.facts.length ? [r.title, ...r.facts.slice(0, 3).map((f) => `${f.title}. ${f.detail}`)].join('. ') : (r.empty ?? r.title)}`;
    case 'changes':
      return `From the records. ${r.events.length ? `${r.title}. ${r.events.slice(0, 3).map((e) => `${e.event.key} ${e.event.kind}`).join(', ')}.` : r.title}`;
    case 'tasks':
      return `From the records. ${r.items.length ? `${r.title}. ${r.items.slice(0, 3).map((i) => `${i.task.key}, ${i.task.title}, ${i.reason}`).join('. ')}.` : r.title}`;
    case 'action':
      return r.draft.type === 'create' ? 'I’ve prepared a task draft. Review it and press Create to save it.' : `Press the button to start ${r.draft.key}.`;
    case 'ai':
      return `AI answer, which can be wrong. ${r.answer.answer}`;
  }
}

function examples(project: ProjectDetail | undefined, tasks: readonly Task[] | undefined): string[] {
  const todo = tasks?.find((t) => t.status === 'TODO');
  return [
    'Will we make the deadline?',
    'What’s at risk?',
    'What changed this week?',
    'What should I work on next?',
    'Create a task to write release notes, due Friday',
    ...(todo ? [`Start ${todo.key}`] : project ? [`Open ${project.key}-1`] : []),
  ];
}

/**
 * The assistant, available from every signed-in page (the button in the corner, or Alt+A).
 * Predictive questions and task commands are answered from the records without AI; free-form
 * questions go to the AI when a provider is configured on the server. Commands become drafts
 * and confirm buttons: nothing changes until the person confirms, and voice can't confirm.
 */
export function AssistantPanel() {
  const a = useAssistant();
  return (
    <RD.Root open={a.open} onOpenChange={a.setOpen} modal={false}>
      <RD.Portal>
        <RD.Content
          data-assistant-panel=""
          className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-surface shadow-pop animate-fade-in focus:outline-none sm:w-[440px]"
          aria-describedby={undefined}
          // Stay open while the person works on the page beside it; Esc or the close button closes it.
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLTextAreaElement>('[data-assistant-input]')?.focus();
          }}
          // The Assistant button takes focus back when it reappears (see AssistantButton).
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <AssistantBody />
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

function AssistantBody() {
  const a = useAssistant();
  const navigate = useNavigate();
  const location = useLocation();
  const routeProjectId = Number(/^\/projects\/(\d+)/.exec(location.pathname)?.[1] ?? NaN);
  const projects = useProjectsQuery({ status: 'ACTIVE', size: 50 });
  const [chosen, setChosen] = useState<number | null>(Number.isFinite(routeProjectId) ? routeProjectId : null);
  useEffect(() => {
    if (Number.isFinite(routeProjectId)) setChosen(routeProjectId);
  }, [routeProjectId]);
  const projectId = chosen ?? projects.data?.content[0]?.id ?? null;
  const projectQ = useProjectQuery(projectId ?? 0, { skip: projectId === null });
  // currentData: never answer about the previous project while switching.
  const project = projectQ.currentData;
  const pm = useProjectModel(project ?? null);
  const board = useBoardTasksQuery(projectId ?? 0, { skip: projectId === null });
  const mine = useMyTasksQuery({ status: 'OPEN', size: 100 });
  const aiStatus = useAiStatusQuery();
  const aiAvailable = !!aiStatus.data?.available;
  const [ask, askState] = useAiAskProjectMutation();

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<InputSource>('typed');
  const [waiting, setWaiting] = useState<{ text: string; source: InputSource }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const canListen = useMemo(() => voiceInputSupported(), []);
  const canSpeak = useMemo(() => voiceOutputSupported(), []);
  const messages = a.messages;

  // Everything a request might need has either loaded or failed; until then requests wait.
  const ready =
    !projects.isLoading &&
    (projectId === null || (!projectQ.isLoading && !(projectQ.isFetching && !project))) &&
    (projectId === null || !board.isLoading) &&
    !pm.loading &&
    !mine.isLoading &&
    !aiStatus.isLoading;

  // The latest data, for requests handled after a delay (voice, the wake phrase, loading).
  const snapshot = () => ({
    project,
    model: pm.model,
    analysis: pm.analysis,
    modelError: pm.error,
    board: board.currentData,
    mine: mine.data?.content,
    projectsList: projects.data?.content,
    aiAvailable,
    aiBusy: askState.isLoading,
    messages,
    speakAnswers: a.speakAnswers,
  });
  const latest = useRef(snapshot());
  latest.current = snapshot();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, askState.isLoading, waiting.length]);

  const reply = (r: Reply) => {
    a.pushMessage({ role: 'assistant', reply: r });
    if (latest.current.speakAnswers && mounted.current) speak(spoken(r));
  };

  /** Why AI can't answer right now, in the server's own words when it gave them. */
  const aiUnavailableText = () =>
    aiStatus.isError
      ? `I couldn’t check whether AI is available (${getErrorMessage(aiStatus.error)}).`
      : (aiStatus.data?.reason ?? 'AI assistance isn’t available right now.');

  const answer = async (intent: Intent, question: string) => {
    const { project: p, model, analysis, modelError, board: tasks, mine: myTasks, projectsList, aiAvailable: aiOn, aiBusy } = latest.current;
    const noProject = () =>
      reply({ kind: 'info', text: projectsList?.length === 0 ? 'You’re not a member of any active project yet.' : 'Choose a project at the top first.' });
    const needModel = (): boolean => {
      if (model && analysis) return true;
      reply({ kind: 'info', text: modelError ? `I couldn’t load this project’s records (${getErrorMessage(modelError)}).` : 'This project has no records to work from yet.' });
      return false;
    };
    const otherProject = (key: string) => projectsList?.find((x) => x.key === key.split('-')[0] && x.id !== p?.id);

    switch (intent.kind) {
      case 'help':
        return reply({
          kind: 'info',
          text: 'I can forecast, list risks and recent changes, suggest what to work on next, and prepare tasks for you to confirm. Try:',
          examples: examples(p, tasks),
        });
      case 'create-task':
        if (!p) return noProject();
        return reply({ kind: 'action', project: p, draft: { type: 'create', title: intent.title, priority: intent.priority, due: intent.due, assignee: intent.assignee, estimate: intent.estimate } });
      case 'start-task': {
        if (!p) return noProject();
        const other = otherProject(intent.key);
        if (other) return reply({ kind: 'info', text: `${intent.key} belongs to ${other.name}. Choose it at the top, then ask again.` });
        return reply({ kind: 'action', project: p, draft: { type: 'start', key: intent.key } });
      }
      case 'open-task': {
        if (!p) return noProject();
        const t = tasks?.find((x) => x.key.toUpperCase() === intent.key);
        if (t) {
          navigate(`/projects/${p.id}/tasks/${t.id}`);
          return reply({ kind: 'info', text: `Opened ${t.key} “${t.title}”.` });
        }
        const other = otherProject(intent.key);
        if (other) return reply({ kind: 'info', text: `${intent.key} belongs to ${other.name}. Choose it at the top, then ask again.` });
        return reply({ kind: 'info', text: tasks ? `There’s no ${intent.key} in ${p.name}.` : `I couldn’t load the tasks of ${p.name}, so I can’t find ${intent.key}.` });
      }
      case 'open-model':
        if (!p) return noProject();
        navigate(`/projects/${p.id}/model`);
        return reply({ kind: 'info', text: `Opened the 3D model of ${p.name}.` });
      case 'my-work':
      case 'next': {
        if (!myTasks) return reply({ kind: 'info', text: 'I couldn’t load your tasks. Try again in a moment.' });
        const ranked = suggestNext(myTasks);
        const inReview = myTasks.filter((t) => t.status === 'IN_REVIEW');
        if (!ranked.length) {
          return reply({
            kind: 'info',
            text: inReview.length
              ? `Everything assigned to you is waiting for a reviewer: ${inReview.map((t) => t.key).join(', ')}.`
              : 'Nothing open is assigned to you right now.',
          });
        }
        if (intent.kind === 'next') {
          return reply({ kind: 'tasks', title: 'Suggested order for your open work', summary: 'Overdue first, then work in progress, then what’s due soonest.', items: ranked.slice(0, 3), question });
        }
        const byStatus = (s: Task['status']) => myTasks.filter((t) => t.status === s).length;
        return reply({
          kind: 'tasks',
          title: `${myTasks.length} open ${myTasks.length === 1 ? 'task is' : 'tasks are'} assigned to you`,
          summary: `${byStatus('TODO')} to do, ${byStatus('IN_PROGRESS')} in progress, ${byStatus('IN_REVIEW')} waiting for review.`,
          items: ranked.slice(0, 5),
          question,
        });
      }
      case 'forecast':
        if (!p) return noProject();
        if (!needModel()) return;
        return reply({ kind: 'facts', title: `Forecast for ${p.name}`, facts: analysis!.facts.filter((f) => ['finish', 'assumed', 'late', 'clears'].includes(f.id)), question });
      case 'risks': {
        if (!p) return noProject();
        if (!needModel()) return;
        const flagged = analysis!.facts.filter((f) => f.tone === 'danger' || f.tone === 'warning');
        // Only claim what was checked: without a forecast, lateness can't be judged.
        const empty = analysis!.forecastFinish
          ? 'Nothing is flagged: no overdue work, nothing estimated to finish after its due date and no long review waits.'
          : 'No overdue work and no long review waits. There’s no forecast for the open work, so whether it will be late can’t be judged.';
        return reply({ kind: 'facts', title: `What needs attention in ${p.name}`, facts: flagged, empty, question });
      }
      case 'changes': {
        if (!p) return noProject();
        if (!needModel()) return;
        const all = recentChanges(model!, intent.days);
        const shown = all.slice(0, 14);
        return reply({
          kind: 'changes',
          title: all.length ? `In the last ${intent.days} days in ${p.name}` : `No status changes were recorded in ${p.name} in the last ${intent.days} days.`,
          events: shown.map((event) => ({ event, date: shortDate(dayToIso(model!.originMs, event.day)) })),
          more: all.length - shown.length,
          question,
        });
      }
      case 'question':
        if (!p) return noProject();
        if (!aiOn) return reply({ kind: 'info', text: `That question needs the AI. ${aiUnavailableText()} These work without AI:`, examples: examples(p, tasks) });
        if (aiBusy || aiInFlight.current) return reply({ kind: 'info', text: 'I’m still answering your last question. Ask again when it’s done.' });
        return askAi(p, question, model);
    }
  };

  const aiInFlight = useRef(false);
  const askAi = async (p: ProjectDetail, question: string, model: ProjectModel | null) => {
    if (aiInFlight.current) return;
    aiInFlight.current = true;
    // Earlier AI turns about this same project only.
    const previous = latest.current.messages
      .flatMap((m) => (m.role === 'assistant' && m.reply.kind === 'ai' && m.reply.project.id === p.id ? [m.reply] : []))
      .slice(-3)
      .map((r) => ({ question: r.asked.slice(0, 500), answer: r.answer.answer.slice(0, 3900) }));
    try {
      const res = await ask({ projectId: p.id, body: { question: question.slice(0, 500), previous, forecast: model ? forecastFromModel(model) : null } }).unwrap();
      reply({ kind: 'ai', project: p, answer: res, asked: question.slice(0, 500) });
    } catch (e) {
      reply({ kind: 'info', text: getErrorMessage(e) });
    } finally {
      aiInFlight.current = false;
    }
  };

  const handle = (raw: string, source: InputSource) => {
    const q = raw.trim();
    if (!q) return;
    input.current?.focus();
    setLastSource(source);
    a.pushMessage({ role: 'user', text: q, source });
    setText('');
    if (ready) void answer(parseIntent(q), q);
    else setWaiting((w) => [...w, { text: q, source }]);
  };

  // Requests that arrived while the records were loading.
  useEffect(() => {
    if (!ready || waiting.length === 0) return;
    const queue = waiting;
    setWaiting([]);
    for (const w of queue) void answer(parseIntent(w.text), w.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, waiting]);

  // Requests from the provider (the wake phrase with a command after it).
  const pending = a.pending;
  const handled = useRef(new Set<number>());
  useEffect(() => {
    if (!pending || handled.current.has(pending.id)) return;
    handled.current.add(pending.id);
    a.consumePending(pending.id);
    handle(pending.text, pending.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const startListening = () => {
    setVoiceError(null);
    stopSpeaking();
    const ok = a.voice.listenOnce({
      onInterim: (t) => mounted.current && setText(t),
      onFinal: (t) => mounted.current && handle(t, 'voice'),
      onError: (code) => mounted.current && setVoiceError(voiceErrorMessage(code)),
      onEnd: () => mounted.current && setListening(false),
    });
    setListening(ok);
    if (!ok) setVoiceError('Voice input isn’t available in this browser.');
  };
  const stopListening = () => a.voice.stopOnce();

  // "Hey ProjectFlow" on its own: listen for the command.
  useEffect(() => {
    if (!a.listenRequested) return;
    a.clearListenRequest();
    if (canListen) startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.listenRequested]);

  useEffect(() => () => a.voice.stopOnce(), [a.voice]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handle(text, 'typed');
  };

  const projectOptions = projects.data?.content ?? [];
  const empty = messages.length === 0;
  const aiChip = aiStatus.isLoading ? '' : aiStatus.isError ? 'AI status unknown' : aiAvailable ? `AI on${aiStatus.data?.model ? ` · ${aiStatus.data.model}` : ''}` : 'AI off';

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <RD.Title className="caps flex items-center gap-2 text-ink">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" /> Assistant
        </RD.Title>
        <span className={cn('caps shrink-0 text-[9px] whitespace-nowrap', aiAvailable ? 'text-success' : 'text-muted')} title={aiStatus.data?.reason ?? undefined}>
          {aiChip}
        </span>
        {a.wakeEnabled && (
          <span
            className={cn('caps flex shrink-0 items-center gap-1 text-[9px] whitespace-nowrap', a.wakeActive ? 'text-accent' : 'text-muted')}
            role="status"
            title={a.wakeActive ? 'Listening for “Hey ProjectFlow”' : 'The wake phrase is on but paused (hidden tab or push-to-talk)'}
          >
            <Mic className="size-3" aria-hidden="true" />
            {a.wakeActive ? 'Listening' : 'Wake paused'}
            <span className="sr-only">{a.wakeActive ? ' for “Hey ProjectFlow”' : ''}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!empty && (
            <button type="button" onClick={a.clearMessages} className="caps px-1.5 text-[9.5px] text-muted hover:text-ink">
              Clear
            </button>
          )}
          <RD.Close className="flex size-8 items-center justify-center text-muted hover:text-ink" aria-label="Close the assistant">
            <X className="size-4" />
          </RD.Close>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <label htmlFor="assistant-project" className="caps shrink-0 text-[9.5px] text-muted">
          Project
        </label>
        <select
          id="assistant-project"
          value={projectId ?? ''}
          onChange={(e) => setChosen(Number(e.target.value))}
          className="min-w-0 flex-1 border border-line bg-surface px-2 py-1 text-[12.5px] text-ink focus:border-ink focus:outline-none"
        >
          {projectOptions.length === 0 && <option value="">No active projects</option>}
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key} · {p.name}
            </option>
          ))}
          {project && !projectOptions.some((p) => p.id === project.id) && <option value={project.id}>{`${project.key} · ${project.name}`}</option>}
        </select>
      </div>

      <div ref={scroller} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {empty && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-ink-2">
              Ask about {project ? project.name : 'a project'}, or tell me what to do. Forecasts, risks, recent changes and task commands are worked out from the records;
              other questions go to the AI{aiAvailable ? '' : ', which isn’t available right now'}.
            </p>
            <Examples items={examples(project, board.currentData)} onPick={(q) => handle(q, 'typed')} />
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-8 border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink">
              {m.text}
              {m.source === 'voice' && (
                <span className="caps ml-2 inline-flex items-center gap-1 text-[9px] text-muted">
                  <Mic className="size-2.5" aria-hidden="true" /> spoken
                </span>
              )}
            </div>
          ) : (
            <ReplyView
              key={m.id}
              reply={m.reply}
              aiAvailable={aiAvailable}
              onAsk={(q) => handle(q, 'typed')}
              onAskAi={(q) => {
                if (project && !askState.isLoading) void askAi(project, q, pm.model);
              }}
              onDone={(t) => latest.current.speakAnswers && mounted.current && speak(t)}
            />
          ),
        )}
        {(askState.isLoading || waiting.length > 0) && (
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <Spinner className="size-3.5" /> Reading the project’s records…
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line px-4 py-3">
        {!empty && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {['Forecast', 'What’s at risk?', 'What changed this week?', 'What should I work on next?'].map((q) => (
              <button key={q} type="button" onClick={() => handle(q, 'typed')} className="shrink-0 border border-line px-2 py-0.5 text-[11.5px] text-ink-2 hover:border-ink">
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Message the assistant
          </label>
          <textarea
            id="assistant-input"
            ref={input}
            data-assistant-input=""
            rows={2}
            maxLength={500}
            value={text}
            readOnly={listening}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handle(text, 'typed');
              }
            }}
            placeholder={listening ? 'Listening…' : 'Ask, or say what to do…'}
            className="min-h-[44px] flex-1 resize-none border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-subtle focus:border-ink focus:outline-none"
          />
          {canListen && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Speak a request'}
              className={cn('flex size-11 shrink-0 items-center justify-center border', listening ? 'border-danger bg-danger-soft text-danger' : 'border-line-strong text-ink hover:border-ink')}
            >
              {listening ? <Square className="size-3.5" /> : <Mic className="size-4" />}
            </button>
          )}
          <button type="submit" disabled={!text.trim() || listening} className="flex size-11 shrink-0 items-center justify-center bg-brand text-white hover:bg-brand-hover disabled:opacity-40 dark:text-canvas" aria-label="Send">
            <ArrowUp className="size-4" />
          </button>
        </div>
        {listening && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-danger" role="status">
            <span className="size-1.5 animate-pulse rounded-full bg-danger" aria-hidden="true" /> Listening. Speak your request; it’s sent when you stop.
          </p>
        )}
        {voiceError && <p className="mt-1.5 text-[11.5px] text-danger">{voiceError}</p>}
        <p className="mt-1.5 text-[10.5px] text-muted">
          Enter sends · Esc or Alt+A closes · Alt+A reopens it from any page{lastSource === 'voice' ? ' · Voice can prepare changes but never confirms them' : ''}
        </p>
        <VoiceSettings canListen={canListen} canSpeak={canSpeak} />
      </form>
    </>
  );
}

function Examples({ items, onPick }: { items: string[]; onPick: (q: string) => void }) {
  return (
    <ul className="space-y-1">
      {items.map((q) => (
        <li key={q}>
          <button type="button" onClick={() => onPick(q)} className="w-full border-l border-line-strong py-0.5 pl-3 text-left text-[12.5px] text-ink-2 hover:border-accent hover:text-ink">
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReplyView({
  reply,
  aiAvailable,
  onAsk,
  onAskAi,
  onDone,
}: {
  reply: Reply;
  aiAvailable: boolean;
  onAsk: (q: string) => void;
  onAskAi: (q: string) => void;
  onDone: (text: string) => void;
}) {
  const label = reply.kind === 'ai' ? `AI${reply.answer.model ? ` · ${reply.answer.model}` : ''}` : SOURCE_LABEL[reply.kind];
  const question = reply.kind !== 'ai' && 'question' in reply ? reply.question : undefined;
  return (
    <article className="space-y-2">
      {label && (
        <p className={cn('caps flex items-center gap-1.5 text-[9px]', reply.kind === 'ai' ? 'text-accent' : 'text-muted')}>
          {reply.kind === 'ai' && <Sparkles className="size-3" aria-hidden="true" />}
          {label}
        </p>
      )}
      {reply.kind === 'info' && (
        <>
          <p className="text-[13px] leading-relaxed text-ink-2">{reply.text}</p>
          {reply.examples && <Examples items={reply.examples} onPick={onAsk} />}
        </>
      )}
      {reply.kind === 'facts' && (
        <>
          <p className="text-[13px] font-medium text-ink">{reply.title}</p>
          {reply.facts.length === 0 ? (
            <p className="text-[12.5px] text-ink-2">{reply.empty ?? 'Nothing to report.'}</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {reply.facts.map((f) => (
                <li key={f.id} className="py-2">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[12.5px] font-medium text-ink">{f.title}</span>
                    <span className={cn('caps text-[8.5px]', f.source === 'estimate' ? 'text-accent' : 'text-muted')}>{f.source === 'estimate' ? 'Estimate' : 'Recorded'}</span>
                    {f.tone === 'danger' && <span className="caps text-[8.5px] text-danger">At risk</span>}
                    {f.tone === 'warning' && <span className="caps text-[8.5px] text-warning">Watch</span>}
                  </p>
                  <p className="text-[12px] leading-relaxed text-muted">{f.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {reply.kind === 'changes' && (
        <>
          <p className="text-[13px] font-medium text-ink">{reply.title}</p>
          {reply.events.length > 0 && (
            <ul className="space-y-1 text-[12.5px]">
              {reply.events.map(({ event, date }) => (
                <li key={`${event.taskId}-${event.kind}-${event.day}`} className="flex gap-2">
                  <span className="w-12 shrink-0 text-muted tabular">{date}</span>
                  <span className="text-ink-2">
                    <span className="font-mono text-[11px] text-ink">{event.key}</span> {event.kind}
                    <span className="text-muted"> · {event.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {reply.more > 0 && <p className="text-[12px] text-muted">…and {reply.more} earlier {reply.more === 1 ? 'change' : 'changes'}. The project’s Activity page lists them all.</p>}
        </>
      )}
      {reply.kind === 'tasks' && (
        <>
          <p className="text-[13px] font-medium text-ink">{reply.title}</p>
          {reply.summary && <p className="text-[12px] text-muted">{reply.summary}</p>}
          <ol className="divide-y divide-line border-y border-line">
            {reply.items.map(({ task, reason }) => (
              <li key={task.id} className="py-2">
                <Link to={`/projects/${task.projectId}/tasks/${task.id}`} className="text-[12.5px] text-ink hover:text-accent">
                  <span className="font-mono text-[11px] text-muted">{task.key}</span> {task.title}
                </Link>
                <p className="text-[11.5px] text-muted">
                  {STATUS_LABEL[task.status]} · {reason}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
      {reply.kind === 'action' && <ProposalCard project={reply.project} draft={reply.draft} origin="command" onDone={onDone} />}
      {reply.kind === 'ai' && <AiReply project={reply.project} answer={reply.answer} onDone={onDone} />}
      {question && aiAvailable && (
        <button type="button" onClick={() => onAskAi(question)} className="caps flex items-center gap-1.5 text-[9.5px] text-accent hover:text-ink">
          <Sparkles className="size-3" aria-hidden="true" /> Ask the AI to explain
        </button>
      )}
    </article>
  );
}

function AiReply({ project, answer, onDone }: { project: ProjectDetail; answer: AiAnswer; onDone: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{answer.answer}</p>
      {answer.citedTasks.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[11px]">
          <span className="caps text-[8.5px] text-muted">Based on</span>
          {answer.citedTasks.map((k) => (
            <span key={k} className="font-mono text-ink">
              {k}
            </span>
          ))}
        </p>
      )}
      {answer.notInRecords.length > 0 && (
        <div className="bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
          <p className="caps text-[8.5px] text-muted">Not in the records</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {answer.notInRecords.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {(answer.proposals ?? []).map((p, i) => (
        <ProposalCard
          key={i}
          project={project}
          origin="ai"
          onDone={onDone}
          draft={
            p.type === 'START_TASK'
              ? { type: 'start', key: p.taskKey ?? '' }
              : { type: 'create', title: p.title, description: p.description, priority: p.priority, due: p.dueDate, assignee: p.assigneeName, estimate: p.estimateDays }
          }
        />
      ))}
      <details className="text-[11px] text-muted">
        <summary className="cursor-pointer hover:text-ink">What this answer can and can’t tell you</summary>
        <ul className="mt-1 space-y-1">
          {answer.limits.map((l) => (
            <li key={l} className="flex gap-1.5">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              {l}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function VoiceSettings({ canListen, canSpeak }: { canListen: boolean; canSpeak: boolean }) {
  const a = useAssistant();
  return (
    <details className="mt-2 text-[11.5px] text-muted" open={!!a.wakeError}>
      <summary className="caps cursor-pointer text-[9.5px] hover:text-ink">Voice</summary>
      <div className="mt-2 space-y-2">
        {!canListen ? (
          <p>This browser doesn’t offer speech recognition. Voice works in Chrome, Edge and Safari.</p>
        ) : (
          <label className="flex cursor-pointer items-start gap-2 text-ink-2">
            <input type="checkbox" className="mt-0.5 size-3.5 accent-[var(--accent)]" checked={a.wakeEnabled} onChange={(e) => a.setWakeEnabled(e.target.checked)} />
            <span>
              Listen for “Hey ProjectFlow”
              <span className="block text-muted">
                Only while this tab is open and visible, and only for you on this browser. Say “Hey ProjectFlow, what’s at risk?”, or pause after it for the command.
              </span>
            </span>
          </label>
        )}
        {canSpeak && (
          <label className="flex cursor-pointer items-start gap-2 text-ink-2">
            <input type="checkbox" className="mt-0.5 size-3.5 accent-[var(--accent)]" checked={a.speakAnswers} onChange={(e) => a.setSpeakAnswers(e.target.checked)} />
            <span className="flex items-center gap-1.5">
              <Volume2 className="size-3" aria-hidden="true" /> Read answers aloud
            </span>
          </label>
        )}
        {a.wakeError && <p className="text-danger">{a.wakeError}</p>}
        <p className="leading-relaxed">
          Voice uses your browser’s speech recognition, which may send audio to the browser’s maker (Google for Chrome, Apple for Safari) to turn it into text.
          ProjectFlow only receives the text, never audio. Voice can prepare a task or a change, but you always confirm it with a click.
        </p>
      </div>
    </details>
  );
}

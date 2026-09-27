import { createContext, useContext } from 'react';
import type { AiAnswer, ProjectDetail, Task } from '@/api/types';
import type { AnalysisFact, ChangeEvent } from '@/lib/projectAnalysis';
import type { ActionDraft } from './ProposalCard';
import type { VoiceController } from './voice';

export type InputSource = 'typed' | 'voice';

/** One reply in the conversation. `question` lets a computed reply offer "Ask the AI to explain". */
export type Reply =
  | { kind: 'info'; text: string; examples?: string[] }
  | { kind: 'facts'; title: string; facts: AnalysisFact[]; empty?: string; question?: string }
  | { kind: 'changes'; title: string; events: { event: ChangeEvent; date: string }[]; more: number; question?: string }
  | { kind: 'tasks'; title: string; summary?: string; items: { task: Task; reason: string }[]; question?: string }
  | { kind: 'action'; project: ProjectDetail; draft: ActionDraft }
  | { kind: 'ai'; project: ProjectDetail; answer: AiAnswer; asked: string };

export type NewMessage = { role: 'user'; text: string; source: InputSource } | { role: 'assistant'; reply: Reply };
export type Message = NewMessage & { id: number };

export interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** A request waiting for the panel to handle (e.g. heard after "Hey ProjectFlow"). */
  pending: { id: number; text: string; source: InputSource } | null;
  submit: (text: string, source: InputSource) => void;
  consumePending: (id: number) => void;
  /** Set when the wake phrase was heard alone: the panel should listen for the command. */
  listenRequested: boolean;
  clearListenRequest: () => void;
  /** The conversation, kept while the panel is closed (it's cleared on sign-out). */
  messages: Message[];
  pushMessage: (m: NewMessage) => void;
  clearMessages: () => void;
  voice: VoiceController;
  /** The person's choice; `wakeActive` is whether the listener is actually running right now. */
  wakeEnabled: boolean;
  wakeActive: boolean;
  setWakeEnabled: (on: boolean) => void;
  wakeError: string | null;
  speakAnswers: boolean;
  setSpeakAnswers: (on: boolean) => void;
}

export const AssistantContext = createContext<AssistantState | null>(null);

/** The assistant's shared state; available inside the signed-in app. */
export function useAssistant(): AssistantState {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used inside <AssistantProvider>');
  return ctx;
}

/** Same, but null outside the provider (for components that also render elsewhere). */
export function useOptionalAssistant(): AssistantState | null {
  return useContext(AssistantContext);
}

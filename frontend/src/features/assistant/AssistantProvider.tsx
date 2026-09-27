import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppSelector } from '@/app/store';
import { afterWakePhrase } from '@/lib/assistantIntents';
import { readStorage, writeStorage } from '@/lib/storage';
import { AssistantContext, type AssistantState, type InputSource, type Message, type NewMessage } from './assistantContext';
import { VoiceController, voiceErrorMessage } from './voice';

/** Voice choices are per person on this browser, so one person's opt-in never applies to another. */
const keys = (userId: number) => ({ wake: `projectflow.assistant.wake.${userId}`, speak: `projectflow.assistant.speak.${userId}` });

/**
 * The assistant's state for the signed-in app: whether the panel is open, the conversation, a
 * request waiting for the panel, and voice (push-to-talk, the optional "Hey ProjectFlow" listener,
 * reading answers aloud). It lives inside the app shell, so signing out stops all listening.
 * Alt+A opens the panel, moves into it, or closes it when you're already in it.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const userId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const k = keys(userId);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AssistantState['pending']>(null);
  const [listenRequested, setListenRequested] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wakeEnabled, setWakeEnabledState] = useState(() => readStorage(k.wake) === 'on');
  const [wakeActive, setWakeActive] = useState(false);
  const [speakAnswers, setSpeakAnswersState] = useState(() => readStorage(k.speak) === 'on');
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [voice] = useState(() => new VoiceController());
  const nextId = useRef(1);
  const nextMessage = useRef(1);

  // If a different person signs in without the shell unmounting, use their own choices.
  useEffect(() => {
    setWakeEnabledState(readStorage(k.wake) === 'on');
    setSpeakAnswersState(readStorage(k.speak) === 'on');
    setMessages([]);
  }, [k.wake, k.speak]);

  // Attach on mount and release on unmount (also correct under React's development double-mount).
  useEffect(() => {
    voice.attach();
    voice.onWakeActiveChange = setWakeActive;
    return () => {
      voice.onWakeActiveChange = null;
      voice.dispose();
      setWakeActive(false);
    };
  }, [voice]);

  const submit = useCallback((text: string, source: InputSource) => {
    setOpen(true);
    setPending({ id: nextId.current++, text, source });
  }, []);

  const consumePending = useCallback((id: number) => setPending((p) => (p && p.id === id ? null : p)), []);
  const pushMessage = useCallback((m: NewMessage) => setMessages((list) => [...list, { ...m, id: nextMessage.current++ }]), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  // "Hey ProjectFlow …": open the panel and hand it the rest of the sentence, or listen for it.
  useEffect(() => {
    voice.setWake(
      wakeEnabled,
      (transcript) => {
        const rest = afterWakePhrase(transcript);
        if (rest === null) return;
        if (rest) submit(rest, 'voice');
        else {
          setOpen(true);
          setListenRequested(true);
        }
      },
      (code) => {
        setWakeError(voiceErrorMessage(code));
        setWakeEnabledState(false);
        writeStorage(k.wake, null);
      },
    );
  }, [voice, wakeEnabled, submit, k.wake]);

  const setWakeEnabled = useCallback(
    (on: boolean) => {
      setWakeError(null);
      setWakeEnabledState(on);
      writeStorage(k.wake, on ? 'on' : null);
    },
    [k.wake],
  );
  const setSpeakAnswers = useCallback(
    (on: boolean) => {
      setSpeakAnswersState(on);
      writeStorage(k.speak, on ? 'on' : null);
    },
    [k.speak],
  );

  // Alt+A: open the panel; if it's open but you're elsewhere, go into it; if you're in it, close it.
  // Never while typing in a field (so Option+A still types "å" on a Mac); the assistant's own box
  // counts as a field once something is typed in it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (e.code !== 'KeyA' && e.key.toLowerCase() !== 'a') return;
      const t = e.target as HTMLElement | null;
      const emptyAssistantBox = t?.hasAttribute('data-assistant-input') && (t as HTMLTextAreaElement).value === '';
      if (t && !emptyAssistantBox && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      const panel = document.querySelector('[data-assistant-panel]');
      if (!panel) setOpen(true);
      else if (panel.contains(document.activeElement)) setOpen(false);
      else document.querySelector<HTMLTextAreaElement>('[data-assistant-input]')?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<AssistantState>(
    () => ({
      open,
      setOpen,
      pending,
      submit,
      consumePending,
      listenRequested,
      clearListenRequest: () => setListenRequested(false),
      messages,
      pushMessage,
      clearMessages,
      voice,
      wakeEnabled,
      wakeActive,
      setWakeEnabled,
      wakeError,
      speakAnswers,
      setSpeakAnswers,
    }),
    [open, pending, submit, consumePending, listenRequested, messages, pushMessage, clearMessages, voice, wakeEnabled, wakeActive, setWakeEnabled, wakeError, speakAnswers, setSpeakAnswers],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

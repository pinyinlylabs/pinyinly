import { useEffect, useRef, useState } from "react";
import { useAppActivity } from "./useAppActivity";

type QuizTimerState = {
  elapsedMs: number;
  activeSinceMs: number | undefined;
  isAppActive: boolean;
  isPaused: boolean;
};

export const quizTimerIdleGraceMs = 4000;

export interface QuizTimer {
  getDurationMs(): number;
  /**
   * Stops counting elapsed quiz time while the user is actively doing work
   * that should not count as recall time, such as drawing a character stroke.
   */
  pause(): void;
  /**
   * Records a choice for the multi-choice free-time rule. The first correct
   * choice preserves its elapsed time if the next correct choice is within
   * the idle grace period; an incorrect choice or a longer gap resets it.
   * Unlike `resumeAfter`, this does not pause the timer: a later incorrect
   * choice must be able to restore the full elapsed time.
   */
  recordChoice(correct: boolean): void;
  /** Resumes counting elapsed quiz time immediately. */
  resume(): void;
  /**
   * Stops counting time now, then resumes after the delay. Use this to exclude
   * a short idle interval after productive input; idle time beyond the delay
   * counts as recall time.
   */
  resumeAfter(delayMs: number): void;
  endTime: number | undefined;
}

function setTimerActive(state: QuizTimerState, active: boolean) {
  if (active) {
    state.activeSinceMs ??= Date.now();
    return;
  }
  if (state.activeSinceMs != null) {
    state.elapsedMs += Date.now() - state.activeSinceMs;
    state.activeSinceMs = undefined;
  }
}

/**
 * Measures active time spent answering a quiz question.
 *
 * Time spent with the app or browser tab inactive is excluded. Manual pauses
 * can be given a delay before timing resumes.
 */
export function useQuizTimer(): QuizTimer {
  const isActive = useAppActivity();
  const timerStateRef = useRef<QuizTimerState>({
    elapsedMs: 0,
    activeSinceMs: undefined,
    isAppActive: false,
    isPaused: false,
  });
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    const state = timerStateRef.current;
    state.isAppActive = isActive;
    setTimerActive(state, isActive && !state.isPaused);
  }, [isActive]);

  useEffect(
    () => () => {
      if (resumeTimeoutRef.current != null) {
        clearTimeout(resumeTimeoutRef.current);
      }
    },
    [],
  );

  function clearResumeTimeout() {
    if (resumeTimeoutRef.current != null) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }

  function getDurationMs() {
    const { elapsedMs, activeSinceMs } = timerStateRef.current;
    return elapsedMs + (activeSinceMs == null ? 0 : Date.now() - activeSinceMs);
  }

  function pause() {
    clearResumeTimeout();
    const state = timerStateRef.current;
    state.isPaused = true;
    setTimerActive(state, false);
  }

  function resume() {
    clearResumeTimeout();
    const state = timerStateRef.current;
    state.isPaused = false;
    setTimerActive(state, state.isAppActive);
  }

  function resumeAfter(delayMs: number) {
    pause();
    resumeTimeoutRef.current = setTimeout(resume, delayMs);
  }

  function recordChoice(correct: boolean) {
    const durationMs = getDurationMs();
    setEndTime((end) =>
      correct
        ? end == null
          ? durationMs
          : durationMs - end <= quizTimerIdleGraceMs
            ? end
            : undefined
        : undefined,
    );
  }

  return {
    getDurationMs,
    pause,
    recordChoice,
    resume,
    resumeAfter,
    endTime,
  };
}

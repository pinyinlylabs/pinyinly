import { useEffect, useRef, useState } from "react";
import { useAppActivity } from "./useAppActivity";

type QuizTimerState = {
  elapsedMs: number;
  activeSinceMs: number | undefined;
};

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
 * Time spent with the app or browser tab inactive is excluded.
 */
export function useQuizTimer() {
  const isActive = useAppActivity();
  const timerStateRef = useRef<QuizTimerState>({
    elapsedMs: 0,
    activeSinceMs: undefined,
  });
  const [endTime, setEndTime] = useState<number>();
  const maxTimeBetweenChoices = 4000;

  useEffect(() => {
    setTimerActive(timerStateRef.current, isActive);
  }, [isActive]);

  function getDurationMs() {
    const { elapsedMs, activeSinceMs } = timerStateRef.current;
    return elapsedMs + (activeSinceMs == null ? 0 : Date.now() - activeSinceMs);
  }

  function recordChoice(correct: boolean) {
    const durationMs = getDurationMs();
    setEndTime((end) =>
      correct
        ? end == null
          ? durationMs
          : durationMs - end <= maxTimeBetweenChoices
            ? end
            : undefined
        : undefined,
    );
  }

  return {
    getDurationMs,
    recordChoice,
    endTime,
  };
}

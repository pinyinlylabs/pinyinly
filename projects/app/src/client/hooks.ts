import * as Haptics from "expo-haptics";
import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

/**
 * Helper for {@link React.useEffect} + {@link window.addEventListener} +
 * {@link window.removeEventListener} boilerplate. Web only.
 *
 * @example
 *
 * useEffect(
 *   () => windowEventListenerEffect(`storage`, (event) => {
 *     // …
 *   }),
 *   []
 * );
 */
export function windowEventListenerEffect<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => void,
): undefined | (() => void) {
  if (Platform.OS === `web`) {
    const ac = new AbortController();
    globalThis.addEventListener(type, listener, { signal: ac.signal });
    return () => {
      ac.abort();
    };
  }
}

/**
 * Helper for {@link React.useEffect} + {@link document.addEventListener} +
 * {@link document.removeEventListener} boilerplate. Web only.
 *
 * @example
 *
 * useEffect(
 *   () => documentEventListenerEffect(`storage`, (event) => {
 *     // …
 *   }),
 *   []
 * );
 */
export function documentEventListenerEffect<K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => void,
): undefined | (() => void) {
  if (Platform.OS === `web`) {
    const ac = new AbortController();
    document.addEventListener(type, listener, { signal: ac.signal });
    return () => {
      ac.abort();
    };
  }
}

/**
 * A hook that measures how long it takes to answer a multi-choice question.
 *
 * The time is measured to the first correct choice because it's assumed that if
 * a user picks one choice they know the other choice too, so by measuring the
 * first correct choice it's measuring their mental speed not their physical
 * agility with interacting with the UI. However if a wrong choice is the
 * "optimistic" time is released and the full duration is measured.
 */
export function useMultiChoiceQuizTimer() {
  const startTime = useMemo(() => Date.now(), []);
  const [endTime, setEndTime] = useState<number>();
  const maxTimeBetweenChoices = 4000;

  const recordChoice = useCallback((correct: boolean) => {
    setEndTime((end) =>
      correct
        ? end == null
          ? Date.now()
          : Date.now() - end <= maxTimeBetweenChoices
            ? end
            : undefined
        : undefined,
    );
  }, []);

  return {
    recordChoice,
    startTime,
    endTime,
  };
}

export function useQuizProgress() {
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const recordAnswer = useCallback((correct: boolean) => {
    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setAttemptCount(0);
    } else {
      setAttemptCount((prev) => prev + 1);
    }
  }, []);

  const progress =
    correctCount +
    // Give a diminishing progress for each attempt.
    (attemptCount === 0 ? 0 : (Math.log(attemptCount - 0.5) + 1.9) / 8.7);

  return { recordAnswer, progress };
}

export function hapticImpactIfMobile() {
  if (Platform.OS === `ios` || Platform.OS === `android`) {
    // Calling impactAsync on an unsupported platform (e.g. web) throws an
    // exception and will crash the app.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      (error: unknown) => {
        console.error(`Could not run haptic impact.`, error);
      },
    );
  }
}

type VoidFunction = (...args: never[]) => void;

/**
 * Similar to `useCallback` but offers better memoization for event handlers.
 *
 * Differences from `useCallback`:
 *
 * - The returned function is a stable reference, and will always be the same
 *   between renders.
 * - There is no dependency array.
 * - Properties or state accessed within the callback will always be "current"
 *   (good enough for event handlers anyway).
 */
export function useEventCallback<TCallback extends VoidFunction>(
  callback: TCallback,
): TCallback {
  // Keep track of the latest callback
  const latestRef = useRef(shouldNotBeInvokedBeforeMount as TCallback);

  useInsertionEffect(() => {
    latestRef.current = callback;
  }, [callback]);

  // @ts-expect-error: it's fine
  return useCallback((...args) => {
    // Avoid `this` referring to the ref when invoking the function.
    latestRef.current.apply(undefined, args);
  }, []);
}

function shouldNotBeInvokedBeforeMount() {
  throw new Error(
    `invoking useEvent before mounting violates the rules of React`,
  );
}

function useRenderGuardImpl(debugName: string) {
  const renders = useRef(0);
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    renders.current += 1;
    const now = Date.now();
    const elapsed = now - lastCheck.current;

    // Check every 5 seconds
    if (elapsed >= 5000) {
      // Error if there were more than 25 re-renders.
      if (renders.current > 25) {
        throw new Error(
          `${useRenderGuardImpl.name}(${debugName}) re-rendered ${renders.current} times in ${elapsed} ms`,
        );
      }
      renders.current = 0;
      lastCheck.current = now;
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

/**
 * A hook that monitors the number of re-renders occurs and throws an error if
 * too many happened. This makes it very obvious when there are re-rendering
 * bugs and makes tracking them down much simpler.
 *
 * Only runs in dev mode.
 */
export const useRenderGuard = __DEV__ ? useRenderGuardImpl : () => noOp;

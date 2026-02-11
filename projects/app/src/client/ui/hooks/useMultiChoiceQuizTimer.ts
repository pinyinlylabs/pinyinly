import { useCallback, useMemo, useState } from "react";

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

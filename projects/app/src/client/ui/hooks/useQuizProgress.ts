import { useState } from "react";

interface ProgressState {
  correctCount: number;
  attemptCount: number;
}

export function useQuizProgress() {
  "use memo";
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  // Store the previous state so we can restore it on undo
  const [prevState, setPrevState] = useState<ProgressState>();

  const recordAnswer = (correct: boolean) => {
    // Save current state before updating
    setPrevState({ correctCount, attemptCount });

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setAttemptCount(0);
    } else {
      setAttemptCount((prev) => prev + 1);
    }
  };

  const progress =
    correctCount +
    // Give a diminishing progress for each attempt.
    (attemptCount === 0 ? 0 : (Math.log(attemptCount - 0.5) + 1.9) / 8.7);

  const undo = () => {
    if (prevState != null) {
      setCorrectCount(prevState.correctCount);
      setAttemptCount(prevState.attemptCount);
      setPrevState(undefined);
    }
  };

  return { recordAnswer, progress, undo };
}

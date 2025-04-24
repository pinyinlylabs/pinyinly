import { useCallback, useState } from "react";

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

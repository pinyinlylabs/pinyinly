import {
  Easing,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Duration constant used by quiz animations.
 */
export const quizAnimationDuration = 100;

/**
 * Creates a subtle wobble animation for indicating an incorrect answer.
 * The wobble direction and magnitude is slightly randomized for visual variety.
 */
export const withIncorrectWobbleAnimation = () => {
  let offset = Math.random() * 4 - 2;
  offset += offset < 0 ? -0.5 : 0.5;

  return withSpring(`${offset}deg`, { duration: 2 * quizAnimationDuration });
};

/**
 * Creates a more aggressive shake animation, typically used when the user
 * tries to interact with an already-incorrect answer.
 */
export const withIncorrectShakeAnimation = () => {
  const delta = 3; // degrees
  const options = { duration: 80, easing: Easing.ease };
  return withSequence(
    withTiming(`-${delta}deg`, options),
    withTiming(`${delta}deg`, options),
    withTiming(`-${delta}deg`, options),
    withTiming(`${delta}deg`, options),
    withTiming(`0deg`, options),
  );
};

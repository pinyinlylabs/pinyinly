import { invariant } from "@haohaohow/lib/invariant";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
import round from "lodash/round";

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

const w = [
  0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
  0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
] as const;

export interface UpcomingReview {
  created: Date;
  stability: number;
  difficulty: number;
  due: Date;
}

/**
 * The formula used is :
 * $$D_0(G) = w_4 - (G-3) \cdot w_5 $$
 * $$D_0 = \min \lbrace \max \lbrace D_0(G),1 \rbrace,10 \rbrace$$
 * where the $$D_0(3)=w_4$$ when the first rating is good.
 *
 * @param {Grade} rating Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
 * @return {number} Difficulty $$D \in [1,10]$$
 */
function initDifficulty(rating: Rating): number {
  return round(Math.min(Math.max(w[4] - (rating - 3) * w[5], 1), 10), 8);
}

function daysDiff(before: Date, after: Date): number {
  return (after.getTime() - before.getTime()) / 1000 / 60 / 60 / 24;
}

function initStability(rating: Rating) {
  // Calculate retrievability 90% using the formula:
  //
  // $$ S_0(G) = w_{G-1}$$
  // $$S_0 = \max \lbrace S_0,0.1\rbrace $$
  return Math.max(w[(rating - 1) as 0 | 1 | 2 | 3], 0.1);
}

export function nextReview(
  lastReview: UpcomingReview | null,
  rating: Rating,
  /**
   * When the rating was made.
   *
   * This makes it easier to deterministically play forward a sequence of
   * ratings.
   */
  now = new Date(),
): UpcomingReview {
  const created = now;
  const stability =
    lastReview === null
      ? initStability(rating)
      : nextStability(lastReview, created, rating);
  const difficulty =
    lastReview === null
      ? initDifficulty(rating)
      : nextDifficulty(lastReview.difficulty, rating);
  const dueDuration = nextDueDuration(stability, rating);

  return {
    created,
    difficulty,
    stability,
    due: add(created, dueDuration),
  };
}

/**
 * @see The formula used is : {@link FSRSAlgorithm.calculate_interval_modifier}
 * @param {number} stability - Stability (interval when R=90%)
 */
function nextDueDuration(stability: number, rating: Rating): Duration {
  switch (rating) {
    case Rating.Again: {
      return { minutes: 1 };
    }
    case Rating.Hard: {
      return { minutes: 5 };
    }
    case Rating.Good:
    case Rating.Easy: {
      // Fall-through and use the curve.
      break;
    }
  }

  return {
    minutes: Math.round(
      24 *
        60 *
        // This returns in "days", multiply by 24*60 to turn into minutes.
        Math.min(
          stability * intervalModifier(0.9 /* 90% */),
          36_500 /* 100 years */,
        ),
    ),
  };
}

/**
 * The formula used is :
 * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{9 \cdot S})^{\text{DECAY}}$$
 * @param {number} elapsedDays t days since the last review
 * @param {number} stability Stability (interval when R=90%)
 * @return {number} r Retrievability (probability of recall)
 */
function forgettingCurve(elapsedDays: number, stability: number): number {
  return round(Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY), 8);
}

/**
 * The formula used is :
 * $$S^\prime_r(D,S,R,G) = S\cdot(e^{w_8}\cdot (11-D)\cdot S^{-w_9}\cdot(e^{w_{10}\cdot(1-R)}-1)\cdot w_{15}(\text{if} G=2) \cdot w_{16}(\text{if} G=4)+1)$$
 * @param {number} difficulty Difficulty D \in [1,10]
 * @param {number} stability Stability (interval when R=90%)
 * @param {number} retrievability Retrievability (probability of recall)
 * @param {Grade} rating Grade (Rating[0.again,1.hard,2.good,3.easy])
 * @return {number} S^\prime_r new stability after recall
 */
function nextStability(
  lastReview: UpcomingReview,
  nextCreated: Date,
  rating: Rating,
): number {
  if (rating === Rating.Again) {
    return lastReview.stability;
  }

  const elapsedDays = daysDiff(lastReview.created, nextCreated);
  const retrievability = forgettingCurve(elapsedDays, lastReview.stability);

  const hardPenalty = rating === Rating.Hard ? w[15] : 1;
  const easyBound = rating === Rating.Easy ? w[16] : 1;

  return round(
    lastReview.stability *
      (1 +
        Math.exp(w[8]) *
          (11 - lastReview.difficulty) *
          Math.pow(lastReview.stability, -w[9]) *
          (Math.exp((1 - retrievability) * w[10]) - 1) *
          hardPenalty *
          easyBound),
    8,
  );
}

/**
 * The formula used is:
 * $$\text{next}_d = D - w_6 \cdot (R - 2)$$
 * $$D^\prime(D,R) = w_5 \cdot D_0(2) +(1 - w_5) \cdot \text{next}_d$$
 * @param {number} lastDifficulty Difficulty $$D \in [1,10]$$
 * @param {Grade} rating Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
 * @return {number} $$\text{next}_D$$
 */
function nextDifficulty(lastDifficulty: number, rating: Rating): number {
  if (rating === Rating.Again) {
    return lastDifficulty;
  }

  /**
   * The formula used is:
   * $$\min \lbrace \max \lbrace D_0,1 \rbrace,10\rbrace$$
   * @param {number} difficulty $$D \in [1,10]$$
   */
  function constrainDifficulty(difficulty: number): number {
    return Math.min(Math.max(round(difficulty, 8), 1), 10);
  }
  /**
   * The formula used is :
   * $$w_7 \cdot \text{init} +(1 - w_7) \cdot \text{current}$$
   * @param {number} init $$w_2 : D_0(3) = w_2 + (R-2) \cdot w_3= w_2$$
   * @param {number} current $$D - w_6 \cdot (R - 2)$$
   * @return {number} difficulty
   */
  function meanReversion(init: number, current: number): number {
    return round(w[7] * init + (1 - w[7]) * current, 8);
  }

  const next_d = lastDifficulty - w[6] * (rating - 3); // TODO check rating - 3 algorithm
  return constrainDifficulty(meanReversion(w[4], next_d));
}

/**
 * @default DECAY = -0.5
 */
export const DECAY = -0.5;
/**
 * FACTOR = Math.pow(0.9, 1 / DECAY) - 1= 19 / 81
 *
 * $$\text{FACTOR} = \frac{19}{81}$$
 * @default FACTOR = 19 / 81
 */
export const FACTOR: number = 19 / 81;

/**
 * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-45
 *
 * The formula used is: $$I(r,s) = (r^{\frac{1}{DECAY}} - 1) / FACTOR \times s$$
 * @param requestRetentionPercentile 0<request_retention<=1,Requested retention rate
 * @throws {Error} Requested retention rate should be in the range (0,1]
 */
function intervalModifier(requestRetentionPercentile: number): number {
  invariant(requestRetentionPercentile > 0 && requestRetentionPercentile <= 1);

  return round(
    (Math.pow(requestRetentionPercentile, 1 / DECAY) - 1) / FACTOR,
    8,
  );
}

import { invariant } from "@haohaohow/lib/invariant";
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
  0.5701, // initial stability (Again)
  1.4436, // initial stability (Hard)
  4.1386, // initial stability (Good)
  10.9355, // initial stability (Easy)
  5.1443, // initial difficulty (Good)
  1.2006, // initial difficulty (multiplier)
  0.8627, // difficulty (multiplier)
  0.0362, // difficulty (multiplier)
  1.629, // stability (exponent)
  0.1342, // stability (negative power)
  1.0166, // stability (exponent)
  2.1174, // fail stability (multiplier)
  0.0839, // fail stability (negative power)
  0.3204, // fail stability (power)
  1.4676, // fail stability (exponent)
  0.219, // stability (multiplier for Hard)
  2.8237, // stability (multiplier for Easy)
] as const;

export interface FsrsState {
  prevReviewAt: Date;
  nextReviewAt: Date;
  stability: number;
  difficulty: number;
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
  currentState: FsrsState | null,
  rating: Rating,
  /**
   * When the rating was made.
   *
   * This makes it easier to deterministically play forward a sequence of
   * ratings.
   */
  now = new Date(),
): FsrsState {
  const created = now;

  if (currentState != null && currentState.prevReviewAt >= now) {
    // It's important that the stability/difficulty as it's part of the seed to
    // determine the quiz order.
    console.warn(
      `previous FSRS is not in the past, stability/difficulty may not change`,
    );
  }

  const stability =
    currentState === null
      ? initStability(rating)
      : nextStability(currentState, created, rating);
  const difficulty =
    currentState === null
      ? initDifficulty(rating)
      : nextDifficulty(currentState.difficulty, rating);
  const dueDuration = nextDueDuration(stability, rating);

  if (currentState != null && rating !== Rating.Again) {
    invariant(
      difficulty !== currentState.difficulty ||
        stability !== currentState.stability,
      `neither stability nor difficulty changed after review`,
    );
  }

  return {
    prevReviewAt: created,
    difficulty,
    stability,
    nextReviewAt: add(created, dueDuration),
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
  lastReview: FsrsState,
  nextCreated: Date,
  rating: Rating,
): number {
  const elapsedDays = daysDiff(lastReview.prevReviewAt, nextCreated);
  const retrievability = forgettingCurve(elapsedDays, lastReview.stability);

  if (rating === Rating.Again) {
    // implementation from next_forget_stability()
    return constrainStability(
      w[11] *
        Math.pow(lastReview.difficulty, -w[12]) *
        (Math.pow(lastReview.stability + 1, w[13]) - 1) *
        Math.exp((1 - retrievability) * w[14]),
    );
  }

  const hardPenalty = rating === Rating.Hard ? w[15] : 1;
  const easyBound = rating === Rating.Easy ? w[16] : 1;

  // implementation from next_recall_stability()
  return constrainStability(
    lastReview.stability *
      (1 +
        Math.exp(w[8]) *
          (11 - lastReview.difficulty) *
          Math.pow(lastReview.stability, -w[9]) *
          (Math.exp((1 - retrievability) * w[10]) - 1) *
          hardPenalty *
          easyBound),
  );
}

/**
 * The formula used is:
 * $$\min \lbrace \max \lbrace D_0,1 \rbrace,10\rbrace$$
 * @param {number} difficulty $$D \in [1,10]$$
 */
function constrainDifficulty(difficulty: number): number {
  return round(Math.min(Math.max(round(difficulty, 8), 1), 10), 8);
}

function constrainStability(stability: number): number {
  return round(Math.min(Math.max(round(stability, 8), 0.1), 36_500), 8);
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

/**
 * Return true if the skill is learned enough to build upon. (i.e. if other
 * skills depend on this, they can be introduced at this point).
 */
export function fsrsIsStable(options: Pick<FsrsState, `stability`>): boolean {
  return options.stability >= 30;
}

export function ratingName(rating: Rating) {
  return {
    [Rating.Again]: `Again`,
    [Rating.Hard]: `Hard`,
    [Rating.Good]: `Good`,
    [Rating.Easy]: `Easy`,
  }[rating];
}

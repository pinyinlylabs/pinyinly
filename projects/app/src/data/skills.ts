import type { HanziWordWithMeaning } from "@/dictionary/dictionary";
import {
  decomposeHanzi,
  graphemeHasGlyph,
  hanziFromHanziWord,
  hanziTextFromHanziGrapheme,
  lookupHanzi,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import { startPerformanceMilestones } from "@/util/devtools";
import {
  fsrsIsForgotten,
  fsrsIsStable,
  fsrsPredictedRecallProbability,
  fsrsStabilityThreshold,
  Rating,
} from "@/util/fsrs";
import { makePRNG } from "@/util/random";
import {
  emptyArray,
  emptySet,
  inverseSortComparator,
  memoize1,
  MinHeap,
  mutableArrayFilter,
  sortComparatorDate,
  sortComparatorNumber,
  topK,
} from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";
import { sub } from "date-fns/sub";
import { subDays } from "date-fns/subDays";
import type { DeepReadonly } from "ts-essentials";
import { isHanziGrapheme, splitHanziText } from "./hanzi";
import type {
  HanziText,
  HanziWord,
  HanziWordSkillKind,
  QuestionFlagType,
  SrsStateType,
  UnsavedSkillRating,
} from "./model";
import {
  hanziWordSkillKinds,
  QuestionFlagKind,
  SkillKind,
  SrsKind,
} from "./model";
import type {
  HanziWordSkill,
  PinyinFinalAssociationSkill,
  PinyinInitialAssociationSkill,
  Skill,
  SkillRating,
} from "./rizzleSchema";
import { rSkillKind } from "./rizzleSchema";

export interface Node {
  skill: Skill;
  dependencies: Set<Skill>; // todo: when are weights added?
}

export type SkillLearningGraph = Map<Skill, Node>;

export async function skillLearningGraph(options: {
  targetSkills: Skill[];
}): Promise<SkillLearningGraph> {
  const graph: SkillLearningGraph = new Map();

  async function addSkill(skill: Skill): Promise<void> {
    // Skip doing any work if the skill is already in the graph.
    if (graph.has(skill)) {
      return;
    }

    const dependencies = await skillDependencies(skill);

    const node: Node = { skill, dependencies: new Set(dependencies) };
    graph.set(skill, node);

    for (const dependency of dependencies) {
      await addSkill(dependency);
    }
  }

  for (const skill of options.targetSkills) {
    await addSkill(skill);
  }

  return graph;
}

/**
 * Checks if the given skill kind represents a difficulty increase.
 */
export function isHarderDifficultyStyleSkillKind(
  skillKind: SkillKind,
): boolean {
  return (
    skillKind === SkillKind.HanziWordToPinyinFinal ||
    skillKind === SkillKind.HanziWordToPinyinTone ||
    skillKind === SkillKind.HanziWordToPinyinTyped ||
    skillKind === SkillKind.HanziWordToGlossTyped
  );
}

export function isHanziWordToPinyinSkillKind(skillKind: SkillKind): boolean {
  return (
    skillKind === SkillKind.HanziWordToPinyinInitial ||
    skillKind === SkillKind.HanziWordToPinyinFinal ||
    skillKind === SkillKind.HanziWordToPinyinTone ||
    skillKind === SkillKind.HanziWordToPinyinTyped
  );
}

export const skillKindFromSkill = (skill: Skill): SkillKind => {
  const result = /^(.+?):/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);

  return rSkillKind().unmarshal(marshaledSkillKind);
};

export const hanziWordFromSkill = (skill: HanziWordSkill): HanziWord => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind, hanziWord] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);
  invariant(hanziWord != null, `couldn't parse hanzi word (after :)`);

  return hanziWord as HanziWord;
};

export const isHanziWordSkill = (skill: Skill): skill is HanziWordSkill => {
  const skillKind = skillKindFromSkill(skill);
  return (hanziWordSkillKinds as SkillKind[]).includes(skillKind);
};

export const initialFromPinyinInitialAssociationSkill = (
  skill: PinyinInitialAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind, initial] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);
  invariant(initial != null, `couldn't parse pinyin initial (after :)`);

  return initial;
};

export const finalFromPinyinFinalAssociationSkill = (
  skill: PinyinFinalAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind, final] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);
  invariant(final != null, `couldn't parse pinyin final (after :)`);

  return final;
};

export async function skillDependencies(skill: Skill): Promise<Skill[]> {
  const deps: Skill[] = [];
  const skillKind = skillKindFromSkill(skill);

  switch (skillKind) {
    case SkillKind.GlossToHanziWord: {
      skill = skill as HanziWordSkill;
      // Learn the Hanzi -> Gloss first. It's easier to read than write (for chinese characters).
      deps.push(hanziWordToGloss(hanziWordFromSkill(skill)));
      break;
    }

    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      // If it's the component form of another base hanzi, learn that
      // first because it can help understand the meaning from the shape.
      if (isHanziGrapheme(hanzi)) {
        const meaning = await lookupHanziWord(hanziWord);

        if (
          meaning?.componentFormOf != null &&
          // Avoid circular loops e.g. he:老:old→he:耂:old→he:老:old
          (await decomposeHanzi(meaning.componentFormOf).then(
            (x) => !x.includes(hanzi),
          ))
        ) {
          const hanziWordWithMeaning = await hackyGuessHanziWordToLearn(
            meaning.componentFormOf,
          );
          if (hanziWordWithMeaning != null) {
            const [hanziWord] = hanziWordWithMeaning;
            deps.push(hanziWordToGloss(hanziWord));
          }
        }
      }

      // Learn the components of a hanzi word first.
      for (const hanziGrapheme of await decomposeHanzi(
        hanziFromHanziWord(hanziWordFromSkill(skill)),
      )) {
        if (await graphemeHasGlyph(hanziGrapheme)) {
          // Check if the grapheme was already added as a dependency by being
          // referenced in the gloss hint.
          const depAlreadyAdded = deps.some((x) => {
            if (skillKindFromSkill(x) === SkillKind.HanziWordToGloss) {
              skill = skill as HanziWordSkill;
              return (
                hanziFromHanziWord(hanziWordFromSkill(skill)) ===
                hanziTextFromHanziGrapheme(hanziGrapheme)
              );
            }
            return false;
          });

          // If the grapheme wasn't already added, add it as a dependency by
          // guessing what disambugation to use for the hanzi.
          if (!depAlreadyAdded) {
            const hanziWordWithMeaning =
              await hackyGuessHanziWordToLearn(hanziGrapheme);
            if (hanziWordWithMeaning != null) {
              const [hanziWord] = hanziWordWithMeaning;
              deps.push(hanziWordToGloss(hanziWord));
            }
          }
        }
      }
      break;
    }

    case SkillKind.HanziWordToGlossTyped: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      deps.push(hanziWordToGloss(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinTyped: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      // Make sure it's valid to learn pinyin for this hanzi word.
      const meaning = await lookupHanziWord(hanziWord);
      invariant(meaning?.pinyin != null, `no pinyin for ${hanziWord}`);

      // Learn the Hanzi -> Gloss first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToGloss(hanziWord));

      // If the hanzi word is multiple characters (e.g. 为什么:why) learn the
      // meaning of each one separately.
      const graphemes = splitHanziText(hanzi);
      if (graphemes.length > 1) {
        for (const grapheme of graphemes) {
          if (await graphemeHasGlyph(grapheme)) {
            // We only have a character, but need a hanzi word to learn. So make
            // the best guess for the hanzi word to learn.
            for (const [charHanziWord, charMeaning] of await lookupHanzi(
              grapheme,
            )) {
              if (charMeaning.pinyin != null) {
                deps.push(hanziWordToPinyinTyped(charHanziWord));
                break;
              }
            }
          }
        }
      } else {
        // Otherwise, it's a single character, and can learn the tone first.
        deps.push(hanziWordToPinyinTone(hanziWord));
      }
      break;
    }

    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziGrapheme(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinFinal(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziGrapheme(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinInitial(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziGrapheme(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      // Learn the Hanzi -> Gloss first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToGloss(hanziWord));
      break;
    }

    case SkillKind.PinyinToHanziWord: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      // Learn going from Hanzi -> Pinyin first.
      deps.push(
        hanziWordToPinyinInitial(hanziWord),
        hanziWordToPinyinFinal(hanziWord),
        hanziWordToPinyinTone(hanziWord),
      );
      break;
    }

    case SkillKind.Deprecated:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.ImageToHanziWord:
    case SkillKind.PinyinInitialAssociation:
    case SkillKind.PinyinFinalAssociation: {
      // Leaf skills (no dependencies).
      break;
    }
  }
  return deps;
}

async function hackyGuessHanziWordToLearn(
  hanzi: HanziText,
): Promise<DeepReadonly<HanziWordWithMeaning> | undefined> {
  const hanziWords = await lookupHanzi(hanzi);
  for (const item of hanziWords) {
    return item;
  }
}

export function hanziWordSkill(
  type: HanziWordSkillKind,
  hanziWord: HanziWord,
): HanziWordSkill {
  return `${rSkillKind().marshal(type)}:${hanziWord}` as HanziWordSkill;
}

export const hanziWordToGloss = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToGloss, hanziWord);

export const hanziWordToGlossTyped = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToGlossTyped, hanziWord);

export const hanziWordToPinyinTyped = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToPinyinTyped, hanziWord);

export const hanziWordToPinyinInitial = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToPinyinInitial, hanziWord);

export const hanziWordToPinyinFinal = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToPinyinFinal, hanziWord);

export const hanziWordToPinyinTone = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.HanziWordToPinyinTone, hanziWord);

export const glossToHanziWord = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillKind.GlossToHanziWord, hanziWord);

export function pinyinFinalAssociation(
  final: string,
): PinyinInitialAssociationSkill {
  return `${rSkillKind().marshal(SkillKind.PinyinFinalAssociation)}:${final}` as PinyinInitialAssociationSkill;
}

export function pinyinInitialAssociation(
  initial: string,
): PinyinInitialAssociationSkill {
  return `${rSkillKind().marshal(SkillKind.PinyinInitialAssociation)}:${initial}` as PinyinInitialAssociationSkill;
}

export type SkillReviewQueueItem = {
  skill: Skill;
  flag?: QuestionFlagType;
};

export interface SkillReviewQueue {
  /**
   * The skills in the review queue.
   */
  items: SkillReviewQueueItem[];
  /**
   * The number of items in the queue that are blocked because their dependencies
   * aren't met yet.
   */
  blockedCount: number;
  /**
   * The number of items in the queue that need to be retried because they were
   * answered incorrectly.
   */
  retryCount: number;
  /**
   * The number of items in the queue due for review.
   */
  dueCount: number;
  /**
   * The number of new (never seen before) content items in the queue that are not
   * harder difficulty variations.
   */
  newContentCount: number;
  /**
   * The number of new (never seen before) items in the queue that are
   * harder difficulty variations of existing skills.
   */
  newDifficultyCount: number;
  /**
   * When the number of "due" items will increase.
   */
  newDueAt: Date | null;
  /**
   * When the number of "over due" items will increase.
   */
  newOverDueAt: Date | null;
  /**
   * The number of items in the queue overdue for review.
   */
  overDueCount: number;
}

export interface RankGoal {
  skill: SkillKind;
  stability: number;
}

export interface RankRule {
  rank: number;
  goals: RankGoal[];
}

export type RankRules = RankRule[];

const stability = fsrsStabilityThreshold;
export const rankRules: RankRules = [
  {
    rank: 1,
    goals: [
      { skill: SkillKind.HanziWordToGloss, stability },
      { skill: SkillKind.HanziWordToPinyinInitial, stability },
    ],
  },
  {
    rank: 2,
    goals: [
      { skill: SkillKind.HanziWordToGloss, stability },
      { skill: SkillKind.HanziWordToPinyinInitial, stability },
      { skill: SkillKind.HanziWordToPinyinFinal, stability },
    ],
  },
  {
    rank: 3,
    goals: [
      { skill: SkillKind.HanziWordToGloss, stability },
      { skill: SkillKind.HanziWordToPinyinInitial, stability },
      { skill: SkillKind.HanziWordToPinyinFinal, stability },
      { skill: SkillKind.HanziWordToPinyinTone, stability },
    ],
  },
  {
    rank: 4,
    goals: [
      { skill: SkillKind.HanziWordToGloss, stability },
      { skill: SkillKind.HanziWordToPinyinInitial, stability },
      { skill: SkillKind.HanziWordToPinyinFinal, stability },
      { skill: SkillKind.HanziWordToPinyinTone, stability },
      { skill: SkillKind.HanziWordToPinyinTyped, stability },
    ],
  },
];

export type RankedHanziWord = {
  // Including the hanzi word itself for convenience for calling code to avoid
  // the need for it to allocate an whole new set of objects with this included.
  hanziWord: HanziWord;
  /**
   * - `0` for hanzi words that have never been quizzed.
   * - `1` for the first rank.
   * - `2` for the second rank, etc.
   */
  rank: number;
  completion: number;
};

export function getHanziWordRank({
  hanziWord,
  skillSrsStates,
  rankRules,
}: {
  hanziWord: HanziWord;
  skillSrsStates: Map<Skill, SrsStateType>;
  rankRules: RankRules;
}): RankedHanziWord {
  let highestRank = 0;
  let highestRankCompletion = 0;

  const skillStabilitiesOffsets = new Map<Skill, number>();

  for (const rule of rankRules) {
    let rankCompletionNumerator = null;
    let rankCompletionDenominator = 0;

    for (const goal of rule.goals) {
      const skill = hanziWordSkill(goal.skill as HanziWordSkillKind, hanziWord);

      const stabilityOffset = skillStabilitiesOffsets.get(skill) ?? 0;
      skillStabilitiesOffsets.set(skill, goal.stability);

      const rankCompletionNumeratorRange = goal.stability - stabilityOffset;
      rankCompletionDenominator += rankCompletionNumeratorRange;

      const srsState = skillSrsStates.get(skill);
      switch (srsState?.kind) {
        case SrsKind.FsrsFourPointFive: {
          rankCompletionNumerator =
            (rankCompletionNumerator ?? 0) +
            Math.min(
              Math.max(srsState.stability - stabilityOffset, 0),
              rankCompletionNumeratorRange,
            );
          break;
        }
        case undefined:
        case SrsKind.Mock: {
          // Mock SRS state is used for skills that have never been introduced.
          // So we can skip it.
          break;
        }
      }
    }

    // If there's no progress towards this rank, skip it.
    if (rankCompletionNumerator == null) {
      // If there are no goals for this rule, skip it.
      continue;
    }

    // If there's no rank yet, but some progress has been made on this rank,
    // then make this the current rank.
    if (highestRank == 0) {
      highestRank = rule.rank;
    }

    const rankCompletion =
      rankCompletionDenominator === 0
        ? 1
        : Math.min(rankCompletionNumerator / rankCompletionDenominator, 1);

    // If the goals for this rank are completed, progress to the next rank.
    if (rankCompletion === 1) {
      highestRank = rule.rank + 1;
      highestRankCompletion = 0;
    }

    if (rule.rank === highestRank) {
      highestRankCompletion = rankCompletion;
    }
  }

  return { hanziWord, rank: highestRank, completion: highestRankCompletion };
}

/**
 * Determines if we should prioritize a pronunciation skill after a successful
 * hanzi-to-english review, based on the user's competency with pronunciation skills.
 */
function getReactivePronunciationSkills({
  recentSkillRatingHistory,
  skillSrsStates,
  graph,
  now,
}: {
  recentSkillRatingHistory: ({ skill: Skill } & Pick<
    SkillRating,
    `rating` | `createdAt`
  >)[];
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  graph: SkillLearningGraph;
  now: Date;
}): readonly Skill[] {
  const lastSkillRating = recentSkillRatingHistory[0];

  // Check if the most recent skill review was a successful HanziWordToGloss skill
  if (
    lastSkillRating == null ||
    skillKindFromSkill(lastSkillRating.skill) !== SkillKind.HanziWordToGloss
  ) {
    // Skipping because the most recent review wasn't hanzi-to-gloss question.
    return emptyArray;
  }

  if (lastSkillRating.rating === Rating.Again) {
    // Skipping because the most recent review was not successful.
    return emptyArray;
  }

  // Check if the user has sufficient competency with pronunciation skills
  // We require at least basic competency (rank 1 or higher) with pronunciation skills
  const hanziWord = hanziWordFromSkill(lastSkillRating.skill as HanziWordSkill);

  // Find the corresponding pronunciation skill
  const pronunciationSkill = hanziWordToPinyinTyped(hanziWord);

  for (const dep of walkSkillAndDependencies(graph, pronunciationSkill)) {
    if (!isHanziWordToPinyinSkillKind(skillKindFromSkill(dep))) {
      // Skipping because it's not a pronunciation skill, we're only interested
      // in reviewing the pronunciation after a meaning review.
      continue;
    }

    const srsState = skillSrsStates.get(dep);

    if (needsToBeIntroduced(srsState, now)) {
      // Skipping because the skill hasn't been introduced yet, and reviewing it
      // would be too hard for the user.
      continue;
    }

    if (isVeryEasy(srsState, now)) {
      // Skipping because it's too easy, it would feel like you're wasting your
      // time if you're answering questions that are too easy for you.
      continue;
    }

    return [dep];
  }

  return emptyArray;
}

export type LatestSkillRating = Pick<
  SkillRating,
  `skill` | `rating` | `createdAt`
>;

export function skillReviewQueue({
  graph,
  skillSrsStates,
  latestSkillRatings,
  isStructuralHanzi,
  now = new Date(),
  maxQueueItems = Infinity,
}: {
  graph: SkillLearningGraph;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  latestSkillRatings: ReadonlyMap<Skill, LatestSkillRating>;
  isStructuralHanzi: (hanzi: HanziText) => boolean;
  now?: Date;
  maxQueueItems?: number;
}): SkillReviewQueue {
  // Kahn topological sort
  const inDegree = new Map<Skill, number>();
  const queue: Skill[] = [];
  // Which skills have been included in the learning order.
  // This is used to avoid adding the same skill multiple times.
  const learningOrderIncluded = new Set<Skill>();
  const learningOrderRetry: [Skill, Date][] = [];
  const learningOrderOverDue: [Skill, Date][] = [];
  const learningOrderDue: [Skill, Date][] = [];
  const learningOrderNewCandidates: Skill[] = [];
  const learningOrderNotDue: [Skill, SrsStateType | undefined][] = [];
  const learningOrderBlocked: Skill[] = [];
  let newOverDueAt: Date | null = null;
  let newDueAt: Date | null = null;

  const perfMilestone = startPerformanceMilestones(
    `skillReviewQueue` satisfies NameOf<typeof skillReviewQueue>,
  );

  function enqueueReviewOnce(
    skill: Skill,
    srsState: SrsStateType | null | undefined,
  ) {
    if (learningOrderIncluded.has(skill)) {
      return;
    }
    learningOrderIncluded.add(skill);

    if (srsState == null || needsToBeIntroduced(srsState, now)) {
      if (hasStableDependencies(skill)) {
        learningOrderNewCandidates.push(skill);
      } else {
        learningOrderBlocked.push(skill);
      }
    } else {
      const skillRating = latestSkillRatings.get(skill);
      if (skillRating?.rating === Rating.Again) {
        learningOrderRetry.push([skill, skillRating.createdAt]);
      } else if (srsState.nextReviewAt > now) {
        // Check if it should be the new newDueAt.
        if (newDueAt == null || newDueAt > srsState.nextReviewAt) {
          newDueAt = srsState.nextReviewAt;
        }

        learningOrderNotDue.push([skill, srsState]);
      } else if (isOverdue(srsState, now)) {
        learningOrderOverDue.push([skill, srsState.nextReviewAt]);
      } else {
        // Check if it should be the new newOverDueAt.
        if (newOverDueAt == null || newOverDueAt > srsState.nextReviewAt) {
          newOverDueAt = srsState.nextReviewAt;
        }

        learningOrderDue.push([skill, srsState.nextReviewAt]);
      }
    }
  }

  perfMilestone(`enqueueReview`);

  // Add already introduced skills to the learning order, unless they're too
  // stale and probably forgotten.
  for (const [skill, srsState] of skillSrsStates) {
    if (!needsToBeIntroduced(srsState, now)) {
      enqueueReviewOnce(skill, srsState);
    }
  }

  perfMilestone(`computeInDegrees`);

  // Compute in-degree
  for (const [skill, node] of graph.entries()) {
    if (!inDegree.has(skill)) {
      inDegree.set(skill, 0);
    }

    for (const dependency of node.dependencies) {
      inDegree.set(dependency, (inDegree.get(dependency) ?? 0) + 1);
    }
  }

  perfMilestone(`findZeroInDegreeNodes`);

  const hasStableDependencies = memoize1((skill: Skill): boolean => {
    for (const dep of graph.get(skill)?.dependencies ?? emptySet) {
      const srsState = skillSrsStates.get(dep);

      if (!isStable(srsState) || !hasStableDependencies(dep)) {
        return false;
      }
    }

    return true;
  });

  // Find skills that have no prerequisites
  for (const [skill, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(skill);
    }
  }

  perfMilestone(`processQueue`);

  // Process queue
  while (queue.length > 0) {
    const skill = queue.shift();
    invariant(skill != null);

    const srsState = skillSrsStates.get(skill);
    enqueueReviewOnce(skill, srsState);

    const node = graph.get(skill);
    invariant(node != null);
    for (const dependent of node.dependencies) {
      const cur = inDegree.get(dependent);
      invariant(cur != null);
      const newValue = cur - 1;
      inDegree.set(dependent, newValue);
      if (newValue === 0) {
        queue.push(dependent);
      }
    }
  }

  perfMilestone(`countUnstableSkills`);

  // At this point there's an unbounded number of new skills, so we need to
  // enforce a throttle to avoid overwhelming the user with too many new skills
  // in a short period of time. So only take a fixed amount of the new
  // candidates and mark the rest as blocked.
  const learningOrderNewContent: Skill[] = [];
  const learningOrderNewDifficulty: Skill[] = [];

  // Calculate how many unstable skills there are for each skill kind.
  const unstableSkillCounts = new Map<SkillKind, number>();
  for (const [skill, srsState] of skillSrsStates) {
    const alreadyIntroduced = !needsToBeIntroduced(srsState, now);
    if (alreadyIntroduced && !isStable(srsState)) {
      const skillKind = skillKindFromSkill(skill);
      const count = unstableSkillCounts.get(skillKind) ?? 0;
      unstableSkillCounts.set(skillKind, count + 1);
    }
  }

  perfMilestone(`segmentWordsAndComponents`);

  // The candidates come out in reverse order from the above algorithm, so flip
  // them so that it's in proper queue order.
  learningOrderNewCandidates.reverse();

  // Split out components ("structural") and words, so that words are prioritized first for
  // learning as they're more useful to people trying to apply their knowledge.
  const learningOrderNewWordCandidates: Skill[] = [];
  const learningOrderNewComponentCandidates: Skill[] = [];
  for (const skill of learningOrderNewCandidates) {
    if (
      isHanziWordSkill(skill) &&
      isStructuralHanzi(hanziFromHanziWord(hanziWordFromSkill(skill)))
    ) {
      learningOrderNewComponentCandidates.push(skill);
    } else {
      learningOrderNewWordCandidates.push(skill);
    }
  }

  perfMilestone(`segmentNewSkills`);

  // Check if introducing a skill would be too overwhelming. There is a limit on
  // how many unstable skills can be introduced at once. This is to avoid
  // overwhelming the user with too many new skills at once.
  function hasLearningCapacityForNewSkill(skill: Skill): boolean {
    // 💭 maybe this should be dynamic, based on the number of skills that have
    // been learned. So if you know 1000 words you can probably learn more at
    // once than if you only know 10 words.
    const throttleLimit = 15;
    return (
      (unstableSkillCounts.get(skillKindFromSkill(skill)) ?? 0) +
        (learningOrderNewContent.length + learningOrderNewDifficulty.length) <
      throttleLimit
    );
  }

  for (const skillGroup of [
    learningOrderNewWordCandidates,
    learningOrderNewComponentCandidates,
  ]) {
    for (const skill of skillGroup) {
      if (hasLearningCapacityForNewSkill(skill)) {
        if (isHarderDifficultyStyleSkillKind(skillKindFromSkill(skill))) {
          learningOrderNewDifficulty.push(skill);
        } else {
          learningOrderNewContent.push(skill);
        }
      } else {
        learningOrderBlocked.push(skill);
      }
    }
  }
  learningOrderBlocked.reverse();

  perfMilestone(`recentSkillRatingHistory`);

  const recentSkillRatingHistoryHeap = new MinHeap<LatestSkillRating>(
    inverseSortComparator(sortComparatorDate(({ createdAt }) => createdAt)),
    20,
  );
  for (const rating of latestSkillRatings.values()) {
    recentSkillRatingHistoryHeap.insert(rating);
  }
  const recentSkillRatingHistory = recentSkillRatingHistoryHeap.toArray();

  perfMilestone(`reactiveItems`);

  const reactiveItems = [
    // Check if we should prioritize a pronunciation skill after successful hanzi-to-english review
    ...getReactivePronunciationSkills({
      recentSkillRatingHistory,
      skillSrsStates,
      graph,
      now,
    }),
  ];

  // Remove reactive items from the other queues so that items aren't duplicated
  // and counts are correct.

  mutableArrayFilter(
    learningOrderOverDue,
    ([skill]) => !reactiveItems.includes(skill),
  );
  mutableArrayFilter(
    learningOrderDue,
    ([skill]) => !reactiveItems.includes(skill),
  );
  mutableArrayFilter(
    learningOrderNewContent,
    (skill) => !reactiveItems.includes(skill),
  );
  mutableArrayFilter(
    learningOrderNewDifficulty,
    (skill) => !reactiveItems.includes(skill),
  );
  mutableArrayFilter(
    learningOrderNotDue,
    ([skill]) => !reactiveItems.includes(skill),
  );

  perfMilestone(`queueItems`);

  // Build items array and track index ranges
  const items: SkillReviewQueueItem[] = [];

  // 1. Retry items
  for (const [skill] of topK(
    learningOrderRetry,
    maxQueueItems - items.length,
    inverseSortComparator(sortComparatorDate(([, x]) => x)),
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.Retry } });
  }

  // 2. Reactive items
  for (const skill of reactiveItems.slice(0, maxQueueItems - items.length)) {
    items.push({ skill });
  }

  // 3. Overdue items
  for (const [skill] of topK(
    learningOrderOverDue,
    maxQueueItems - items.length,
    inverseSortComparator(sortComparatorDate(([, x]) => x)),
  )) {
    const srsState = nonNullable(skillSrsStates.get(skill));
    const overDueDate = add(srsState.nextReviewAt, skillDueWindow);
    items.push({
      skill,
      flag: {
        kind: QuestionFlagKind.Overdue,
        interval: interval(overDueDate.getTime(), now),
      },
    });
  }

  // 4. Due items
  for (const [skill] of topK(
    learningOrderDue,
    maxQueueItems - items.length,
    sortComparatorDate(([, x]) => x),
  )) {
    items.push({ skill });
  }

  // 5. New content items
  for (const skill of learningOrderNewContent.slice(
    0,
    maxQueueItems - items.length,
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.NewSkill } });
  }

  // 6. New difficulty items
  for (const skill of learningOrderNewDifficulty.slice(
    0,
    maxQueueItems - items.length,
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.NewDifficulty } });
  }

  // 7. Not due items
  for (const skill of randomPickSkillsForReview(
    learningOrderNotDue,
    maxQueueItems - items.length,
    now,
  )) {
    items.push({ skill });
  }

  // 8. Blocked items
  for (const skill of learningOrderBlocked.slice(
    0,
    maxQueueItems - items.length,
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.Blocked } });
  }

  perfMilestone(`prepareFinalResult`);

  invariant(items.length <= maxQueueItems);

  try {
    return {
      items,
      blockedCount: learningOrderBlocked.length,
      retryCount: learningOrderRetry.length,
      dueCount: learningOrderDue.length,
      overDueCount: learningOrderOverDue.length,
      newContentCount: learningOrderNewContent.length,
      newDifficultyCount: learningOrderNewDifficulty.length,
      newDueAt,
      newOverDueAt,
    };
  } finally {
    perfMilestone();
  }
}

export function* walkSkillAndDependencies(
  graph: SkillLearningGraph,
  skill: Skill,
): Generator<Skill> {
  const visited = new Set<Skill>();
  const stack = [skill];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null) {
      break;
    }

    if (!visited.has(current)) {
      visited.add(current);
      yield current;
      const node = graph.get(current);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            stack.push(dep);
          }
        }
      }
    }
  }
}

/**
 * Randomly pick skills for review based on their SRS state to form a
 * probability distribution weighted by each skill's recall probability. It's
 * designed to be efficient and deterministic so it can be tested and
 * predictable.
 *
 * Having randomness makes the quiz more interesting, otherwise you would be
 * stuck in answering the same sequence of questions over and over.
 */
export const randomPickSkillsForReview = (
  skillStates: readonly [Skill, SrsStateType | undefined][],
  limit = Infinity,
  /**
   * The current time to use for SRS recall probability calculations.
   *
   * This is also used as the random seed, so it can be fixed for testing.
   */
  now = new Date(),
): Skill[] => {
  const skillStrength = new Map<Skill, number>();

  const random = makePRNG(now.getTime());

  for (const [skill, srsState] of skillStates) {
    const recallProbability =
      srsState?.kind === SrsKind.FsrsFourPointFive
        ? fsrsPredictedRecallProbability(srsState, now)
        : 0.5;

    // Multiplying by a random value has the same effect as a weighted random
    // sort.
    skillStrength.set(skill, random() * recallProbability);
  }

  return topK(
    skillStates,
    limit,
    sortComparatorNumber(([skill]) => skillStrength.get(skill) ?? 0),
  ).map(([skill]) => skill);
};

const skillKindShorthandMapping: Record<SkillKind, string> = {
  [SkillKind.Deprecated_EnglishToRadical]: `[deprecated]`,
  [SkillKind.Deprecated_PinyinToRadical]: `[deprecated]`,
  [SkillKind.Deprecated_RadicalToEnglish]: `[deprecated]`,
  [SkillKind.Deprecated_RadicalToPinyin]: `[deprecated]`,
  [SkillKind.Deprecated]: `[deprecated]`,
  [SkillKind.GlossToHanziWord]: `EN → 中文`,
  [SkillKind.HanziWordToGloss]: `中文 → EN`,
  [SkillKind.HanziWordToGlossTyped]: `中文 → EN`,
  [SkillKind.HanziWordToPinyinTyped]: `中文 → PY`,
  [SkillKind.HanziWordToPinyinFinal]: `中文 → PY⁻ᶠ`,
  [SkillKind.HanziWordToPinyinInitial]: `中文 → PYⁱ⁻`,
  [SkillKind.HanziWordToPinyinTone]: `中文 → PYⁿ`,
  [SkillKind.ImageToHanziWord]: `🏞️ → 中文`,
  [SkillKind.PinyinFinalAssociation]: `PY⁻ᶠ → ✦`,
  [SkillKind.PinyinInitialAssociation]: `PYⁱ⁻ → ✦`,
  [SkillKind.PinyinToHanziWord]: `PY → 中文`,
};

export function skillKindToShorthand(skillKind: SkillKind): string {
  return skillKindShorthandMapping[skillKind];
}

/**
 * You get 1 day to review a skill before it becomes over-due.
 */
export const skillDueWindow: Duration = { hours: 24 };

export function isOverdue(srsState: SrsStateType, now: Date): boolean {
  return srsState.nextReviewAt < sub(now, skillDueWindow);
}

export function computeSkillRating(opts: {
  skill: Skill;
  correct: boolean;
  durationMs: number;
}): UnsavedSkillRating {
  const { skill, correct, durationMs } = opts;

  let easyDuration;
  let goodDuration;

  switch (skillKindFromSkill(opts.skill)) {
    case SkillKind.HanziWordToPinyinTyped:
    case SkillKind.HanziWordToPinyinInitial:
    case SkillKind.HanziWordToPinyinFinal:
    case SkillKind.HanziWordToPinyinTone:
    case SkillKind.PinyinInitialAssociation:
    case SkillKind.PinyinFinalAssociation:
    case SkillKind.GlossToHanziWord:
    case SkillKind.PinyinToHanziWord:
    case SkillKind.ImageToHanziWord:
    case SkillKind.HanziWordToGloss:
    case SkillKind.HanziWordToGlossTyped: {
      easyDuration = 5000;
      goodDuration = 10_000;
      break;
    }
    case SkillKind.Deprecated:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated_PinyinToRadical: {
      throw new Error(
        `duration rating thresholds not implemented for ${skillKindFromSkill(opts.skill)}`,
      );
    }
  }

  const rating = correct
    ? durationMs < easyDuration
      ? Rating.Easy
      : durationMs < goodDuration
        ? Rating.Good
        : Rating.Hard
    : Rating.Again;

  return { skill, rating, durationMs };
}

// Skills that have either never been introduced, or were last reviewed too
// long ago and have been likely forgotten should be introduced.
export function needsToBeIntroduced(
  srsState: SrsStateType | undefined | null,
  now: Date,
): boolean {
  if (srsState == null) {
    return true;
  }

  return isForgotten(srsState, now);
}

export function isForgotten(srsState: SrsStateType, now: Date): boolean {
  switch (srsState.kind) {
    case SrsKind.FsrsFourPointFive: {
      return fsrsIsForgotten(srsState, now);
    }
    case SrsKind.Mock: {
      // If it's more than 14 days over-due then assume it's forgotten.
      return srsState.nextReviewAt < subDays(now, 14);
    }
  }
}

export function isStable(srsState: SrsStateType | undefined | null): boolean {
  if (srsState == null) {
    return false;
  }

  switch (srsState.kind) {
    case SrsKind.FsrsFourPointFive: {
      return fsrsIsStable(srsState);
    }
    case SrsKind.Mock: {
      // If the schedule interval is more than a week, then it's stable.
      return (
        srsState.nextReviewAt.getTime() - srsState.prevReviewAt.getTime() >
        weekInMillis
      );
    }
  }
}

export function isVeryEasy(
  srsState: SrsStateType | undefined | null,
  now: Date,
): boolean {
  if (srsState == null) {
    return false;
  }

  switch (srsState.kind) {
    case SrsKind.FsrsFourPointFive: {
      return fsrsPredictedRecallProbability(srsState, now) > 0.9;
    }
    case SrsKind.Mock: {
      // Naive mock implementation
      return false;
    }
  }
}

const weekInMillis = 1000 * 60 * 60 * 24 * 7;

export type RankNumber = 0 | 1 | 2 | 3 | 4;

export function rankName(rank: RankNumber): string {
  if (rank === 0) {
    return `Locked`;
  }

  return `Rank ${rank}`;
}

export function coerceRank(rank: number): RankNumber {
  if (rank < 0) {
    return 0;
  }
  if (rank > 4) {
    return 4;
  }
  return rank as RankNumber;
}

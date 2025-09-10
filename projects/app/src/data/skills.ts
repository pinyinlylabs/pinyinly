import type { HanziWordWithMeaning } from "@/dictionary/dictionary";
import {
  decomposeHanzi,
  graphemeHasGlyph,
  hanziFromHanziWord,
  hanziTextFromHanziGrapheme,
  lookupHanzi,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import {
  fsrsIsForgotten,
  fsrsIsStable,
  fsrsStabilityThreshold,
  Rating,
} from "@/util/fsrs";
import { makePRNG } from "@/util/random";
import {
  emptySet,
  memoize1,
  sortComparatorDate,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import type { Duration } from "date-fns";
import { sub } from "date-fns/sub";
import { subDays } from "date-fns/subDays";
import type { DeepReadonly } from "ts-essentials";
import { isHanziGrapheme, splitHanziText } from "./hanzi";
import type {
  HanziText,
  HanziWord,
  HanziWordSkillKind,
  SrsStateType,
  UnsavedSkillRating,
} from "./model";
import { hanziWordSkillKinds, SkillKind, SrsKind } from "./model";
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

export const hanziWordToGlossHanziWord = (
  skill: Skill,
): HanziWord | undefined => {
  if (skill.startsWith(`he:`)) {
    return skill.slice(3) as HanziWord;
  }
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
                deps.push(hanziWordToPinyin(charHanziWord));
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

export const hanziWordToPinyin = (hanziWord: HanziWord) =>
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

export interface SkillReviewQueue {
  /**
   * The skills in the review queue.
   */
  items: readonly Skill[];
  /**
   * Skills that are blocked from being reviewed (or introduced) because their
   * dependencies aren't met yet.
   */
  blockedItems: readonly Skill[];
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
   * The number of new (never seen before) items in the queue that are not
   * harder difficulty variations.
   */
  newSkillCount: number;
  /**
   * The number of new (never seen before) items in the queue that are
   * harder difficulty variations of existing skills.
   */
  newDifficultyCount: number;
  /**
   * The total number of new items (newSkillCount + newDifficultyCount).
   * @deprecated Use newSkillCount and newDifficultyCount separately
   */
  newCount: number;
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

export function skillReviewQueue({
  graph,
  skillSrsStates,
  latestSkillRatings,
  isStructuralHanziWord,
  now = new Date(),
}: {
  graph: SkillLearningGraph;
  skillSrsStates: Map<Skill, SrsStateType>;
  latestSkillRatings: Map<Skill, Pick<SkillRating, `rating` | `createdAt`>>;
  isStructuralHanziWord: (hanziWord: HanziWord) => boolean;
  now?: Date;
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

  // Add already introduced skills to the learning order, unless they're too
  // stale and probably forgotten.
  for (const [skill, srsState] of skillSrsStates) {
    if (!needsToBeIntroduced(srsState, now)) {
      enqueueReviewOnce(skill, srsState);
    }
  }

  // Compute in-degree
  for (const [skill, node] of graph.entries()) {
    if (!inDegree.has(skill)) {
      inDegree.set(skill, 0);
    }

    for (const dependency of node.dependencies) {
      inDegree.set(dependency, (inDegree.get(dependency) ?? 0) + 1);
    }
  }

  const hasStableDependencies = memoize1((skill: Skill): boolean => {
    for (const dep of graph.get(skill)?.dependencies ?? emptySet) {
      const srsState = skillSrsStates.get(dep);

      switch (srsState?.kind) {
        case SrsKind.Mock: {
          break;
        }
        case SrsKind.FsrsFourPointFive: {
          if (!fsrsIsStable(srsState)) {
            return false;
          }
          break;
        }
        case undefined: {
          // The dep hasn't been introduced yet, so it can't be stable.
          return false;
        }
      }

      if (!hasStableDependencies(dep)) {
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

  // At this point there's an unbounded number of new skills, so we need to
  // enforce a throttle to avoid overwhelming the user with too many new skills
  // in a short period of time. So only take a fixed amount of the new
  // candidates and mark the rest as blocked.
  const learningOrderNew: Skill[] = [];

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
        learningOrderNew.length <
      throttleLimit
    );
  }

  // The candidates come out in reverse order from the above algorithm, so flip
  // them so that it's in proper queue order.
  learningOrderNewCandidates.reverse();

  // Push components to the end of the list, so that words are prioritized for
  // learning as they're more useful to people trying to apply their knowledge.
  learningOrderNewCandidates.sort((a, b) => {
    const aRank =
      isHanziWordSkill(a) && isStructuralHanziWord(hanziWordFromSkill(a))
        ? 1
        : 0;
    const bRank =
      isHanziWordSkill(b) && isStructuralHanziWord(hanziWordFromSkill(b))
        ? 1
        : 0;

    return aRank - bRank;
  });

  for (const skill of learningOrderNewCandidates) {
    if (hasLearningCapacityForNewSkill(skill)) {
      learningOrderNew.push(skill);
    } else {
      learningOrderBlocked.push(skill);
    }
  }

  const retryItems = learningOrderRetry
    .sort(sortComparatorDate(([, when]) => when))
    .map(([skill]) => skill);
  retryItems.reverse();

  const items = [
    // First do incorrect answers that need to be retried.
    ...retryItems,
    // Then do over-due skills, by the most due (oldest date) first.
    ...learningOrderOverDue
      .sort(sortComparatorDate(([, due]) => due))
      .map(([skill]) => skill),
    // Then do due skills, by the most due (oldest date) first.
    ...learningOrderDue
      .sort(sortComparatorDate(([, due]) => due))
      .map(([skill]) => skill),
    // Then do new skills in the order of the learning graph.
    ...learningOrderNew,
    // Finally sort the not-due skills.
    ...randomSortSkills(learningOrderNotDue),
  ];

  learningOrderBlocked.reverse();

  // Separate new skills by type
  const newSkills = learningOrderNew.filter(
    (skill) => !isHarderDifficultyStyleSkillKind(skillKindFromSkill(skill)),
  );
  const newDifficultySkills = learningOrderNew.filter((skill) =>
    isHarderDifficultyStyleSkillKind(skillKindFromSkill(skill)),
  );

  return {
    items,
    blockedItems: learningOrderBlocked,
    retryCount: learningOrderRetry.length,
    dueCount: learningOrderDue.length,
    overDueCount: learningOrderOverDue.length,
    newSkillCount: newSkills.length,
    newDifficultyCount: newDifficultySkills.length,
    newCount: learningOrderNew.length, // Maintain backward compatibility
    newDueAt,
    newOverDueAt,
  };
}

/**
 * Randomly sort skills for review based on their SRS state to form a
 * probability distribution weighted by each skill's difficulty. It's designed
 * to be efficient and deterministic so it can be tested and predictable. In
 * practice it probably doesn't make sense to compute all of the upcoming skills
 * (rather than just "the next one") because each time a skill is reviewed the
 * sequence will change. But it can be used to allow batches of skills to be
 * selected and reviewed as a quiz rather than just taking one-by-one.
 *
 * @param skillStates
 * @returns
 */
const randomSortSkills = (skillStates: [Skill, SrsStateType | undefined][]) => {
  let totalWeight = 0;

  const weighted = skillStates.map(([skill, srsState]): [Skill, number] => {
    // Compute weights: lower stability = higher selection weight
    const learningScore =
      srsState?.kind === SrsKind.FsrsFourPointFive
        ? // either difficulty or stability should always change after each
          // review, so combining them ensures each review changes the random
          // order and avoids getting stuck in a loop repeating a review for the
          // same skill over and over again.
          (1 / srsState.difficulty) * Math.sqrt(1 + srsState.stability)
        : 0;
    const weight = 1 / (learningScore + 1);
    totalWeight += weight;
    return [skill, weight];
  });

  // Create a pseudo-random number generator seeded from the total weight of
  // the skills. This way the order is deterministic but should change each
  // time a skill is reviewed (since the total weight will change).
  const random = makePRNG(totalWeight);

  // Normalize the weights and convert into a "priority" value for sorting.
  for (const x of weighted) {
    const normalizedWeight = x[1] / totalWeight;
    // Randomize the order (weight turns into "priority")
    x[1] = random() / normalizedWeight;
  }

  // Order the skills
  weighted.sort(sortComparatorNumber(([, weight]) => weight));

  return weighted.map(([skill]) => skill);
};

const skillKindShorthandMapping: Record<SkillKind, string> = {
  [SkillKind.Deprecated_EnglishToRadical]: `[deprecated]`,
  [SkillKind.Deprecated_PinyinToRadical]: `[deprecated]`,
  [SkillKind.Deprecated_RadicalToEnglish]: `[deprecated]`,
  [SkillKind.Deprecated_RadicalToPinyin]: `[deprecated]`,
  [SkillKind.Deprecated]: `[deprecated]`,
  [SkillKind.GlossToHanziWord]: `EN → 中文`,
  [SkillKind.HanziWordToGloss]: `中文 → EN`,
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
    case SkillKind.HanziWordToGloss: {
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

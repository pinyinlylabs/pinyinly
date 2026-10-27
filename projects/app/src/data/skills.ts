import type { CharactersJson } from "@/dictionary";
import {
  hanziFromHanziWord,
  shallowDecomposeHanziCharacter,
  shallowDecomposeHanziWord,
} from "@/dictionary";
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
  mergeSortComparators,
  MinHeap,
  mutableArrayFilter,
  sortComparatorDate,
  sortComparatorNumber,
  sortComparatorString,
  topK,
} from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";
import { sub } from "date-fns/sub";
import { subDays } from "date-fns/subDays";
import ms from "ms";
import type { DeepReadonly } from "ts-essentials";
import { isHanziCharacter, splitHanziText } from "./hanzi";
import { PinyinDiffMask, pinyinDiff } from "./pinyin";
import type {
  CharacterDecompositionRow,
  Dictionary,
  HanziCharacter,
  HanziCharacterWritingSkill,
  HanziText,
  HanziWord,
  HanziWordSkill,
  HanziWordSkillKind,
  HanziWordToGlossTypedSkill,
  HanziWordToPinyinTypedSkill,
  HanziWordWithMeaning,
  PinyinFinalAssociationSkill,
  PinyinInitialAssociationSkill,
  QuestionFlagType,
  Skill,
  SrsStateType,
  UnsavedSkillRating,
} from "./model";
import {
  hanziWordSkillKinds,
  QuestionFlagKind,
  SkillKind,
  SrsKind,
} from "./model";
import type { SkillRating } from "./rizzleSchema";
import { rSkillKind } from "./rizzleSchema";

export interface Node {
  skill: Skill;
  dependencies: Set<Skill>; // todo: when are weights added?
}

export type SkillLearningGraph = Map<Skill, Node>;

export function skillLearningGraph(options: {
  targetSkills: Skill[];
  includeDependencies?: boolean;
  decompositionData: readonly CharacterDecompositionRow[];
  dictionary: Dictionary;
  charactersJson: CharactersJson;
}): SkillLearningGraph {
  const graph: SkillLearningGraph = new Map();

  const decomposeHanzi = memoize1((hanzi: HanziCharacter) =>
    shallowDecomposeHanziCharacter(
      hanzi,
      options.decompositionData,
      isHanziCharacter,
    ),
  );

  function addSkill(skill: Skill): void {
    // Skip doing any work if the skill is already in the graph.
    if (graph.has(skill)) {
      return;
    }

    const isHanziCharacterWritingSkill =
      skillKindFromSkill(skill) === SkillKind.HanziCharacterToWriting;
    const dependencies =
      options.includeDependencies === false && !isHanziCharacterWritingSkill
        ? emptyArray
        : skillDependencies(
            skill,
            decomposeHanzi,
            options.dictionary,
            options.charactersJson,
          );

    const node: Node = { skill, dependencies: new Set(dependencies) };
    graph.set(skill, node);

    for (const dependency of dependencies) {
      addSkill(dependency);
    }
  }

  for (const skill of options.targetSkills) {
    addSkill(skill);
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
  const result = /^(.+?):/u.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);

  return rSkillKind().unmarshal(marshaledSkillKind);
};

export function hanziCharacterFromWritingSkill(
  skill: HanziCharacterWritingSkill,
): HanziCharacter {
  const result = /^hwr:(.+)$/u.exec(skill);
  invariant(result != null, `doesn't match hwr:hanzi pattern`);
  const hanzi = result[1];
  invariant(
    hanzi != null && isHanziCharacter(hanzi as HanziText),
    `invalid character writing skill`,
  );
  return hanzi as HanziCharacter;
}

export const hanziCharacterToWriting = (
  hanzi: HanziCharacter,
): HanziCharacterWritingSkill =>
  `${rSkillKind().marshal(SkillKind.HanziCharacterToWriting)}:${hanzi}` as HanziCharacterWritingSkill;

export const hanziWordFromSkill = (skill: HanziWordSkill): HanziWord => {
  const result = /^(.+?):(.+)$/u.exec(skill);
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

export const isHanziWordToGlossTypedSkill = (
  skill: Skill,
): skill is HanziWordToGlossTypedSkill => {
  return skillKindFromSkill(skill) === SkillKind.HanziWordToGlossTyped;
};

export const isHanziWordToPinyinTypedSkill = (
  skill: Skill,
): skill is HanziWordToPinyinTypedSkill => {
  return skillKindFromSkill(skill) === SkillKind.HanziWordToPinyinTyped;
};

export const initialFromPinyinInitialAssociationSkill = (
  skill: PinyinInitialAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/u.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind, initial] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);
  invariant(initial != null, `couldn't parse pinyin initial (after :)`);

  return initial;
};

export const finalFromPinyinFinalAssociationSkill = (
  skill: PinyinFinalAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/u.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillKind, final] = result;
  invariant(marshaledSkillKind != null, `couldn't parse skill kind (before :)`);
  invariant(final != null, `couldn't parse pinyin final (after :)`);

  return final;
};

export function skillDependencies(
  skill: Skill,
  decompose: (hanzi: HanziCharacter) => readonly HanziCharacter[],
  dictionary: Dictionary,
  charactersJson: CharactersJson,
): Skill[] {
  const deps: Skill[] = [];
  const skillKind = skillKindFromSkill(skill);
  const hanziWordToGlossDepsHanzi = new Set<HanziText>(); // fast lookup

  switch (skillKind) {
    case SkillKind.GlossToHanziWord: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      // Learn the Hanzi -> Gloss first. It's easier to read than write (for chinese characters).
      deps.push(hanziWordToGloss(hanziWordFromSkill(skill)));
      break;
    }

    case SkillKind.HanziCharacterToWriting: {
      const hanzi = hanziCharacterFromWritingSkill(
        skill as HanziCharacterWritingSkill,
      );
      const meaning = dictionary
        .lookupHanzi(hanzi)
        .find(([, item]) => item.gloss[0] != null && item.pinyin?.[0] != null);
      if (meaning != null) {
        deps.push(hanziWordToGloss(meaning[0]));
      }
      break;
    }

    case SkillKind.HanziWordToGloss: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      if (isHanziCharacter(hanzi)) {
        // Learn the components of a hanzi word first.
        for (let hanziComponent of decompose(hanzi)) {
          if (hanziComponent === hanzi) {
            continue;
          }

          // Use the canonical form of the character.
          {
            let hanziComponentData = charactersJson.get(hanziComponent);
            while (hanziComponentData?.canonicalForm != null) {
              hanziComponent = hanziComponentData.canonicalForm;
              hanziComponentData = charactersJson.get(hanziComponent);
            }
          }

          // Check if the character was already added as a dependency by being
          // referenced in the gloss hint.
          if (hanziWordToGlossDepsHanzi.has(hanziComponent)) {
            continue;
          }

          // If the character wasn't already added, we need to figure out which
          // HanziWord to learn for it. Since there's no definite answer, we have
          // to guess.
          const hanziWordWithMeaning = hackyGuessHanziWordToLearn(
            hanziComponent,
            dictionary,
          );
          if (hanziWordWithMeaning != null) {
            const [hanziWord] = hanziWordWithMeaning;
            deps.push(hanziWordToGloss(hanziWord));
            hanziWordToGlossDepsHanzi.add(hanziComponent);
          }
        }
      } else {
        for (const item of shallowDecomposeHanziWord(hanziWord, dictionary)) {
          deps.push(hanziWordToGloss(item));
        }
      }
      break;
    }
    case SkillKind.HanziWordToGlossTyped: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      deps.push(hanziWordToGloss(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinTyped: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      // Make sure it's valid to learn pinyin for this hanzi word.
      const meaning = dictionary.lookupHanziWord(hanziWord);
      invariant(
        meaning?.pinyin != null,
        `SkillKind.HanziWordToPinyinTyped skill requires a hanzi word with pinyin.`,
      );

      // Learn the Hanzi -> Gloss first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToGloss(hanziWord));

      // If the hanzi word is multiple characters (e.g. 为什么:why) learn the
      // meaning of each one separately.
      const characters = splitHanziText(hanzi);
      if (characters.length > 1) {
        for (const character of characters) {
          // We only have a character, but need a hanzi word to learn. So make
          // the best guess for the hanzi word to learn.
          for (const [charHanziWord, charMeaning] of dictionary.lookupHanzi(
            character,
          )) {
            if (charMeaning.pinyin != null) {
              deps.push(hanziWordToPinyinTyped(charHanziWord));
              break;
            }
          }
        }
      } else {
        // Otherwise, it's a single character, and can learn the full pinyin
        // after the initial/final split skills.
        deps.push(hanziWordToPinyinFinal(hanziWord));
      }
      break;
    }

    case SkillKind.HanziWordToPinyinTone: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziCharacter(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinFinal(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinFinal: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziCharacter(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinInitial(hanziWord));
      break;
    }

    case SkillKind.HanziWordToPinyinInitial: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        isHanziCharacter(hanzi),
        `${skillKind} only applies to single character hanzi`,
      );

      // Learn the Hanzi -> Gloss first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToGloss(hanziWord));
      break;
    }

    case SkillKind.PinyinToHanziWord: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      // Learn going from Hanzi -> Pinyin first.
      deps.push(
        hanziWordToPinyinInitial(hanziWord),
        hanziWordToPinyinFinal(hanziWord),
        hanziWordToPinyinTyped(hanziWord),
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

function hackyGuessHanziWordToLearn(
  hanzi: HanziText,
  dictionary: Dictionary,
): DeepReadonly<HanziWordWithMeaning> | undefined {
  const hanziWords = dictionary.lookupHanzi(hanzi);
  for (const item of hanziWords) {
    return item;
  }
}

export function hanziWordSkill(
  type: typeof SkillKind.HanziWordToGlossTyped,
  hanziWord: HanziWord,
): HanziWordToGlossTypedSkill;
export function hanziWordSkill(
  type: HanziWordSkillKind,
  hanziWord: HanziWord,
): HanziWordSkill;
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

export function hanziWordToTargetSkills(
  hanziWord: HanziWord,
  dictionary: Pick<Dictionary, `lookupHanziWord`>,
  includeWriting = true,
): Skill[] {
  const meaning = dictionary.lookupHanziWord(hanziWord);
  if (meaning == null) {
    return [];
  }
  const hanzi = hanziFromHanziWord(hanziWord);
  const writingSkills =
    includeWriting &&
    isHanziCharacter(hanzi) &&
    meaning.gloss[0] != null &&
    meaning.pinyin?.[0] != null
      ? [hanziCharacterToWriting(hanzi)]
      : [];
  return [
    hanziWordToGlossTyped(hanziWord),
    ...(meaning.pinyin?.[0] == null ? [] : [hanziWordToPinyinTyped(hanziWord)]),
    ...writingSkills,
  ];
}

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
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
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
}): readonly SkillReviewQueueItem[] {
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

    return [{ skill: dep }];
  }

  return emptyArray;
}

/**
 * Determines if we should prioritize a @see HanziWordToGlossTyped skill with
 * @see QuestionFlagKind.OtherMeaning flag a successful
 * @see HanziWordToGlossTyped review, in case of the scenario when someone gives
 * a correct-but-not-asked meaning for a hanzi word with multiple meanings. In
 * this case we immediately ask all the other definitions for the same hanzi
 * word to force practicing other meanings.
 */
function getReactiveHanziToTypedGlossSkills({
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
}): readonly SkillReviewQueueItem[] {
  let hanzi: HanziText | undefined;
  let previousSkills: HanziWordToGlossTypedSkill[] | undefined;

  // Step through the recent ratings and group together consecutive successful
  // HanziWordToGlossTyped ratings for the same hanzi word.
  for (const recentSkillRating of recentSkillRatingHistory) {
    if (!isHanziWordToGlossTypedSkill(recentSkillRating.skill)) {
      break;
    }

    if (recentSkillRating.rating === Rating.Again) {
      // Avoid completing to react to skill retries.
      break;
    }

    const recentHanzi = hanziFromHanziWord(
      hanziWordFromSkill(recentSkillRating.skill),
    );

    if (hanzi == null) {
      hanzi = recentHanzi;
    } else if (hanzi !== recentHanzi) {
      break;
    }

    previousSkills ??= [];
    previousSkills.push(recentSkillRating.skill);
  }

  if (hanzi == null) {
    return emptyArray;
  }

  invariant(
    previousSkills != null && previousSkills.length > 0,
    `previousSkills must be set`,
  );

  // Pick one of the remaining hanzi word skills to learn.
  let targetSkill: HanziWordSkill | undefined;
  for (const [skill] of graph) {
    if (
      !isHanziWordToGlossTypedSkill(skill) ||
      previousSkills.includes(skill)
    ) {
      continue;
    }

    const srsState = skillSrsStates.get(skill);

    if (needsToBeIntroduced(srsState, now)) {
      // Skipping because the skill hasn't been introduced yet, and reviewing it
      // would be too hard for the user.
      continue;
    }

    const skillHanzi = hanziFromHanziWord(hanziWordFromSkill(skill));
    if (skillHanzi === hanzi) {
      targetSkill = skill;
      break;
    }
  }

  if (targetSkill == null) {
    return emptyArray;
  }

  // At this point we've found a new hanzi word to prioritize, and we have the
  // previous hanzi words that were already answered.
  return [
    {
      skill: targetSkill,
      flag: {
        kind: QuestionFlagKind.OtherAnswer,
        previousHanziWords: previousSkills.map((s) => hanziWordFromSkill(s)),
      },
    },
  ];
}

/**
 * Determines if we should prioritize a @see HanziWordToPinyinTyped skill with
 * @see QuestionFlagKind.OtherAnswer flag after a successful
 * @see HanziWordToPinyinTyped review, in case of the scenario when someone gives
 * a correct-but-not-asked pronunciation for a hanzi word with multiple pronunciations.
 * In this case we immediately ask all the other pronunciations for the same hanzi
 * word to force practicing other meanings.
 */
function getReactiveHanziToPinyinTypedSkills({
  recentSkillRatingHistory,
  skillSrsStates,
  graph,
  now,
  dictionary,
}: {
  recentSkillRatingHistory: ({ skill: Skill } & Pick<
    SkillRating,
    `rating` | `createdAt`
  >)[];
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  graph: SkillLearningGraph;
  now: Date;
  dictionary: Dictionary;
}): readonly SkillReviewQueueItem[] {
  let hanzi: HanziText | undefined;
  const previousPinyin = new Set<string>();
  const previousHanziWords: HanziWord[] = [];

  // Step through the recent ratings and group together consecutive successful
  // HanziWordToPinyinTyped ratings for the same hanzi word, collecting pinyin.
  for (const recentSkillRating of recentSkillRatingHistory) {
    if (!isHanziWordToPinyinTypedSkill(recentSkillRating.skill)) {
      break;
    }

    if (recentSkillRating.rating === Rating.Again) {
      // Avoid reacting to skill retries.
      break;
    }

    const hanziWord = hanziWordFromSkill(recentSkillRating.skill);
    const recentHanzi = hanziFromHanziWord(hanziWord);

    if (hanzi == null) {
      hanzi = recentHanzi;
    } else if (hanzi !== recentHanzi) {
      break;
    }

    const pinyin = dictionary.lookupHanziWord(hanziWord)?.pinyin?.[0];
    if (pinyin != null) {
      previousPinyin.add(pinyin);
    }
    previousHanziWords.push(hanziWord);
  }

  if (hanzi == null || previousPinyin.size === 0) {
    return emptyArray;
  }

  // Find a skill for the same hanzi with a different (unanswered) pinyin.
  for (const [skill] of graph) {
    if (!isHanziWordToPinyinTypedSkill(skill)) {
      continue;
    }

    const hanziWord = hanziWordFromSkill(skill);
    if (hanziFromHanziWord(hanziWord) !== hanzi) {
      continue;
    }

    if (previousHanziWords.includes(hanziWord)) {
      continue;
    }

    const srsState = skillSrsStates.get(skill);
    if (needsToBeIntroduced(srsState, now)) {
      // Skipping because the skill hasn't been introduced yet.
      continue;
    }

    const pinyin = dictionary.lookupHanziWord(hanziWord)?.pinyin?.[0];
    if (pinyin == null || previousPinyin.has(pinyin)) {
      // Skip if pinyin is missing or already answered.
      continue;
    }

    return [
      {
        skill,
        flag: {
          kind: QuestionFlagKind.OtherAnswer,
          previousHanziWords,
        },
      },
    ];
  }

  return emptyArray;
}

export interface SkillReviewQueueRatingEvent extends Pick<
  SkillRating,
  `skill` | `rating` | `createdAt`
> {
  /**
   * The rating ID deduplicates rows produced when a rating joins to multiple
   * mistake records and provides a stable tie-breaker for same-time ratings.
   */
  id: SkillRating[`id`];
  pinyinMistake?: string;
}

export interface SkillReviewQueueRemediationConfig {
  /** Successful writing attempts required after a writing mistake. */
  writingSuccessfulAttempts?: number;
  /** Practice counts used when typed pinyin is wrong in its initial sound. */
  typedPinyinWrongInitial?: {
    /** Successful initial-only attempts required before retrying typed pinyin. */
    initialSuccessfulAttempts: number;
    /** Successful typed-pinyin attempts required to finish remediation. */
    typedSuccessfulAttempts: number;
  };
  /** Practice counts used when typed pinyin has the wrong final sound. */
  typedPinyinWrongFinal?: {
    /** Successful final-only attempts required before retrying typed pinyin. */
    finalSuccessfulAttempts: number;
    /** Successful typed-pinyin attempts required to finish remediation. */
    typedSuccessfulAttempts: number;
  };
  /** Practice counts used when typed pinyin has the wrong tone. */
  typedPinyinWrongTone?: {
    /** Successful tone-only attempts required before retrying typed pinyin. */
    toneSuccessfulAttempts: number;
    /** Successful typed-pinyin attempts required to finish remediation. */
    typedSuccessfulAttempts: number;
  };
}

interface SkillReviewQueueRemediationStep {
  skill: Skill;
  successfulAttempts: number;
  completedAttempts: number;
}

export interface SkillReviewQueueRemediationStepSpec {
  skill: Skill;
  successfulAttempts: number;
}

interface SkillReviewQueueRemediationPlan {
  steps: SkillReviewQueueRemediationStep[];
  currentStepIndex: number;
}

export interface SkillReviewQueueRemediatorContext {
  dictionary: Dictionary;
  config: SkillReviewQueueRemediationConfig | undefined;
}

export type SkillReviewQueueRemediator = (
  event: SkillReviewQueueRatingEvent,
  context: SkillReviewQueueRemediatorContext,
) => readonly SkillReviewQueueRemediationStepSpec[] | null;

const skillReviewQueueRemediationHistoryMs = ms(`24h`);

function typedPinyinMistakeMask(
  event: SkillReviewQueueRatingEvent,
  dictionary: Dictionary,
): ReturnType<typeof pinyinDiff> {
  if (
    event.pinyinMistake == null ||
    !isHanziWordToPinyinTypedSkill(event.skill)
  ) {
    return PinyinDiffMask.None;
  }

  const expectedPinyin = dictionary.lookupHanziWord(
    hanziWordFromSkill(event.skill),
  )?.pinyin?.[0];
  return expectedPinyin == null
    ? PinyinDiffMask.None
    : pinyinDiff(event.pinyinMistake, expectedPinyin);
}

export const writingSkillReviewQueueRemediator: SkillReviewQueueRemediator = (
  event,
  { config },
) => {
  if (skillKindFromSkill(event.skill) !== SkillKind.HanziCharacterToWriting) {
    return null;
  }

  const successfulAttempts = config?.writingSuccessfulAttempts ?? 1;
  invariant(
    Number.isInteger(successfulAttempts) && successfulAttempts > 0,
    `writingSuccessfulAttempts must be a positive integer`,
  );
  return [{ skill: event.skill, successfulAttempts }];
};

function typedPinyinComponentRemediationPlan({
  event,
  mistakeMask,
  componentMask,
  focusedSkill,
  focusedSuccessfulAttempts,
  typedSuccessfulAttempts,
}: {
  event: SkillReviewQueueRatingEvent;
  mistakeMask: ReturnType<typeof pinyinDiff>;
  componentMask: ReturnType<typeof pinyinDiff>;
  focusedSkill: (hanziWord: HanziWord) => Skill;
  focusedSuccessfulAttempts: number | undefined;
  typedSuccessfulAttempts: number | undefined;
}): readonly SkillReviewQueueRemediationStepSpec[] | null {
  if (
    !isHanziWordToPinyinTypedSkill(event.skill) ||
    (mistakeMask & componentMask) === 0 ||
    focusedSuccessfulAttempts == null ||
    typedSuccessfulAttempts == null
  ) {
    return null;
  }

  const hanziWord = hanziWordFromSkill(event.skill);
  return [
    {
      skill: focusedSkill(hanziWord),
      successfulAttempts: focusedSuccessfulAttempts,
    },
    {
      skill: event.skill,
      successfulAttempts: typedSuccessfulAttempts,
    },
  ];
}

function typedPinyinComponentPlanForEvent(
  event: SkillReviewQueueRatingEvent,
  config: SkillReviewQueueRemediationConfig | undefined,
  mistakeMask: ReturnType<typeof pinyinDiff>,
): readonly SkillReviewQueueRemediationStepSpec[] | null {
  const rules = [
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask,
      componentMask: PinyinDiffMask.Initial,
      focusedSkill: hanziWordToPinyinInitial,
      focusedSuccessfulAttempts:
        config?.typedPinyinWrongInitial?.initialSuccessfulAttempts,
      typedSuccessfulAttempts:
        config?.typedPinyinWrongInitial?.typedSuccessfulAttempts,
    }),
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask,
      componentMask: PinyinDiffMask.Final,
      focusedSkill: hanziWordToPinyinFinal,
      focusedSuccessfulAttempts:
        config?.typedPinyinWrongFinal?.finalSuccessfulAttempts,
      typedSuccessfulAttempts:
        config?.typedPinyinWrongFinal?.typedSuccessfulAttempts,
    }),
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask,
      componentMask: PinyinDiffMask.Tone,
      focusedSkill: hanziWordToPinyinTone,
      focusedSuccessfulAttempts:
        config?.typedPinyinWrongTone?.toneSuccessfulAttempts,
      typedSuccessfulAttempts:
        config?.typedPinyinWrongTone?.typedSuccessfulAttempts,
    }),
  ].filter(
    (rule): rule is readonly SkillReviewQueueRemediationStepSpec[] =>
      rule !== null,
  );
  if (rules.length === 0) {
    return null;
  }

  const steps = rules.flatMap((rule) => rule.slice(0, -1));
  // One typed-pinyin retry closes all matched rules, using the largest configured count.
  const typedSuccessfulAttempts = Math.max(
    ...rules.map((rule) => nonNullable(rule.at(-1)).successfulAttempts),
  );
  steps.push({
    skill: event.skill,
    successfulAttempts: typedSuccessfulAttempts,
  });
  return steps;
}

export const wrongPinyinInitialSkillReviewQueueRemediator: SkillReviewQueueRemediator =
  (event, context) =>
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask: typedPinyinMistakeMask(event, context.dictionary),
      componentMask: PinyinDiffMask.Initial,
      focusedSkill: hanziWordToPinyinInitial,
      focusedSuccessfulAttempts:
        context.config?.typedPinyinWrongInitial?.initialSuccessfulAttempts,
      typedSuccessfulAttempts:
        context.config?.typedPinyinWrongInitial?.typedSuccessfulAttempts,
    });

export const wrongPinyinFinalSkillReviewQueueRemediator: SkillReviewQueueRemediator =
  (event, context) =>
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask: typedPinyinMistakeMask(event, context.dictionary),
      componentMask: PinyinDiffMask.Final,
      focusedSkill: hanziWordToPinyinFinal,
      focusedSuccessfulAttempts:
        context.config?.typedPinyinWrongFinal?.finalSuccessfulAttempts,
      typedSuccessfulAttempts:
        context.config?.typedPinyinWrongFinal?.typedSuccessfulAttempts,
    });

export const wrongPinyinToneSkillReviewQueueRemediator: SkillReviewQueueRemediator =
  (event, context) =>
    typedPinyinComponentRemediationPlan({
      event,
      mistakeMask: typedPinyinMistakeMask(event, context.dictionary),
      componentMask: PinyinDiffMask.Tone,
      focusedSkill: hanziWordToPinyinTone,
      focusedSuccessfulAttempts:
        context.config?.typedPinyinWrongTone?.toneSuccessfulAttempts,
      typedSuccessfulAttempts:
        context.config?.typedPinyinWrongTone?.typedSuccessfulAttempts,
    });

export const typedPinyinComponentSkillReviewQueueRemediator: SkillReviewQueueRemediator =
  (event, context) =>
    typedPinyinComponentPlanForEvent(
      event,
      context.config,
      typedPinyinMistakeMask(event, context.dictionary),
    );

export const retryFailedSkillReviewQueueRemediator: SkillReviewQueueRemediator =
  (event) => {
    return [{ skill: event.skill, successfulAttempts: 1 }];
  };

export const skillReviewQueueRemediators: readonly SkillReviewQueueRemediator[] =
  [
    writingSkillReviewQueueRemediator,
    typedPinyinComponentSkillReviewQueueRemediator,
    retryFailedSkillReviewQueueRemediator,
  ];

function skillReviewQueueRemediationPlans({
  events,
  graph,
  skillSrsStates,
  remediators,
  remediatorContext,
  now,
}: {
  events: readonly SkillReviewQueueRatingEvent[];
  graph: SkillLearningGraph;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  remediators: readonly SkillReviewQueueRemediator[];
  remediatorContext: SkillReviewQueueRemediatorContext;
  now: Date;
}): SkillReviewQueueRemediationPlan[] {
  const cutoff = now.getTime() - skillReviewQueueRemediationHistoryMs;
  const recentEvents = new Map<string, SkillReviewQueueRatingEvent>();
  for (const event of events) {
    if (
      event.createdAt.getTime() < cutoff ||
      event.createdAt.getTime() > now.getTime()
    ) {
      continue;
    }

    const previousEvent = recentEvents.get(event.id);
    if (
      previousEvent == null ||
      (previousEvent.pinyinMistake == null && event.pinyinMistake != null)
    ) {
      recentEvents.set(event.id, event);
    }
  }

  const orderedEvents = [...recentEvents.values()].sort(
    mergeSortComparators(
      sortComparatorDate(({ createdAt }) => createdAt),
      sortComparatorString(({ id }) => id),
    ),
  );
  const plans: SkillReviewQueueRemediationPlan[] = [];
  const skillPlanCounts = new Map<Skill, number>();

  for (const event of orderedEvents) {
    const activePlan = plans.at(-1);
    const activeStep = activePlan?.steps[activePlan.currentStepIndex];

    if (event.rating === Rating.Again) {
      if (skillPlanCounts.has(event.skill)) {
        continue;
      }

      if (
        !graph.has(event.skill) ||
        needsToBeIntroduced(skillSrsStates.get(event.skill), now)
      ) {
        continue;
      }

      let steps: readonly SkillReviewQueueRemediationStepSpec[] | null = null;
      for (const remediator of remediators) {
        steps = remediator(event, remediatorContext);
        if (steps != null) {
          break;
        }
      }
      invariant(steps != null, `a retry remediator must match every failure`);
      invariant(steps.length > 0, `a remediator plan must have steps`);

      plans.push({
        steps: steps.map((step) => ({ ...step, completedAttempts: 0 })),
        currentStepIndex: 0,
      });
      for (const { skill } of steps) {
        skillPlanCounts.set(skill, (skillPlanCounts.get(skill) ?? 0) + 1);
      }
    } else if (activePlan != null && activeStep?.skill === event.skill) {
      activeStep.completedAttempts++;
      if (activeStep.completedAttempts < activeStep.successfulAttempts) {
        continue;
      }

      activePlan.currentStepIndex++;
      if (activePlan.currentStepIndex >= activePlan.steps.length) {
        const completedPlan = plans.pop();
        invariant(completedPlan != null);
        for (const { skill } of completedPlan.steps) {
          const count = nonNullable(skillPlanCounts.get(skill)) - 1;
          if (count === 0) {
            skillPlanCounts.delete(skill);
          } else {
            skillPlanCounts.set(skill, count);
          }
        }
      }
    }
  }

  return plans;
}

export function skillReviewQueue({
  graph,
  skillSrsStates,
  recentSkillRatingEvents = emptyArray,
  remediators = skillReviewQueueRemediators,
  remediationConfig,
  dictionary,
  directSkills = emptySet,
  now = new Date(),
  maxQueueItems = Infinity,
}: {
  graph: SkillLearningGraph;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  recentSkillRatingEvents?: readonly SkillReviewQueueRatingEvent[];
  remediators?: readonly SkillReviewQueueRemediator[];
  remediationConfig?: SkillReviewQueueRemediationConfig;
  dictionary: Dictionary;
  directSkills?: ReadonlySet<Skill>;
  now?: Date;
  maxQueueItems?: number;
}): SkillReviewQueue {
  // Kahn topological sort
  const inDegree = new Map<Skill, number>();
  const queue: Skill[] = [];
  // Which skills have been included in the learning order.
  // This is used to avoid adding the same skill multiple times.
  const learningOrderIncluded = new Set<Skill>();
  const learningOrderOverDue: [Skill, Date][] = [];
  const learningOrderDue: [Skill, Date][] = [];
  const learningOrderNewCandidates: Skill[] = [];
  const learningOrderNotDue: [Skill, SrsStateType | undefined][] = [];
  const learningOrderBlocked: Skill[] = [];
  let newOverDueAt: Date | null = null;
  let newDueAt: Date | null = null;

  const perfMilestone = startPerformanceMilestones(`skillReviewQueue`);

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
      } else if (
        directSkills.has(skill) &&
        skillKindFromSkill(skill) !== SkillKind.HanziCharacterToWriting
      ) {
        learningOrderNewCandidates.push(skill);
      } else {
        learningOrderBlocked.push(skill);
      }
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
    const hanzi = isHanziWordSkill(skill)
      ? hanziFromHanziWord(hanziWordFromSkill(skill))
      : null;

    if (
      hanzi != null &&
      isHanziCharacter(hanzi) &&
      dictionary.isStructuralHanzi(hanzi)
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
    if (directSkills.has(skill)) {
      return true;
    }

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

  const recentSkillRatingHistoryHeap = new MinHeap<
    Pick<SkillReviewQueueRatingEvent, `skill` | `rating` | `createdAt`>
  >(
    inverseSortComparator(sortComparatorDate(({ createdAt }) => createdAt)),
    20,
  );
  const latestRatingEventsBySkill = new Map<
    Skill,
    SkillReviewQueueRatingEvent
  >();
  for (const event of recentSkillRatingEvents) {
    const previousEvent = latestRatingEventsBySkill.get(event.skill);
    if (previousEvent == null || previousEvent.createdAt < event.createdAt) {
      latestRatingEventsBySkill.set(event.skill, event);
    }
  }
  for (const event of latestRatingEventsBySkill.values()) {
    recentSkillRatingHistoryHeap.insert(event);
  }
  const recentSkillRatingHistory = recentSkillRatingHistoryHeap.toArray();

  perfMilestone(`reactiveItems`);

  const reactiveItems: SkillReviewQueueItem[] = [
    // Check if we should prioritize a pronunciation skill after successful hanzi-to-english review
    ...getReactivePronunciationSkills({
      recentSkillRatingHistory,
      skillSrsStates,
      graph,
      now,
    }),
    ...getReactiveHanziToTypedGlossSkills({
      recentSkillRatingHistory,
      skillSrsStates,
      graph,
      now,
    }),
    ...getReactiveHanziToPinyinTypedSkills({
      recentSkillRatingHistory,
      skillSrsStates,
      graph,
      now,
      dictionary,
    }),
  ];

  const remediationPlans = skillReviewQueueRemediationPlans({
    events: recentSkillRatingEvents,
    graph,
    skillSrsStates,
    remediators,
    remediatorContext: { dictionary, config: remediationConfig },
    now,
  });
  const remediationSkills = new Set<Skill>();
  for (const plan of remediationPlans) {
    for (const { skill } of plan.steps) {
      remediationSkills.add(skill);
    }
  }
  const activeRemediationPlan = remediationPlans.at(-1);
  const activeRemediationStep =
    activeRemediationPlan?.steps[activeRemediationPlan.currentStepIndex];

  mutableArrayFilter(
    learningOrderOverDue,
    ([skill]) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    learningOrderDue,
    ([skill]) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    learningOrderNewContent,
    (skill) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    learningOrderNewDifficulty,
    (skill) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    learningOrderNotDue,
    ([skill]) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    learningOrderBlocked,
    (skill) => !remediationSkills.has(skill),
  );
  mutableArrayFilter(
    reactiveItems,
    ({ skill }) => !remediationSkills.has(skill),
  );

  // Remove reactive items from the other queues so that items aren't duplicated
  // and counts are correct.

  mutableArrayFilter(
    learningOrderOverDue,
    ([skill]) =>
      !reactiveItems.some(
        ({ skill: reactiveSkill }) => reactiveSkill === skill,
      ),
  );
  mutableArrayFilter(
    learningOrderDue,
    ([skill]) =>
      !reactiveItems.some(
        ({ skill: reactiveSkill }) => reactiveSkill === skill,
      ),
  );
  mutableArrayFilter(
    learningOrderNewContent,
    (skill) =>
      !reactiveItems.some(
        ({ skill: reactiveSkill }) => reactiveSkill === skill,
      ),
  );
  mutableArrayFilter(
    learningOrderNewDifficulty,
    (skill) =>
      !reactiveItems.some(
        ({ skill: reactiveSkill }) => reactiveSkill === skill,
      ),
  );
  mutableArrayFilter(
    learningOrderNotDue,
    ([skill]) =>
      !reactiveItems.some(
        ({ skill: reactiveSkill }) => reactiveSkill === skill,
      ),
  );

  newDueAt = null;
  for (const [, srsState] of learningOrderNotDue) {
    if (
      srsState != null &&
      (newDueAt == null || newDueAt > srsState.nextReviewAt)
    ) {
      newDueAt = srsState.nextReviewAt;
    }
  }
  newOverDueAt = null;
  for (const [, nextReviewAt] of learningOrderDue) {
    if (newOverDueAt == null || newOverDueAt > nextReviewAt) {
      newOverDueAt = nextReviewAt;
    }
  }

  perfMilestone(`queueItems`);

  // Build items array and track index ranges
  const items: SkillReviewQueueItem[] = [];

  if (activeRemediationStep != null && maxQueueItems > items.length) {
    items.push({
      skill: activeRemediationStep.skill,
      flag: { kind: QuestionFlagKind.Retry },
    });
  }

  // 1. Reactive items
  for (const item of reactiveItems.slice(0, maxQueueItems - items.length)) {
    items.push(item);
  }

  // 2. Overdue items
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

  // 3. Due items
  for (const [skill] of topK(
    learningOrderDue,
    maxQueueItems - items.length,
    sortComparatorDate(([, x]) => x),
  )) {
    items.push({ skill });
  }

  // 4. New content items
  for (const skill of learningOrderNewContent.slice(
    0,
    maxQueueItems - items.length,
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.NewSkill } });
  }

  // 5. New difficulty items
  for (const skill of learningOrderNewDifficulty.slice(
    0,
    maxQueueItems - items.length,
  )) {
    items.push({ skill, flag: { kind: QuestionFlagKind.NewDifficulty } });
  }

  // 6. Not due items
  for (const skill of randomPickSkillsForReview(
    learningOrderNotDue,
    maxQueueItems - items.length,
    now,
  )) {
    items.push({ skill });
  }

  // 7. Blocked items
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
      retryCount: remediationPlans.length,
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
    mergeSortComparators(
      sortComparatorNumber(([skill]) => skillStrength.get(skill) ?? 0),
      // Alphabetical tie-breaker for deterministic ordering when strengths are equal.
      sortComparatorString(([skill]) => skill),
    ),
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
  [SkillKind.HanziCharacterToWriting]: `中文 → ✍️`,
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
    case SkillKind.HanziWordToGlossTyped:
    case SkillKind.HanziCharacterToWriting: {
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

export type ProficiencyColor =
  | `muted-fg`
  | `blue`
  | `emerald`
  | `violet`
  | `amber`;

export const rankPresentation = {
  0: {
    label: `Not Started`,
    description: `You haven't started practising this word yet.`,
    color: `muted-fg`,
  },
  1: {
    label: `Novice`,
    description: `You're beginning to learn this word.`,
    color: `blue`,
  },
  2: {
    label: `Apprentice`,
    description: `You're building familiarity and improving your recall.`,
    color: `emerald`,
  },
  3: {
    label: `Expert`,
    description: `You can remember this word reliably.`,
    color: `violet`,
  },
  4: {
    label: `Master`,
    description: `You've developed strong, long-term knowledge of this word.`,
    color: `amber`,
  },
} satisfies Record<
  RankNumber,
  { label: string; description: string; color: ProficiencyColor }
>;

export function rankToWithinLevelProgress({
  rank,
  completion,
}: {
  rank: RankNumber;
  completion: number;
}): number {
  if (rank === 0) {
    return 0;
  }
  if (rank === 4) {
    return 1;
  }
  return Math.max(0, Math.min(completion, 1));
}

export function rankToAbsoluteProgress({
  rank,
  completion,
}: {
  rank: RankNumber;
  completion: number;
}): number {
  if (rank === 0) {
    return 0;
  }
  if (rank === 4) {
    return 1;
  }
  return Math.max(0, Math.min((rank - 1 + completion) / 4, 1));
}

export function rankName(rank: RankNumber): string {
  return rankPresentation[rank].label;
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

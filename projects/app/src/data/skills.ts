import type { HanziWordWithMeaning } from "@/dictionary/dictionary";
import {
  characterCount,
  characterHasGlyph,
  decomposeHanzi,
  hanziFromHanziWord,
  hanziTextFromHanziChar,
  isHanziChar,
  lookupGloss,
  lookupHanzi,
  lookupHanziWord,
  splitHanziText,
  splitPinyinText,
} from "@/dictionary/dictionary";
import {
  emptySet,
  memoize1,
  sortComparatorDate,
  sortComparatorNumber,
} from "@/util/collections";
import { fsrsIsForgotten, fsrsIsStable, Rating } from "@/util/fsrs";
import { makePRNG } from "@/util/random";
import { invariant } from "@haohaohow/lib/invariant";
import type { Duration } from "date-fns";
import { sub } from "date-fns/sub";
import { subDays } from "date-fns/subDays";
import type { DeepReadonly } from "ts-essentials";
import { parseHhhmark } from "./hhhmark";
import type {
  HanziGlossMistake,
  HanziPinyinMistake,
  HanziWord,
  HanziWordSkillType,
  Mistake,
  OneCorrectPairQuestionChoice,
  SkillRating,
  SrsState,
} from "./model";
import { MistakeType, SkillType, SrsType } from "./model";
import type {
  HanziWordSkill,
  PinyinFinalAssociationSkill,
  PinyinInitialAssociationSkill,
  Skill,
} from "./rizzleSchema";
import { rSkillType, srsStateFromFsrsState } from "./rizzleSchema";

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

export const skillTypeFromSkill = (skill: Skill): SkillType => {
  const result = /^(.+?):/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillType] = result;
  invariant(marshaledSkillType != null, `couldn't parse skill type (before :)`);

  return rSkillType().unmarshal(marshaledSkillType);
};

export const hanziWordFromSkill = (skill: HanziWordSkill): HanziWord => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillType, hanziWord] = result;
  invariant(marshaledSkillType != null, `couldn't parse skill type (before :)`);
  invariant(hanziWord != null, `couldn't parse hanzi word (after :)`);

  return hanziWord as HanziWord;
};

export const initialFromPinyinInitialAssociationSkill = (
  skill: PinyinInitialAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillType, initial] = result;
  invariant(marshaledSkillType != null, `couldn't parse skill type (before :)`);
  invariant(initial != null, `couldn't parse pinyin initial (after :)`);

  return initial;
};

export const finalFromPinyinFinalAssociationSkill = (
  skill: PinyinFinalAssociationSkill,
): string => {
  const result = /^(.+?):(.+)$/.exec(skill);
  invariant(result != null, `doesn't match *:* pattern`);

  const [, marshaledSkillType, final] = result;
  invariant(marshaledSkillType != null, `couldn't parse skill type (before :)`);
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
  const skillType = skillTypeFromSkill(skill);

  switch (skillType) {
    case SkillType.GlossToHanziWord: {
      skill = skill as HanziWordSkill;
      // Learn the Hanzi -> Gloss first. It's easier to read than write (for chinese characters).
      deps.push(hanziWordToGloss(hanziWordFromSkill(skill)));
      break;
    }

    case SkillType.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      // If it's the component form of another base hanzi, learn that
      // first because it can help understand the meaning from the shape.
      if (isHanziChar(hanzi)) {
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

        if (meaning?.glossHint != null) {
          for (const node of parseHhhmark(meaning.glossHint)) {
            if (node.type === `hanziWord`) {
              deps.push(hanziWordToGloss(node.hanziWord));
            }
          }
        }
      }

      // Learn the components of a hanzi word first.
      for (const character of await decomposeHanzi(
        hanziFromHanziWord(hanziWordFromSkill(skill)),
      )) {
        if (await characterHasGlyph(character)) {
          // Check if the character was already added as a dependency by being
          // referenced in the gloss hint.
          const depAlreadyAdded = deps.some((x) => {
            if (skillTypeFromSkill(x) === SkillType.HanziWordToGloss) {
              skill = skill as HanziWordSkill;
              return (
                hanziFromHanziWord(hanziWordFromSkill(skill)) ===
                hanziTextFromHanziChar(character)
              );
            }
            return false;
          });

          // If the character wasn't already added, add it as a dependency by
          // guessing what disambugation to use for the hanzi.
          if (!depAlreadyAdded) {
            const hanziWordWithMeaning =
              await hackyGuessHanziWordToLearn(character);
            if (hanziWordWithMeaning != null) {
              const [hanziWord] = hanziWordWithMeaning;
              deps.push(hanziWordToGloss(hanziWord));
            }
          }
        }
      }
      break;
    }

    case SkillType.HanziWordToPinyin: {
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
      const characters = splitHanziText(hanzi);
      if (characters.length > 1) {
        for (const character of characters) {
          if (await characterHasGlyph(character)) {
            // We only have a character, but need a hanzi word to learn. So make
            // the best guess for the hanzi word to learn.
            for (const [charHanziWord, charMeaning] of await lookupHanzi(
              character,
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

    case SkillType.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        characterCount(hanzi) === 1,
        `${skillType} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinFinal(hanziWord));
      break;
    }

    case SkillType.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        characterCount(hanzi) === 1,
        `${skillType} only applies to single character hanzi`,
      );

      deps.push(hanziWordToPinyinInitial(hanziWord));
      break;
    }

    case SkillType.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const hanzi = hanziFromHanziWord(hanziWord);

      invariant(
        characterCount(hanzi) === 1,
        `${skillType} only applies to single character hanzi`,
      );

      // Learn the Hanzi -> Gloss first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToGloss(hanziWord));
      break;
    }

    case SkillType.PinyinToHanziWord: {
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

    case SkillType.Deprecated:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinFinalAssociation: {
      // Leaf skills (no dependencies).
      break;
    }
  }
  return deps;
}

async function hackyGuessHanziWordToLearn(
  hanzi: string,
): Promise<DeepReadonly<HanziWordWithMeaning> | undefined> {
  const hanziWords = await lookupHanzi(hanzi);
  for (const item of hanziWords) {
    return item;
  }
}

export function hanziWordSkill(
  type: HanziWordSkillType,
  hanziWord: HanziWord,
): HanziWordSkill {
  return `${rSkillType().marshal(type)}:${hanziWord}` as HanziWordSkill;
}

export const hanziWordToGloss = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToGloss, hanziWord);

export const hanziWordToPinyin = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyin, hanziWord);

export const hanziWordToPinyinInitial = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinInitial, hanziWord);

export const hanziWordToPinyinFinal = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinFinal, hanziWord);

export const hanziWordToPinyinTone = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinTone, hanziWord);

export const glossToHanziWord = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.GlossToHanziWord, hanziWord);

export function pinyinFinalAssociation(
  final: string,
): PinyinInitialAssociationSkill {
  return `${rSkillType().marshal(SkillType.PinyinFinalAssociation)}:${final}` as PinyinInitialAssociationSkill;
}

export function pinyinInitialAssociation(
  initial: string,
): PinyinInitialAssociationSkill {
  return `${rSkillType().marshal(SkillType.PinyinInitialAssociation)}:${initial}` as PinyinInitialAssociationSkill;
}

export interface SkillReviewQueue {
  available: readonly Skill[];
  blocked: readonly Skill[];
  dueCount: number;
  overDueCount: number;
  /**
   * When the number of "due" items will increase.
   */
  newDueAt: Date | null;
  /**
   * When the number of "over due" items will increase.
   */
  newOverDueAt: Date | null;
}

export function skillReviewQueue({
  graph,
  skillSrsStates,
  now = new Date(),
}: {
  graph: SkillLearningGraph;
  skillSrsStates: Map<Skill, SrsState>;
  now?: Date;
}): SkillReviewQueue {
  // Kahn topological sort
  const inDegree = new Map<Skill, number>();
  const queue: Skill[] = [];
  // Which skills have been included in the learning order.
  // This is used to avoid adding the same skill multiple times.
  const learningOrderIncluded = new Set<Skill>();
  const learningOrderOverDue: [Skill, Date][] = [];
  const learningOrderDue: [Skill, Date][] = [];
  const learningOrderNew: Skill[] = [];
  const learningOrderNotDue: [Skill, SrsState | undefined][] = [];
  const learningOrderBlocked: Skill[] = [];
  let newOverDueAt: Date | null = null;
  let newDueAt: Date | null = null;

  function enqueueReviewOnce(
    skill: Skill,
    srsState: SrsState | null | undefined,
  ) {
    if (learningOrderIncluded.has(skill)) {
      return;
    }
    learningOrderIncluded.add(skill);

    if (srsState == null || needsToBeIntroduced(srsState, now)) {
      if (hasStableDependencies(skill)) {
        learningOrderNew.push(skill);
      } else {
        learningOrderBlocked.push(skill);
      }
    } else {
      if (srsState.nextReviewAt > now) {
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

      switch (srsState?.type) {
        case SrsType.Mock: {
          break;
        }
        case SrsType.FsrsFourPointFive: {
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

  const available = [
    // First do over-due skills, by the most due (oldest date) first.
    ...learningOrderOverDue
      .sort(sortComparatorDate(([, due]) => due))
      .map(([skill]) => skill),
    // Then do due skills, by the most due (oldest date) first.
    ...learningOrderDue
      .sort(sortComparatorDate(([, due]) => due))
      .map(([skill]) => skill),
    // Then do new skills in the order of the learning graph.
    ...learningOrderNew.reverse(),
    // Finally sort the not-due skills.
    ...randomSortSkills(learningOrderNotDue),
  ];
  const blocked = learningOrderBlocked.reverse();

  return {
    available,
    blocked,
    dueCount: learningOrderDue.length,
    overDueCount: learningOrderOverDue.length,
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
const randomSortSkills = (skillStates: [Skill, SrsState | undefined][]) => {
  let totalWeight = 0;

  const weighted = skillStates.map(([skill, srsState]): [Skill, number] => {
    // Compute weights: lower stability = higher selection weight
    const learningScore =
      srsState?.type === SrsType.FsrsFourPointFive
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

const skillTypeShorthandMapping: Record<SkillType, string> = {
  [SkillType.Deprecated_EnglishToRadical]: `[deprecated]`,
  [SkillType.Deprecated_PinyinToRadical]: `[deprecated]`,
  [SkillType.Deprecated_RadicalToEnglish]: `[deprecated]`,
  [SkillType.Deprecated_RadicalToPinyin]: `[deprecated]`,
  [SkillType.Deprecated]: `[deprecated]`,
  [SkillType.GlossToHanziWord]: `EN → 中文`,
  [SkillType.HanziWordToGloss]: `中文 → EN`,
  [SkillType.HanziWordToPinyin]: `中文 → PY`,
  [SkillType.HanziWordToPinyinFinal]: `中文 → PY⁻ᶠ`,
  [SkillType.HanziWordToPinyinInitial]: `中文 → PYⁱ⁻`,
  [SkillType.HanziWordToPinyinTone]: `中文 → PYⁿ`,
  [SkillType.ImageToHanziWord]: `🏞️ → 中文`,
  [SkillType.PinyinFinalAssociation]: `PY⁻ᶠ → ✦`,
  [SkillType.PinyinInitialAssociation]: `PYⁱ⁻ → ✦`,
  [SkillType.PinyinToHanziWord]: `PY → 中文`,
};

export function skillTypeToShorthand(skillType: SkillType): string {
  return skillTypeShorthandMapping[skillType];
}

export async function skillsToReReviewForHanziGlossMistake(
  mistake: HanziGlossMistake,
): Promise<ReadonlySet<Skill>> {
  const skills = new Set<Skill>();

  // Queue all skills relevant to the gloss.
  for (const [hanziWord] of await lookupGloss(mistake.gloss)) {
    skills.add(hanziWordToGloss(hanziWord));
  }

  // Queue all skills relevant to the hanzi.
  for (const [hanziWord] of await lookupHanzi(mistake.hanzi)) {
    skills.add(hanziWordToGloss(hanziWord));
  }

  return skills;
}

export async function skillsToReReviewForHanziPinyinMistake(
  mistake: HanziPinyinMistake,
): Promise<ReadonlySet<Skill>> {
  const skills = new Set<Skill>();

  // Queue all skills relevant to the hanzi.
  for (const [hanziWord] of await lookupHanzi(mistake.hanzi)) {
    skills.add(hanziWordToPinyin(hanziWord));
  }

  return skills;
}

/**
 * Update the SRS state a skill that's related to a mistake that was made that
 * wasn't tied to a specific skill. It should make the skill reviewed again
 * soon.
 */
export function nextReviewForOtherSkillMistake<T extends SrsState>(
  srs: T,
  now: Date,
): T {
  switch (srs.type) {
    case SrsType.Mock: {
      return srs;
    }
    case SrsType.FsrsFourPointFive: {
      // Schedule the skill for immediate review, but don't actually mark it as
      // an error (`Rating.Again`) otherwise the difficulty and stability will
      // change, but they haven't actually made a mistake yet on that skill.
      return srsStateFromFsrsState({
        ...srs,
        nextReviewAt: now,
      }) as T;
    }
  }
}

export function oneCorrectPairQuestionChoiceMistakes(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): Mistake[] {
  const mistakes: Mistake[] = [];

  const mistakeChecks = [hanziGlossMistake, hanziPinyinMistake];
  // Check all combinations of the choices, this makes each check simpler as it
  // doesn't need to consider each direction.
  const choicePairs = [
    [choice1, choice2],
    [choice2, choice1],
  ] as const;

  for (const mistakeCheck of mistakeChecks) {
    for (const [choice1, choice2] of choicePairs) {
      const mistake = mistakeCheck(choice1, choice2);
      if (mistake) {
        mistakes.push(mistake);
      }
    }
  }
  return mistakes;
}

export function hanziGlossMistake(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): HanziGlossMistake | undefined {
  if (choice1.type === `hanzi` && choice2.type === `gloss`) {
    return {
      type: MistakeType.HanziGloss,
      hanzi: choice1.value,
      gloss: choice2.value,
    };
  }
}

export function hanziPinyinMistake(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): HanziPinyinMistake | undefined {
  if (choice1.type === `hanzi` && choice2.type === `pinyin`) {
    return {
      type: MistakeType.HanziPinyin,
      hanzi: choice1.value,
      pinyin: choice2.value,
    };
  }
}

/**
 * You get 1 day to review a skill before it becomes over-due.
 */
export const skillDueWindow: Duration = { hours: 24 };

export function isOverdue(srsState: SrsState, now: Date): boolean {
  return srsState.nextReviewAt < sub(now, skillDueWindow);
}

export function computeSkillRating(opts: {
  skill: Skill;
  correct: boolean;
  durationMs: number;
}): SkillRating {
  const { skill, correct, durationMs } = opts;

  let easyDuration;
  let goodDuration;

  switch (skillTypeFromSkill(opts.skill)) {
    case SkillType.HanziWordToPinyin:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinFinalAssociation:
    case SkillType.GlossToHanziWord:
    case SkillType.PinyinToHanziWord:
    case SkillType.ImageToHanziWord:
    case SkillType.HanziWordToGloss: {
      easyDuration = 5000;
      goodDuration = 10_000;
      break;
    }
    case SkillType.Deprecated:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated_PinyinToRadical: {
      throw new Error(
        `duration rating thresholds not implemented for ${skillTypeFromSkill(opts.skill)}`,
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

export function hanziOrPinyinWordCount(
  choice: OneCorrectPairQuestionChoice,
): number {
  switch (choice.type) {
    case `hanzi`: {
      return characterCount(choice.value);
    }
    case `pinyin`: {
      return splitPinyinText(choice.value).length;
    }
    case `gloss`: {
      throw new Error(`unexpected gloss choice in HanziWordToPinyin`);
    }
  }
}

// Skills that have either never been introduced, or were last reviewed too
// long ago and have been likely forgotten should be introduced.
export function needsToBeIntroduced(
  srsState: SrsState | undefined | null,
  now: Date,
): boolean {
  if (srsState == null) {
    return true;
  }

  switch (srsState.type) {
    case SrsType.FsrsFourPointFive: {
      return fsrsIsForgotten(srsState, now);
    }
    case SrsType.Mock: {
      // If it's more than 14 days over-due then assume it's forgotten.
      return srsState.nextReviewAt < subDays(now, 14);
    }
  }
}

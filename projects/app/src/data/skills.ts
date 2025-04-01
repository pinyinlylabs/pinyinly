import {
  characterHasGlyph,
  decomposeHanzi,
  glyphCount,
  hanziFromHanziWord,
  loadStandardPinyinChart,
  lookupGloss,
  lookupHanzi,
  lookupHanziWord,
  parsePinyin,
  splitHanziText,
} from "@/dictionary/dictionary";
import { sortComparatorNumber } from "@/util/collections";
import { fsrsIsIntroduced, nextReview, Rating } from "@/util/fsrs";
import { makePRNG } from "@/util/random";
import { invariant } from "@haohaohow/lib/invariant";
import type { Duration } from "date-fns";
import {
  HanziGlossMistake,
  HanziWord,
  HanziWordSkillType,
  Mistake,
  MistakeType,
  OneCorrectPairQuestionChoice,
  SkillRating,
  SkillType,
  SrsState,
  SrsType,
} from "./model";
import {
  HanziWordSkill,
  PinyinFinalAssociationSkill,
  PinyinInitialAssociationSkill,
  rSkillType,
  Skill,
  srsStateFromFsrsState,
} from "./rizzleSchema";

export interface Node {
  skill: Skill;
  dependencies: Set<Skill>; // todo: when are weights added?
}

export type SkillLearningGraph = Map<Skill, Node>;

export interface LearningOptions {
  learnNameBeforePinyin?: boolean;
  learnPinyinInitialBeforeFinal?: boolean;
  learnPinyinFinalBeforeTone?: boolean;
}

export async function skillLearningGraph(options: {
  targetSkills: Skill[];
  shouldSkipSubTree: (skill: Skill) => boolean;
  learningOptions?: LearningOptions;
}): Promise<SkillLearningGraph> {
  const learningOptions = options.learningOptions ?? {};
  const graph: SkillLearningGraph = new Map();

  async function addSkill(skill: Skill): Promise<void> {
    // Skip over any skills (and its dependency tree) that have already been
    // learned.
    if (options.shouldSkipSubTree(skill)) {
      return;
    }

    // Skip doing any work if the skill is already in the graph.
    if (graph.has(skill)) {
      return;
    }

    const dependencies = await skillDependencies(skill, learningOptions).then(
      (x) => x.filter((s) => !options.shouldSkipSubTree(s)),
    );

    const node: Node = {
      skill,
      dependencies: new Set(dependencies),
    };
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

export const skillType = (skill: Skill): SkillType => {
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

export const hanziWordToEnglishHanziWord = (
  skill: Skill,
): HanziWord | undefined => {
  if (skill.startsWith(`he:`)) {
    return skill.slice(3) as HanziWord;
  }
};

export async function skillDependencies(
  skill: Skill,
  learningOptions: LearningOptions,
): Promise<Skill[]> {
  const deps: Skill[] = [];

  switch (skillType(skill)) {
    case SkillType.EnglishToHanziWord: {
      skill = skill as HanziWordSkill;
      // Learn the Hanzi -> English first. It's easier to read than write (for chinese characters).
      deps.push(hanziWordToEnglish(hanziWordFromSkill(skill)));
      break;
    }
    case SkillType.HanziWordToPinyin: {
      skill = skill as HanziWordSkill;
      // Learn the Hanzi -> English first. Knowing the meaning of the character
      // is useful to create a mnemonic to remember the pronunciation.
      deps.push(hanziWordToEnglish(hanziWordFromSkill(skill)));
      const hanzi = hanziFromHanziWord(hanziWordFromSkill(skill));

      // If the hanzi word is multiple characters (e.g. 为什么:why) learn the
      // meaning of each one separately.
      const characters = splitHanziText(hanzi);
      if (characters.length > 1) {
        for (const character of characters) {
          if (await characterHasGlyph(character)) {
            const hanziWord = await hackyGuessHanziWordToLearn(character);
            if (hanziWord != null) {
              deps.push(hanziWordToPinyin(hanziWord));
            }
          }
        }
      }
      break;
    }
    case SkillType.HanziWordToEnglish: {
      skill = skill as HanziWordSkill;

      // Learn the components of a hanzi word first.
      for (const character of await decomposeHanzi(
        hanziFromHanziWord(hanziWordFromSkill(skill)),
      )) {
        if (await characterHasGlyph(character)) {
          // TODO: need to a better way to choose the meaning key.
          const hanziWord = await hackyGuessHanziWordToLearn(character);
          if (hanziWord != null) {
            deps.push(hanziWordToEnglish(hanziWord));
          }
        }
      }
      break;
    }
    case SkillType.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      const hanzi = hanziFromHanziWord(hanziWordFromSkill(skill));
      if (glyphCount(hanzi) > 1) {
        break;
      }

      if (learningOptions.learnPinyinInitialBeforeFinal === true) {
        deps.push(hanziWordToPinyinInitial(hanziWord));
      }

      const res = await lookupHanziWord(hanziWord);
      if (!res) {
        break;
      }

      const chart = await loadStandardPinyinChart();
      // TODO: when there are multiple pinyin, what should happen?
      const pinyin = res.pinyin?.[0];

      if (pinyin == null) {
        console.error(new Error(`no pinyin for ${hanziWord}`));
        break;
      }

      const final = parsePinyin(pinyin, chart)?.final;
      if (final == null) {
        console.error(
          new Error(`could not extract pinyin final for ${pinyin} `),
        );
        break;
      }

      deps.push(pinyinFinalAssociation(final));
      break;
    }
    case SkillType.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      const hanzi = hanziFromHanziWord(hanziWord);
      if (glyphCount(hanzi) > 1) {
        break;
      }

      const res = await lookupHanziWord(hanziWord);
      if (!res) {
        break;
      }

      const chart = await loadStandardPinyinChart();

      const pinyin = res.pinyin?.[0];
      if (pinyin == null) {
        console.error(new Error(`no pinyin for ${hanziWord}`));
        break;
      }

      const initial = parsePinyin(pinyin, chart)?.initial;
      if (initial == null) {
        console.error(
          new Error(`could not extract pinyin initial for ${pinyin} `),
        );
        break;
      }

      deps.push(pinyinInitialAssociation(initial));

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
    case SkillType.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      const hanzi = hanziFromHanziWord(hanziWord);
      if (glyphCount(hanzi) > 1) {
        break;
      }

      if (learningOptions.learnPinyinFinalBeforeTone === true) {
        deps.push(hanziWordToPinyinFinal(hanziWord));
      }
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
): Promise<HanziWord | undefined> {
  const hanziWords = await lookupHanzi(hanzi);
  for (const [hanziWord] of hanziWords) {
    return hanziWord;
  }
}

export function hanziWordSkill(
  type: HanziWordSkillType,
  hanziWord: HanziWord,
): HanziWordSkill {
  return `${rSkillType().marshal(type)}:${hanziWord}` as HanziWordSkill;
}

export const hanziWordToEnglish = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToEnglish, hanziWord);

export const hanziWordToPinyin = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyin, hanziWord);

export const hanziWordToPinyinInitial = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinInitial, hanziWord);

export const hanziWordToPinyinFinal = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinFinal, hanziWord);

export const hanziWordToPinyinTone = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.HanziWordToPinyinTone, hanziWord);

export const englishToHanziWord = (hanziWord: HanziWord) =>
  hanziWordSkill(SkillType.EnglishToHanziWord, hanziWord);

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

export function skillReviewQueue({
  graph,
  skillSrsStates,
  now = new Date(),
}: {
  graph: SkillLearningGraph;
  skillSrsStates: Map<Skill, SrsState>;
  now?: Date;
}): Skill[] {
  // Kahn topological sort
  const inDegree = new Map<Skill, number>();
  const queue: Skill[] = [];
  const learningOrderDue: [Skill, number][] = [];
  const learningOrderNew: Skill[] = [];
  const learningOrderNotDue: [Skill, SrsState | undefined][] = [];

  // Compute in-degree
  for (const [skill, node] of graph.entries()) {
    if (!inDegree.has(skill)) {
      inDegree.set(skill, 0);
    }

    for (const dependency of node.dependencies) {
      inDegree.set(dependency, (inDegree.get(dependency) ?? 0) + 1);
    }
  }

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

    if (srsState == null || !isSkillIntroduced(srsState)) {
      learningOrderNew.push(skill);
    } else if (srsState.nextReviewAt > now) {
      learningOrderNotDue.push([skill, srsState]);
    } else {
      learningOrderDue.push([skill, srsState.nextReviewAt.getTime()]);
    }

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

  return [
    // First do due skills, by the most due (oldest date) first.
    ...learningOrderDue
      .sort(sortComparatorNumber(([, due]) => due))
      .map(([skill]) => skill),
    // Then do new skills in the order of the learning graph.
    ...learningOrderNew.reverse(),
    // Finally sort the not-due skills.
    ...randomSortSkills(learningOrderNotDue),
  ];
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

const isSkillIntroduced = (srsState: SrsState) => {
  switch (srsState.type) {
    case SrsType.FsrsFourPointFive: {
      return fsrsIsIntroduced(srsState);
    }
    case SrsType.Mock: {
      return true;
    }
  }
};

const skillTypeShorthandMapping: Record<SkillType, string> = {
  [SkillType.Deprecated_EnglishToRadical]: `[deprecated]`,
  [SkillType.Deprecated_PinyinToRadical]: `[deprecated]`,
  [SkillType.Deprecated_RadicalToEnglish]: `[deprecated]`,
  [SkillType.Deprecated_RadicalToPinyin]: `[deprecated]`,
  [SkillType.Deprecated]: `[deprecated]`,
  [SkillType.EnglishToHanziWord]: `EN → 中文`,
  [SkillType.HanziWordToEnglish]: `中文 → EN`,
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
    skills.add(hanziWordToEnglish(hanziWord));
  }

  // Queue all skills relevant to the hanzi.
  for (const [hanziWord] of await lookupHanzi(mistake.hanzi)) {
    skills.add(hanziWordToEnglish(hanziWord));
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
      return srsStateFromFsrsState(nextReview(srs, Rating.Again, now)) as T;
    }
  }
}

export function oneCorrectPairQuestionChoiceMistakes(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): Mistake[] {
  const mistakes: Mistake[] = [];

  const mistakeChecks = [hanziGlossMistake];
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

/**
 * You get 1 day to review a skill before it becomes overdue.
 */
export const skillDueWindow: Duration = { hours: 24 };

export function computeSkillRating(opts: {
  skill: Skill;
  correct: boolean;
  hadPreviousMistake: boolean;
  durationMs: number;
}): SkillRating {
  const { skill, correct, durationMs, hadPreviousMistake } = opts;

  let easyDuration;
  let goodDuration;

  switch (skillType(opts.skill)) {
    case SkillType.HanziWordToPinyin:
    case SkillType.HanziWordToEnglish: {
      easyDuration = 5000;
      goodDuration = 10_000;
      break;
    }
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.EnglishToHanziWord:
    case SkillType.PinyinToHanziWord:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinFinalAssociation:
    case SkillType.Deprecated:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated_PinyinToRadical: {
      throw new Error(
        `duration rating thresholds not implemented for ${skillType(opts.skill)}`,
      );
    }
  }

  const rating = correct
    ? hadPreviousMistake
      ? Rating.Hard
      : durationMs < easyDuration
        ? Rating.Easy
        : durationMs < goodDuration
          ? Rating.Good
          : Rating.Hard
    : Rating.Again;

  return { skill, rating, durationMs };
}

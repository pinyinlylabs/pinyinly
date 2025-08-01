import type {
  HanziWord,
  Question,
  QuestionFlagType,
  SrsStateType,
} from "@/data/model";
import { QuestionFlagKind, SkillKind, SrsKind } from "@/data/model";
import { generateQuestionForSkillOrThrow } from "@/data/questions";
import type { Rizzle, Skill, SkillRating } from "@/data/rizzleSchema";
import type { SkillReviewQueue } from "@/data/skills";
import {
  hanziWordToGloss,
  hanziWordToPinyin,
  skillDueWindow,
  skillKindFromSkill,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  getIsStructuralHanziWord,
} from "@/dictionary/dictionary";
import { arrayFilterUniqueWithKey } from "@/util/collections";
import { fsrsIsForgotten } from "@/util/fsrs";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";

export async function questionsForReview2(
  r: Rizzle,
  options?: {
    limit?: number;
  },
): Promise<[Question[], SkillReviewQueue]> {
  const questions: Question[] = [];
  const reviewQueue = await targetSkillsReviewQueue(r);

  for (const [i, skill] of reviewQueue.items.entries()) {
    const skillState = await r.replicache.query((tx) =>
      r.query.skillState.get(tx, { skill }),
    );

    try {
      const question = await generateQuestionForSkillOrThrow(skill);
      const isRetry = reviewQueue.retryCount > 0 && i < reviewQueue.retryCount;
      if (isRetry) {
        question.flag ??= {
          kind: QuestionFlagKind.Retry,
        };
      }
      question.flag ??= flagsForSrsState(skillState?.srs);

      // Instead of saying "New Skill" when it's just a harder version of an
      // existing skill, we say "New Difficulty" instead.
      if (
        question.flag?.kind == QuestionFlagKind.NewSkill &&
        isNewDifficultySkillType(skillKindFromSkill(skill))
      ) {
        question.flag = { kind: QuestionFlagKind.NewDifficulty };
      }

      questions.push(question);
    } catch (error) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skill)}`,
        error,
      );
      continue;
    }

    if (options?.limit != null && questions.length === options.limit) {
      break;
    }
  }

  return [questions, reviewQueue];
}

function isNewDifficultySkillType(skillKind: SkillKind): boolean {
  return (
    skillKind === SkillKind.HanziWordToPinyinFinal ||
    skillKind === SkillKind.HanziWordToPinyinTone
  );
}

export function flagsForSrsState(
  srsState: SrsStateType | undefined,
): QuestionFlagType | undefined {
  if (
    srsState?.kind !== SrsKind.FsrsFourPointFive ||
    fsrsIsForgotten(srsState)
  ) {
    return {
      kind: QuestionFlagKind.NewSkill,
    };
  }
  const now = new Date();
  const overDueDate = add(srsState.nextReviewAt, skillDueWindow);

  if (now >= overDueDate) {
    return {
      kind: QuestionFlagKind.Overdue,
      interval: interval(overDueDate.getTime(), now),
    };
  }
}

export async function getAllTargetHanziWords(): Promise<HanziWord[]> {
  const [hsk1HanziWords, hsk2HanziWords] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
  ]);

  return [...hsk1HanziWords, ...hsk2HanziWords].filter(
    arrayFilterUniqueWithKey((x) => x),
  );
}

export async function getAllTargetSkills(): Promise<Skill[]> {
  const hanziWords = await getAllTargetHanziWords();
  return hanziWords.flatMap((w) => [hanziWordToGloss(w), hanziWordToPinyin(w)]);
}

export async function targetSkillsReviewQueue(
  r: Rizzle,
): Promise<SkillReviewQueue> {
  const targetSkills = await getAllTargetSkills();
  return await computeSkillReviewQueue(r, targetSkills);
}

export async function computeSkillReviewQueue(
  r: Rizzle,
  targetSkills: Skill[],
  /**
   * exposed for testing/simulating different times
   */
  now = new Date(),
): Promise<SkillReviewQueue> {
  const graph = await skillLearningGraph({ targetSkills });

  const skillSrsStates = new Map<Skill, SrsStateType>();
  for await (const [, v] of r.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }

  const latestSkillRatings = new Map<Skill, SkillRating>();
  // const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
  for await (const [, v] of r.queryPaged.skillRating.byCreatedAt()) {
    latestSkillRatings.set(v.skill, v);
  }

  const isStructuralHanziWord = await getIsStructuralHanziWord();

  return skillReviewQueue({
    graph,
    skillSrsStates,
    latestSkillRatings,
    now,
    isStructuralHanziWord,
  });
}

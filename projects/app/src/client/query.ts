import { generateQuestionForSkillOrThrow } from "@/data/generator";
import type { Question, QuestionFlag, SrsState } from "@/data/model";
import { QuestionFlagType, SrsType } from "@/data/model";
import type { Rizzle, Skill, SkillRating } from "@/data/rizzleSchema";
import type { SkillReviewQueue } from "@/data/skills";
import {
  hanziWordToGloss,
  hanziWordToPinyin,
  skillDueWindow,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import { allHsk1HanziWords, allHsk2HanziWords } from "@/dictionary/dictionary";
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
          type: QuestionFlagType.Retry,
        };
      }
      question.flag ??= flagsForSrsState(skillState?.srs);
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

export function flagsForSrsState(
  srsState: SrsState | undefined,
): QuestionFlag | undefined {
  if (
    srsState?.type !== SrsType.FsrsFourPointFive ||
    fsrsIsForgotten(srsState)
  ) {
    return {
      type: QuestionFlagType.NewSkill,
    };
  }
  const now = new Date();
  const overDueDate = add(srsState.nextReviewAt, skillDueWindow);

  if (now >= overDueDate) {
    return {
      type: QuestionFlagType.Overdue,
      interval: interval(overDueDate.getTime(), now),
    };
  }
}

export async function getAllTargetSkills(): Promise<Skill[]> {
  const [hsk1HanziWords, hsk2HanziWords] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
  ]);

  return [...hsk1HanziWords, ...hsk2HanziWords].flatMap((w) => [
    hanziWordToGloss(w),
    hanziWordToPinyin(w),
  ]);
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

  const skillSrsStates = new Map<Skill, SrsState>();
  for await (const [, v] of r.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }

  const latestSkillRatings = new Map<Skill, SkillRating>();
  // const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
  for await (const [, v] of r.queryPaged.skillRating.byCreatedAt()) {
    latestSkillRatings.set(v.skill, v);
  }

  return skillReviewQueue({
    graph,
    skillSrsStates,
    latestSkillRatings,
    now,
  });
}

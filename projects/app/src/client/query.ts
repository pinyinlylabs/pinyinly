import { generateQuestionForSkillOrThrow } from "@/data/generator";
import {
  Question,
  QuestionFlag,
  QuestionFlagType,
  SrsState,
  SrsType,
} from "@/data/model";
import { Rizzle, Skill } from "@/data/rizzleSchema";
import {
  hanziWordToGloss,
  hanziWordToPinyin,
  skillDueWindow,
  skillLearningGraph,
  SkillReviewQueue,
  skillReviewQueue,
} from "@/data/skills";
import { allHsk1HanziWords, allHsk2HanziWords } from "@/dictionary/dictionary";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";

export async function questionsForReview2(
  r: Rizzle,
  options?: {
    limit?: number;
  },
): Promise<Question[]> {
  const result: Question[] = [];

  for (const skill of await targetSkillsReviewQueue(r).then(
    (q) => q.available,
  )) {
    const skillState = await r.replicache.query((tx) =>
      r.query.skillState.get(tx, { skill }),
    );

    try {
      const question = await generateQuestionForSkillOrThrow(skill);
      question.flag ??= flagsForSrsState(skillState?.srs);
      result.push(question);
    } catch (error) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skill)}`,
        error,
      );
      continue;
    }

    if (options?.limit != null && result.length === options.limit) {
      break;
    }
  }

  return result;
}

export function flagsForSrsState(
  srsState: SrsState | undefined,
): QuestionFlag | undefined {
  if (srsState?.type !== SrsType.FsrsFourPointFive) {
    return {
      type: QuestionFlagType.NewSkill,
    };
  }
  const now = new Date();
  const overdueDate = add(srsState.nextReviewAt, skillDueWindow);

  if (now >= overdueDate) {
    return {
      type: QuestionFlagType.Overdue,
      interval: interval(overdueDate.getTime(), now),
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

  return skillReviewQueue({ graph, skillSrsStates, now });
}

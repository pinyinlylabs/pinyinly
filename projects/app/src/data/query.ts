import { Rizzle } from "@/client/ui/ReplicacheContext";
import { interval } from "date-fns/interval";
import shuffle from "lodash/shuffle";
import take from "lodash/take";
import { generateQuestionForSkillOrThrow } from "./generator";
import {
  Question,
  QuestionFlag,
  QuestionFlagType,
  Skill,
  SkillState,
  SkillType,
} from "./model";

export async function questionsForReview(
  r: Rizzle,
  options?: {
    skillTypes?: readonly SkillType[];
    sampleSize?: number;
    dueBeforeNow?: boolean;
    filter?: (skill: Skill, skillState: SkillState) => boolean;
    limit?: number;
  },
): Promise<[Skill, SkillState, Question][]> {
  const result: [Skill, SkillState, Question][] = [];
  const now = new Date();
  const skillTypesFilter =
    options?.skillTypes != null ? new Set(options.skillTypes) : null;

  for await (const [{ skill }, skillState] of r.queryPaged.skillState.byDue()) {
    // Only consider skills that are due for review.
    if (options?.dueBeforeNow === true && skillState.due > now) {
      continue;
    }

    // Only consider radical skills
    if (skillTypesFilter != null && !skillTypesFilter.has(skill.type)) {
      continue;
    }

    if (options?.filter && !options.filter(skill, skillState)) {
      continue;
    }

    try {
      const question = await generateQuestionForSkillOrThrow(skill);
      question.flag ??= flagsForSkillState(skillState);
      result.push([skill, skillState, question]);
    } catch (e) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skill)}`,
        e,
      );
      continue;
    }

    if (options?.sampleSize != null) {
      if (result.length === options.sampleSize) {
        break;
      }
    } else if (options?.limit != null && result.length === options.limit) {
      break;
    }
  }

  if (options?.sampleSize != null) {
    return take(shuffle(result), options.limit ?? Infinity);
  }

  return result;
}

function flagsForSkillState(skillState: SkillState): QuestionFlag | undefined {
  {
    const now = new Date();
    const overdueDate = new Date(
      skillState.due.getTime() + 24 * 60 * 60 * 1000,
    );

    if (now >= overdueDate) {
      return {
        type: QuestionFlagType.Overdue,
        interval: interval(overdueDate.getTime(), now),
      };
    }
  }
}

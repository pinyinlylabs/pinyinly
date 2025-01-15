import { Rizzle } from "@/components/ReplicacheContext";
import shuffle from "lodash/shuffle";
import take from "lodash/take";
import { ReadTransaction } from "replicache";
import { generateQuestionForSkillOrThrow } from "./generator";
import { Question, Skill, SkillState, SkillType } from "./model";

export async function questionsForReview(
  r: Rizzle,
  tx: ReadTransaction,
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
  for await (const [{ skill }, skillState] of r.query.skillState.scan(tx)) {
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
      result.push([
        skill,
        skillState,
        await generateQuestionForSkillOrThrow(skill),
      ]);
    } catch (e) {
      console.error(e);
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

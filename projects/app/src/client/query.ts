import { Rizzle } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import {
  Question,
  QuestionFlag,
  QuestionFlagType,
  Skill,
  SkillState,
  SkillType,
} from "@/data/model";
import { MarshaledSkill, rSkill } from "@/data/rizzleSchema";
import {
  hanziWordToEnglish,
  skillId,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import { allHsk1Words } from "@/dictionary/dictionary";
import { interval } from "date-fns/interval";
import shuffle from "lodash/shuffle";
import take from "lodash/take";

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

export async function questionsForReview2(
  r: Rizzle,
  options?: {
    limit?: number;
  },
): Promise<Question[]> {
  const result: Question[] = [];

  for (const skill of await hsk1SkillReview(r)) {
    const skillState = await r.replicache.query((tx) =>
      r.query.skillState.get(tx, { skill }),
    );

    try {
      const question = await generateQuestionForSkillOrThrow(skill);
      if (skillState != null) {
        question.flag ??= flagsForSkillState(skillState);
      }
      result.push(question);
    } catch (e) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skill)}`,
        e,
      );
      continue;
    }

    if (options?.limit != null && result.length === options.limit) {
      break;
    }
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

export async function hsk1SkillReview(r: Rizzle): Promise<Skill[]> {
  const learnedSkills = await r.replicache.query(async (tx) => {
    const now = new Date();
    const res = new Set<MarshaledSkill>();
    for await (const [k, v] of r.query.skillState.scan(tx)) {
      if (v.due > now) {
        res.add(skillId(k.skill));
      }
    }
    return res;
  });

  const hsk1Words = await allHsk1Words();

  const graph = await skillLearningGraph({
    targetSkills: hsk1Words.map((w) => hanziWordToEnglish(w)),
    isSkillLearned: (skill) => learnedSkills.has(skill),
  });

  const x = rSkill();

  return skillReviewQueue(graph).map((s) => x.unmarshal(s));
}

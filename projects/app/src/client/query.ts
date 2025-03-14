import { Rizzle } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import {
  HanziWord,
  Question,
  QuestionFlag,
  QuestionFlagType,
  Skill,
  SkillState,
  SkillType,
  SrsType,
} from "@/data/model";
import {
  MarshaledSkill,
  rSkillMarshal,
  rSkillUnmarshal,
} from "@/data/rizzleSchema";
import {
  hanziWordToEnglish,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import { allHsk1HanziWords, lookupHanziWord } from "@/dictionary/dictionary";
import { fsrsIsIntroduced, fsrsIsLearned } from "@/util/fsrs";
import { useQuery } from "@tanstack/react-query";
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
    options?.skillTypes == null ? null : new Set(options.skillTypes);

  for await (const [, skillState] of r.queryPaged.skillState.byDue()) {
    // Only consider skills that are due for review.
    if (options?.dueBeforeNow === true && skillState.due > now) {
      continue;
    }

    // Only consider radical skills
    if (
      skillTypesFilter != null &&
      !skillTypesFilter.has(skillState.skill.type)
    ) {
      continue;
    }

    // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
    if (options?.filter && !options.filter(skillState.skill, skillState)) {
      continue;
    }

    try {
      const question = await generateQuestionForSkillOrThrow(skillState.skill);
      question.flag ??= flagsForSkillState(skillState);
      result.push([skillState.skill, skillState, question]);
    } catch (error) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skillState.skill)}`,
        error,
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
      question.flag ??= flagsForSkillState(skillState);
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

export function flagsForSkillState(
  skillState: SkillState | undefined,
): QuestionFlag | undefined {
  if (
    skillState?.srs?.type !== SrsType.FsrsFourPointFive ||
    !fsrsIsIntroduced(skillState.srs)
  ) {
    return {
      type: QuestionFlagType.NewSkill,
    };
  }
  const now = new Date();
  // Something is overdue if its due date was more than 1 day ago.
  const overdueDate = new Date(skillState.due.getTime() + 24 * 60 * 60 * 1000);

  if (now >= overdueDate) {
    return {
      type: QuestionFlagType.Overdue,
      interval: interval(overdueDate.getTime(), now),
    };
  }
}

export async function hsk1SkillReview(r: Rizzle): Promise<Skill[]> {
  const targetSkills = await allHsk1HanziWords().then((words) =>
    words.map((w) => hanziWordToEnglish(w)),
  );

  return await computeSkillReviewQueue(r, targetSkills);
}

export async function computeSkillReviewQueue(
  r: Rizzle,
  targetSkills: Skill[],
  /**
   * exposed for testing/simulating different times
   */
  now = new Date(),
): Promise<Skill[]> {
  const learnedSkills = new Set<MarshaledSkill>();
  const dueSkills = new Set<MarshaledSkill>();
  for await (const [, v] of r.queryPaged.skillState.scan()) {
    const skillId = rSkillMarshal(v.skill);
    if (v.srs) {
      if (fsrsIsLearned(v.srs)) {
        learnedSkills.add(skillId);
      } else if (fsrsIsIntroduced(v.srs) && v.due <= now) {
        dueSkills.add(skillId);
      }
    }
  }

  const graph = await skillLearningGraph({
    targetSkills,
    isSkillLearned: (skill) => learnedSkills.has(skill),
  });

  return skillReviewQueue({
    graph,
    isSkillDue: (skill) => dueSkills.has(skill),
  }).map((s) => rSkillUnmarshal(s));
}

export const useHanziWordMeaning = (hanziWord: HanziWord) => {
  return useQuery({
    queryKey: [useHanziWordMeaning.name, hanziWord],
    queryFn: async () => {
      return await lookupHanziWord(hanziWord);
    },
    staleTime: Infinity,
  });
};

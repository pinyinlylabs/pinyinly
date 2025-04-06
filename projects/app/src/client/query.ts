import { generateQuestionForSkillOrThrow } from "@/data/generator";
import {
  HanziWord,
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
  skillReviewQueue,
} from "@/data/skills";
import { allHsk1HanziWords, lookupHanziWord } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";

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

export async function getAllTargetSkills() {
  return await allHsk1HanziWords().then((words) =>
    words.flatMap((w) => [hanziWordToGloss(w), hanziWordToPinyin(w)]),
  );
}

export async function hsk1SkillReview(r: Rizzle): Promise<Skill[]> {
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
): Promise<Skill[]> {
  const skillSrsStates = new Map<Skill, SrsState>();
  for await (const [, v] of r.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }

  const graph = await skillLearningGraph({ targetSkills });

  return skillReviewQueue({ graph, skillSrsStates, now });
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

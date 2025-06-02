import { lookupHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import type { HanziToPinyinQuestion, Question } from "../model";
import { QuestionKind } from "../model";
import type { HanziWordSkill } from "../rizzleSchema";
import { hanziWordFromSkill } from "../skills";

export async function hanziWordToPinyinQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<HanziToPinyinQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);

  const answers = meaning?.pinyin;
  invariant(answers != null, `hanzi word ${hanziWord} has no pinyin`);

  return validQuestionInvariant({
    kind: QuestionKind.HanziToPinyin,
    answers,
    skill,
  });
}

function validQuestionInvariant<T extends Question>(question: T): T {
  switch (question.kind) {
    case QuestionKind.OneCorrectPair:
    case QuestionKind.HanziToPinyin:
    case QuestionKind.MultipleChoice: {
      break;
    }
  }

  return question;
}

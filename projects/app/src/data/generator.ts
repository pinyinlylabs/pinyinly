import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  HanziWordMeaning,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import { DeepReadonly } from "ts-essentials";
import {
  HanziWord,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  Question,
  QuestionType,
  SkillType,
} from "./model";
import { HanziWordSkill, Skill } from "./rizzleSchema";
import { hanziWordFromSkill, hanziWordToEnglish, skillType } from "./skills";

function keyForChoice(choice: OneCorrectPairQuestionChoice) {
  const { skill, type, ...rest } = choice;
  return JSON.stringify(rest);
}

function uniqueChoicesInvariant(choices: OneCorrectPairQuestionChoice[]) {
  const seen = new Set<string>();

  for (const choice of choices) {
    const key = keyForChoice(choice);
    invariant(!seen.has(key), `duplicate choice ${key}`);
    seen.add(key);
  }
}

function validQuestionInvariant(question: Question) {
  switch (question.type) {
    case QuestionType.OneCorrectPair: {
      // Ensure there aren't two identical choices in the same group.
      uniqueChoicesInvariant(question.groupA.map((x) => x.a));
      uniqueChoicesInvariant(question.groupB.map((x) => x.b));
      invariant(question.groupA.includes(question.answer));
      invariant(question.groupB.includes(question.answer));
      break;
    }
    case QuestionType.MultipleChoice: {
      break;
    }
  }

  return question;
}

// generate a question to test a skill
export async function generateQuestionForSkillOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skillType(skill)) {
    case SkillType.HanziWordToEnglish: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const rowCount = 5;
      const answer: OneCorrectPairQuestionAnswer = {
        a: { type: `hanzi`, hanziWord, skill },
        b: { type: `gloss`, hanziWord, skill },
      };

      const otherAnswers: OneCorrectPairQuestionAnswer[] = [];
      for (const [hanziWord2, meaning] of await getWrongHanziWordAnswers(
        hanziWord,
        (rowCount - 1) * 2,
      )) {
        const skill2 = hanziWordToEnglish(hanziWord2);
        const gloss = meaning.gloss[0];
        invariant(gloss != null, `missing gloss for hanzi word ${hanziWord2}`);
        otherAnswers.push({
          a: { type: `hanzi`, hanziWord: hanziWord2, skill: skill2 },
          b: { type: `gloss`, hanziWord: hanziWord2, skill: skill2 },
        });
      }
      const [wrongA, wrongB] = evenHalve(otherAnswers);
      return validQuestionInvariant({
        type: QuestionType.OneCorrectPair,
        prompt: `Match a word with its name`,
        groupA: shuffle([...wrongA, answer]),
        groupB: shuffle([...wrongB, answer]),
        answer,
      });
    }
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated:
    case SkillType.EnglishToHanziWord:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinFinalAssociation:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinToHanziWord: {
      throw new Error(`todo: not implemented`);
    }
  }
}

function evenHalve<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.floor(items.length / 2);
  const a = items.slice(0, splitIndex);
  const b = items.slice(splitIndex, splitIndex + a.length);
  return [a, b];
}

type OtherHanziResult = [HanziWord, DeepReadonly<HanziWordMeaning>][];

async function getWrongHanziWordAnswers(
  hanziWord: HanziWord,
  count: number,
): Promise<OtherHanziResult> {
  const hanziWordMeaning = await lookupHanziWord(hanziWord);
  invariant(
    hanziWordMeaning != null,
    `missing meaning for hanzi word ${hanziWord}`,
  );

  const result: OtherHanziResult = [];

  const [hsk1HanziWords, hsk2HanziWords, hsk3HanziWords] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
    allHsk3HanziWords(),
  ]);

  // Use words from the same HSK word list if possible, so that they're more
  // likely to be familiar by being in a similar skill level. Otherwise fallback
  // all HSK words.
  const allHanziWords = [hsk1HanziWords, hsk2HanziWords, hsk3HanziWords].find(
    (words) => words.includes(hanziWord),
  ) ?? [...hsk1HanziWords, ...hsk2HanziWords, ...hsk3HanziWords];

  // Keep track of which glosses have been used so that we don't have multiple
  // choices in the quiz that have the same meaning. Otherwise there could be a
  // pair of "wrong choices" that have overlapping meanings and if picked would
  // be marked incorrect.
  const usedGlosses = new Set(hanziWordMeaning.gloss);

  for (const x of shuffle(allHanziWords)) {
    const meaning = await lookupHanziWord(x);
    if (meaning == null) {
      continue;
    }

    // Don't use any words that have meanings that are too similar and could be
    // confusing.
    if (meaning.gloss.some((x) => usedGlosses.has(x))) {
      continue;
    }

    result.push([x, meaning]);
    for (const gloss of meaning.gloss) {
      usedGlosses.add(gloss);
    }

    if (result.length === count) {
      break;
    }
  }

  invariant(
    result.length == count,
    `couldn't get enough other choices ${result.length} != ${count}`,
  );

  return result;
}

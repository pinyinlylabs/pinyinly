import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  hanziFromHanziWord,
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
  Skill,
  SkillType,
} from "./model";
import { hanziWordToEnglish } from "./skills";

type BuilderChoice =
  | { hanzi: string; skill: Skill }
  | { pinyin: string; skill: Skill }
  | { definition: string; skill: Skill }
  | { name: string; skill: Skill };

const choice = (x: BuilderChoice): OneCorrectPairQuestionChoice =>
  `hanzi` in x
    ? { type: `hanzi`, hanzi: x.hanzi, skill: x.skill }
    : `pinyin` in x
      ? { type: `pinyin`, pinyin: x.pinyin, skill: x.skill }
      : `definition` in x
        ? { type: `definition`, english: x.definition, skill: x.skill }
        : { type: `name`, english: x.name, skill: x.skill };

const choicePair = (
  a: BuilderChoice,
  b: BuilderChoice,
): OneCorrectPairQuestionAnswer => ({
  a: choice(a),
  b: choice(b),
});

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
    case QuestionType.MultipleChoice:
      break;
  }

  return question;
}

// generate a question to test a skill
export async function generateQuestionForSkillOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skill.type) {
    case SkillType.HanziWordToEnglish: {
      const gloss = (await lookupHanziWord(skill.hanziWord))?.gloss[0];
      invariant(
        gloss != null,
        `missing gloss for hanzi word ${skill.hanziWord}`,
      );
      const rowCount = 5;
      const answer = choicePair(
        { hanzi: hanziFromHanziWord(skill.hanziWord), skill },
        {
          definition: gloss,
          skill,
        },
      );
      const otherAnswers: OneCorrectPairQuestionAnswer[] = [];
      for (const [hanziWord, meaning] of await getOtherHanzi(
        skill.hanziWord,
        (rowCount - 1) * 2,
      )) {
        const skill = hanziWordToEnglish(hanziWord);
        const gloss = meaning.gloss[0];
        invariant(gloss != null, `missing gloss for hanzi word ${hanziWord}`);
        otherAnswers.push(
          choicePair(
            { hanzi: hanziWord, skill },
            {
              definition: gloss,
              skill,
            },
          ),
        );
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
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.EnglishToHanziWord:
    case SkillType.PinyinToHanziWord:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinFinalAssociation:
    case SkillType.PinyinInitialAssociation:
    case SkillType.Deprecated:
      throw new Error(`todo: not implemented`);
  }
}

function evenHalve<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.floor(items.length / 2);
  const a = items.slice(0, splitIndex);
  const b = items.slice(splitIndex, splitIndex + a.length);
  return [a, b];
}

type OtherHanziResult = [HanziWord, DeepReadonly<HanziWordMeaning>][];

async function getOtherHanzi(
  hanziWord: HanziWord,
  count: number,
): Promise<OtherHanziResult> /* hanzi */ {
  const result: OtherHanziResult = [];

  const [hsk1HanziWords, hsk2Words, hsk3Words] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
    allHsk3HanziWords(),
  ]);

  // Use words from the same HSK word list if possible, so that they're more
  // likely to be familiar by being in a similar skill level. Otherwise fallback
  // all HSK words.
  const allHanziWords = [hsk1HanziWords, hsk2Words, hsk3Words].find((words) =>
    words.includes(hanziWord),
  ) ?? [...hsk1HanziWords, ...hsk2Words, ...hsk3Words];

  const seenHanziWords = new Set(hanziWord);
  for (const x of shuffle(allHanziWords)) {
    if (seenHanziWords.has(x)) {
      continue;
    }

    const meaning = await lookupHanziWord(x);
    if (meaning == null) {
      continue;
    }

    seenHanziWords.add(x);
    result.push([x, meaning]);

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

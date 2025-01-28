import {
  allHsk1Words,
  allHsk2Words,
  allHsk3Words,
  allRadicals,
  lookupRadicalByHanzi,
  lookupRadicalNameMnemonic,
  lookupWord,
  Radical,
} from "@/dictionary/dictionary";
import { randomOne } from "@/util/collections";
import { invariant } from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import {
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  Question,
  QuestionType,
  RadicalSkill,
  Skill,
  SkillType,
} from "./model";

type BuilderChoice =
  | { radical: string; skill: Skill }
  | { hanzi: string; skill: Skill }
  | { pinyin: string; skill: Skill }
  | { definition: string; skill: Skill }
  | { name: string; skill: Skill };

const choice = (x: BuilderChoice): OneCorrectPairQuestionChoice =>
  `radical` in x
    ? { type: `radical`, hanzi: x.radical, skill: x.skill }
    : `hanzi` in x
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
    case SkillType.RadicalToEnglish: {
      const radical = await lookupRadicalByHanzi(skill.hanzi);
      invariant(radical != null, `couldn't find a radical`);
      const rowCount = 5;
      const answer = choicePair(
        { radical: skill.hanzi, skill },
        { name: skill.name, skill },
      );
      const [wrongA, wrongB] = evenHalve(
        getOtherChoices(
          shuffle(
            (await allRadicals()).flatMap((r) => {
              const result = [];
              for (const radical of r.hanzi) {
                for (const name of r.name) {
                  const skill = {
                    type: SkillType.EnglishToRadical,
                    hanzi: radical,
                    name,
                  } as const;
                  result.push(choicePair({ radical, skill }, { name, skill }));
                }
              }
              return result;
            }),
          ),
          {
            initial: [keyForChoice(answer.a), keyForChoice(answer.b)],
            fn: (r) => [keyForChoice(r.a), keyForChoice(r.b)],
          },
          (rowCount - 1) * 2,
        ),
      );

      const hint = await lookupRadicalNameMnemonic(skill.hanzi);
      return validQuestionInvariant({
        type: QuestionType.OneCorrectPair,
        prompt: `Match a radical with its name`,
        groupA: shuffle([answer, ...wrongA]),
        groupB: shuffle([answer, ...wrongB]),
        answer,
        hint: hint?.mnemonic,
      });
    }
    case SkillType.RadicalToPinyin: {
      const radical = await lookupRadicalByHanzi(skill.hanzi);
      invariant(radical !== null, `couldn't find a radical`);
      const rowCount = 5;
      const answer = choicePair(
        { radical: skill.hanzi, skill },
        { pinyin: skill.pinyin, skill },
      );
      const [wrongA, wrongB] = evenHalve(
        getOtherChoices(
          shuffle(
            (await allRadicals()).flatMap((r) => {
              const result = [];
              for (const radical of r.hanzi) {
                for (const pinyin of r.pinyin) {
                  const skill = {
                    type: SkillType.RadicalToPinyin,
                    hanzi: radical,
                    pinyin,
                  } as const;
                  result.push(
                    choicePair({ radical, skill }, { pinyin, skill }),
                  );
                }
              }
              return result;
            }),
          ),
          {
            initial: [keyForChoice(answer.a), keyForChoice(answer.b)],
            fn: (r) => [keyForChoice(r.a), keyForChoice(r.b)],
          },
          (rowCount - 1) * 2,
        ),
      );

      return validQuestionInvariant({
        type: QuestionType.OneCorrectPair,
        prompt: `Match a radical with its pinyin`,
        groupA: shuffle([answer, ...wrongA]),
        groupB: shuffle([answer, ...wrongB]),
        answer,
      });
    }
    case SkillType.HanziWordToEnglish: {
      const english = await lookupWord(skill.hanzi);
      invariant(
        english != null,
        `missing definition for hanzi word ${skill.hanzi}`,
      );
      function randomCommonDefinition(definitions: readonly string[]) {
        // Only use the first two definitions, the rest can become too obscure.
        return randomOne(definitions.slice(0, 2));
      }
      const rowCount = 5;
      const answer = choicePair(
        { hanzi: skill.hanzi, skill },
        {
          definition: randomCommonDefinition(english.definitions),
          skill,
        },
      );
      const otherAnswers: OneCorrectPairQuestionAnswer[] = [];
      for (const [hanzi, lookup] of await getOtherWords(
        skill.hanzi,
        (rowCount - 1) * 2,
      )) {
        const skill = {
          type: SkillType.HanziWordToEnglish,
          hanzi,
        } as const;
        otherAnswers.push(
          choicePair(
            { hanzi, skill },
            {
              definition: randomCommonDefinition(lookup.definitions),
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
    case SkillType.EnglishToRadical:
    case SkillType.PinyinToRadical:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.EnglishToHanzi:
    case SkillType.PinyinToHanzi:
    case SkillType.ImageToHanzi:
      throw new Error(`todo: not implemented`);
  }
}

function evenHalve<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.floor(items.length / 2);
  const a = items.slice(0, splitIndex);
  const b = items.slice(splitIndex, splitIndex + a.length);
  return [a, b];
}

function getOtherChoices<
  T,
  U extends [string] | [string, string] | [string, string, string],
>(choices: T[], uniqueBy: { initial: U; fn: (r: T) => U }, count: number): T[] {
  const result = new Set<T>();
  const seenKeys = uniqueBy.initial.map((x) => new Set([x]));

  for (const radical of shuffle(choices)) {
    if (!result.has(radical)) {
      const newKeys = uniqueBy.fn(radical);
      if (!newKeys.some((k, i) => seenKeys[i]?.has(k) ?? false)) {
        newKeys.forEach((k, i) => seenKeys[i]?.add(k));
        result.add(radical);
      }
    }
    if (result.size === count) {
      break;
    }
  }

  invariant(
    result.size == count,
    `couldn't get enough other choices ${result.size} != ${count}`,
  );

  return [...result];
}

export function skillsForRadical(radical: Radical): RadicalSkill[] {
  const skills: RadicalSkill[] = [];

  for (const hanzi of radical.hanzi) {
    for (const name of radical.name) {
      skills.push({
        type: SkillType.RadicalToEnglish,
        hanzi,
        name,
      });
      skills.push({
        type: SkillType.EnglishToRadical,
        hanzi,
        name,
      });
    }
    for (const pinyin of radical.pinyin) {
      skills.push({
        type: SkillType.RadicalToPinyin,
        hanzi,
        pinyin,
      });
    }
  }

  return skills;
}

async function getOtherWords(hanzi: string, count: number) {
  const seenChars = new Set<string>();
  const result: [
    string,
    NonNullable<Awaited<ReturnType<typeof lookupWord>>>,
  ][] = [];

  const [hsk1Words, hsk2Words, hsk3Words] = await Promise.all([
    allHsk1Words(),
    allHsk2Words(),
    allHsk3Words(),
  ]);

  // Use words from the same HSK word list if possible, so that they're more
  // likely to be familiar by being in a similar skill level. Otherwise fallback
  // all HSK words.
  const candidates = [hsk1Words, hsk2Words, hsk3Words].find((words) =>
    words.includes(hanzi),
  ) ?? [...hsk1Words, ...hsk2Words, ...hsk3Words];

  for (const char of shuffle(candidates)) {
    if (seenChars.has(char) || hanzi === char) {
      continue;
    }

    const lookup = await lookupWord(char);
    if (lookup == null) {
      continue;
    }

    seenChars.add(char);
    result.push([char, lookup]);

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

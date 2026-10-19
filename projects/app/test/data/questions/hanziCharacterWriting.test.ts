import type {
  HanziCharacter,
  HanziCharacterWritingQuestion,
  HanziCharacterWritingSkill,
} from "#data/model.ts";
import { pinyinTextSchema, QuestionKind } from "#data/model.ts";
import { gradeHanziCharacterWritingQuestion } from "#data/questions/hanziCharacterWriting.ts";
import { Rating } from "#util/fsrs.ts";
import { describe, expect, test } from "vitest";

const question: HanziCharacterWritingQuestion = {
  kind: QuestionKind.HanziCharacterWriting,
  skill: `hwr:好` as HanziCharacterWritingSkill,
  hanzi: `好` as HanziCharacter,
  gloss: `good`,
  pinyin: pinyinTextSchema.parse(`hǎo`),
  flag: null,
};

describe(`gradeHanziCharacterWritingQuestion`, () => {
  const expectedPath = `M 100 100 L 500 100`;

  test(`accepts matching strokes when submitted`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: true,
      failure: null,
    });
    expect(result.rating).not.toBe(Rating.Again);
  });

  test(`uses the standard quiz speed rating thresholds`, () => {
    const strokes = Array.from({ length: 4 }, () => [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
    ]);
    const medianPaths = Array.from({ length: 4 }, () => expectedPath);

    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 4999)
        .rating,
    ).toBe(Rating.Easy);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 5000)
        .rating,
    ).toBe(Rating.Good);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 9999)
        .rating,
    ).toBe(Rating.Good);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 10_000)
        .rating,
    ).toBe(Rating.Hard);
  });

  test(`rejects empty geometry without using stroke count as a criterion`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: false,
      failure: `shape`,
      rating: Rating.Again,
    });
  });

  test(`ignores stroke direction when comparing visual shape`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 500, y: 100 },
          { x: 100, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: true,
      failure: null,
    });
  });
});

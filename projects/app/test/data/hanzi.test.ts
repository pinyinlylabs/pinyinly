import {
  flattenIds,
  hanziGraphemeCount,
  idsNodeToString,
  IdsOperator,
  isHanziGrapheme,
  parseIds,
  walkIdsNode,
} from "#data/hanzi.ts";
import type { HanziText } from "#data/model.ts";
import assert from "node:assert/strict";
import { describe, expect, test } from "vitest";
import { 汉 } from "./helpers";

test(
  `flattenIds handles ⿱⿱ to ⿳ and ⿰⿰ to ⿲` satisfies HasNameOf<
    typeof flattenIds
  >,
  () => {
    for (const [input, expected] of [
      [`⿱⿱abc`, `⿳abc`],
      [`⿱a⿱bc`, `⿳abc`],
      [`⿰⿰abc`, `⿲abc`],
      [`⿰a⿰bc`, `⿲abc`],
    ] as const) {
      expect(idsNodeToString(flattenIds(parseIds(input)))).toBe(expected);
    }
  },
);

test(`parseIds handles 1 depth` satisfies HasNameOf<typeof parseIds>, () => {
  expect(parseIds(`木`)).toEqual({
    operator: `LeafCharacter`,
    character: `木`,
  });

  // 相
  expect(parseIds(`⿰木目`)).toEqual({
    operator: IdsOperator.LeftToRight,
    left: { operator: `LeafCharacter`, character: `木` },
    right: { operator: `LeafCharacter`, character: `目` },
  });

  // 杏
  expect(parseIds(`⿱木口`)).toEqual({
    operator: IdsOperator.AboveToBelow,
    above: { operator: `LeafCharacter`, character: `木` },
    below: { operator: `LeafCharacter`, character: `口` },
  });

  // 衍
  expect(parseIds(`⿲彳氵亍`)).toEqual({
    operator: IdsOperator.LeftToMiddleToRight,
    left: { operator: `LeafCharacter`, character: `彳` },
    middle: { operator: `LeafCharacter`, character: `氵` },
    right: { operator: `LeafCharacter`, character: `亍` },
  });

  // 京
  expect(parseIds(`⿳亠口小`)).toEqual({
    operator: IdsOperator.AboveToMiddleAndBelow,
    above: { operator: `LeafCharacter`, character: `亠` },
    middle: { operator: `LeafCharacter`, character: `口` },
    below: { operator: `LeafCharacter`, character: `小` },
  });

  // 回
  expect(parseIds(`⿴囗口`)).toEqual({
    operator: IdsOperator.FullSurround,
    surrounding: { operator: `LeafCharacter`, character: `囗` },
    surrounded: { operator: `LeafCharacter`, character: `口` },
  });

  // 凰
  expect(parseIds(`⿵几皇`)).toEqual({
    operator: IdsOperator.SurroundFromAbove,
    above: { operator: `LeafCharacter`, character: `几` },
    surrounded: { operator: `LeafCharacter`, character: `皇` },
  });

  // 凶
  expect(parseIds(`⿶凵㐅`)).toEqual({
    operator: IdsOperator.SurroundFromBelow,
    below: { operator: `LeafCharacter`, character: `凵` },
    surrounded: { operator: `LeafCharacter`, character: `㐅` },
  });

  // 匠
  expect(parseIds(`⿷匚斤`)).toEqual({
    operator: IdsOperator.SurroundFromLeft,
    left: { operator: `LeafCharacter`, character: `匚` },
    surrounded: { operator: `LeafCharacter`, character: `斤` },
  });

  // 㕚
  expect(parseIds(`⿼叉丶`)).toEqual({
    operator: IdsOperator.SurroundFromRight,
    right: { operator: `LeafCharacter`, character: `叉` },
    surrounded: { operator: `LeafCharacter`, character: `丶` },
  });

  // 病
  expect(parseIds(`⿸疒丙`)).toEqual({
    operator: IdsOperator.SurroundFromUpperLeft,
    upperLeft: { operator: `LeafCharacter`, character: `疒` },
    surrounded: { operator: `LeafCharacter`, character: `丙` },
  });

  // 戒
  expect(parseIds(`⿹戈廾`)).toEqual({
    operator: IdsOperator.SurroundFromUpperRight,
    upperRight: { operator: `LeafCharacter`, character: `戈` },
    surrounded: { operator: `LeafCharacter`, character: `廾` },
  });

  // 超
  expect(parseIds(`⿺走召`)).toEqual({
    operator: IdsOperator.SurroundFromLowerLeft,
    lowerLeft: { operator: `LeafCharacter`, character: `走` },
    surrounded: { operator: `LeafCharacter`, character: `召` },
  });

  // 氷
  expect(parseIds(`⿽水丶`)).toEqual({
    operator: IdsOperator.SurroundFromLowerRight,
    lowerRight: { operator: `LeafCharacter`, character: `水` },
    surrounded: { operator: `LeafCharacter`, character: `丶` },
  });

  // 巫
  expect(parseIds(`⿻工从`)).toEqual({
    operator: IdsOperator.Overlaid,
    overlay: { operator: `LeafCharacter`, character: `工` },
    underlay: { operator: `LeafCharacter`, character: `从` },
  });

  // 卐
  expect(parseIds(`⿾卍`)).toEqual({
    operator: IdsOperator.HorizontalReflection,
    reflected: { operator: `LeafCharacter`, character: `卍` },
  });

  // 𠕄
  expect(parseIds(`⿿凹`)).toEqual({
    operator: IdsOperator.Rotation,
    rotated: { operator: `LeafCharacter`, character: `凹` },
  });

  expect(parseIds(`①`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 1,
  });

  expect(parseIds(`②`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 2,
  });

  expect(parseIds(`③`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 3,
  });

  expect(parseIds(`④`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 4,
  });

  expect(parseIds(`⑤`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 5,
  });

  expect(parseIds(`⑥`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 6,
  });

  expect(parseIds(`⑦`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 7,
  });

  expect(parseIds(`⑧`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 8,
  });

  expect(parseIds(`⑨`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 9,
  });

  expect(parseIds(`⑩`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 10,
  });

  expect(parseIds(`⑪`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 11,
  });

  expect(parseIds(`⑫`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 12,
  });

  expect(parseIds(`⑬`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 13,
  });

  expect(parseIds(`⑭`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 14,
  });

  expect(parseIds(`⑮`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 15,
  });

  expect(parseIds(`⑯`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 16,
  });

  expect(parseIds(`⑰`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 17,
  });

  expect(parseIds(`⑱`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 18,
  });

  expect(parseIds(`⑲`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 19,
  });

  expect(parseIds(`⑳`)).toEqual({
    operator: `LeafUnknownCharacter`,
    strokeCount: 20,
  });
});

test(`parseIds handles 2 depth` satisfies HasNameOf<typeof parseIds>, () => {
  {
    const cursor = { index: 0 };
    expect(parseIds(`⿰a⿱bc`, cursor)).toEqual({
      operator: IdsOperator.LeftToRight,
      left: { operator: `LeafCharacter`, character: `a` },
      right: {
        operator: IdsOperator.AboveToBelow,
        above: { operator: `LeafCharacter`, character: `b` },
        below: { operator: `LeafCharacter`, character: `c` },
      },
    });
    assert.deepEqual(cursor, { index: 5 });
  }

  {
    const cursor = { index: 0 };
    expect(parseIds(`⿱a⿳bc⿴de`, cursor)).toEqual({
      operator: IdsOperator.AboveToBelow,
      above: { operator: `LeafCharacter`, character: `a` },
      below: {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: { operator: `LeafCharacter`, character: `b` },
        middle: { operator: `LeafCharacter`, character: `c` },
        below: {
          operator: IdsOperator.FullSurround,
          surrounding: { operator: `LeafCharacter`, character: `d` },
          surrounded: { operator: `LeafCharacter`, character: `e` },
        },
      },
    });
    assert.deepEqual(cursor, { index: 8 });
  }
});

test(`parseIds regression tests` satisfies HasNameOf<typeof parseIds>, () => {
  expect(parseIds(`⿱丿𭕄`)).toEqual({
    operator: IdsOperator.AboveToBelow,
    above: { operator: `LeafCharacter`, character: `丿` },
    below: { operator: `LeafCharacter`, character: `𭕄` },
  });
});

test(`walkIdsNode fixture` satisfies HasNameOf<typeof walkIdsNode>, () => {
  const ids = parseIds(`⿰a⿱bc`);

  const leafs = [...walkIdsNode(ids)].map((x) => {
    switch (x.operator) {
      case `LeafCharacter`: {
        return x.character;
      }
      case `LeafUnknownCharacter`: {
        return x.strokeCount;
      }
    }
  });

  assert.deepEqual(leafs, [`a`, `b`, `c`]);
});

test(
  `idsNodeToString roundtrips` satisfies HasNameOf<typeof idsNodeToString>,
  () => {
    for (const input of [
      [`木`],
      [`⿰木目`, `⿱木口`, `⿲彳氵亍`, `⿳亠口小`],
      [`⿴囗口`, `⿵几皇`, `⿶凵㐅`, `⿷匚斤`, `⿸疒丙`, `⿹戈廾`],
      [`⿺走召`],
      [`⿻工从`],
      [`⿼叉丶`],
      [`⿽水丶`],
      [`⿾卍`],
      [`⿿凹`],
      [`①`, `②`, `③`, `④`, `⑤`, `⑥`, `⑦`, `⑧`, `⑨`, `⑩`],
      [`⑪`, `⑫`, `⑬`, `⑭`, `⑮`, `⑯`, `⑰`, `⑱`, `⑲`, `⑳`],
    ].flat()) {
      assert.equal(idsNodeToString(parseIds(input)), input);
    }
  },
);

test(
  `hanziGraphemeCount fixtures` satisfies HasNameOf<typeof hanziGraphemeCount>,
  () => {
    for (const value of [`木`, `你`] as HanziText[]) {
      expect(hanziGraphemeCount(value)).toBe(1);
    }

    for (const value of [`你好`, `再见`] as HanziText[]) {
      expect(hanziGraphemeCount(value)).toBe(2);
    }
  },
);

describe(
  `isHanziGrapheme suite` satisfies HasNameOf<typeof isHanziGrapheme>,
  () => {
    test(`fixtures`, () => {
      const valid = [汉`应`, 汉`兄`, 汉`同`];
      for (const x of valid) {
        expect(isHanziGrapheme(x)).toBe(true);
      }

      const invalid = [汉`应应`, 汉`兄兄`, 汉`同同`];
      for (const x of invalid) {
        expect(isHanziGrapheme(x)).toBe(false);
      }
    });
  },
);

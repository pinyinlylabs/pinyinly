import {
  flattenIds,
  hanziGraphemeCount,
  horizontalPairToTripleMergeIdsTransform,
  idsApplyTransforms,
  idsNodeToString,
  IdsOperator,
  isHanziGrapheme,
  makeVerticalMergeCharacterIdsTransform,
  parseIds,
  verticalPairToTripleMergeIdsTransform,
  walkIdsNodeLeafs,
} from "#data/hanzi.ts";
import type { HanziText } from "#data/model.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { describe, expect, test } from "vitest";
import { 汉 } from "./helpers.ts";

test.for([
  [`⿱⿱abc`, `⿳abc`],
  [`⿱a⿱bc`, `⿳abc`],
  [`⿰⿰abc`, `⿲abc`],
  [`⿰a⿰bc`, `⿲abc`],
] as const)(
  `flattenIds handles ⿱⿱ to ⿳ and ⿰⿰ to ⿲` satisfies HasNameOf<
    typeof flattenIds
  >,
  ([input, expected]) => {
    expect(idsNodeToString(flattenIds(parseIds(input))), input).toBe(expected);
  },
);

test.for([
  [`⿰⿰abc`, `⿲abc`],
  [`⿰a⿰bc`, `⿲abc`],
] as const)(
  `horizontalPairToTripleMergeIdsTransform %s -> %s` satisfies HasNameOf<
    typeof horizontalPairToTripleMergeIdsTransform
  >,
  ([input, expected]) => {
    const result = horizontalPairToTripleMergeIdsTransform(parseIds(input));
    invariant(result != null);
    expect(idsNodeToString(result)).toBe(expected);
  },
);

test.for([
  [`⿱⿱abc`, `⿳abc`],
  [`⿱a⿱bc`, `⿳abc`],
] as const)(
  `verticalPairToTripleMergeIdsTransform` satisfies HasNameOf<
    typeof verticalPairToTripleMergeIdsTransform
  >,
  ([input, expected]) => {
    const result = verticalPairToTripleMergeIdsTransform(parseIds(input));
    invariant(result != null);
    expect(idsNodeToString(result)).toBe(expected);
  },
);

test(`parseIds handles 1 depth` satisfies HasNameOf<typeof parseIds>, () => {
  expect(parseIds(`木`)).toEqual({
    operator: `Leaf`,
    leaf: `木`,
  });

  // 相
  expect(parseIds(`⿰木目`)).toEqual({
    operator: IdsOperator.LeftToRight,
    left: { operator: `Leaf`, leaf: `木` },
    right: { operator: `Leaf`, leaf: `目` },
  });

  // 杏
  expect(parseIds(`⿱木口`)).toEqual({
    operator: IdsOperator.AboveToBelow,
    above: { operator: `Leaf`, leaf: `木` },
    below: { operator: `Leaf`, leaf: `口` },
  });

  // 衍
  expect(parseIds(`⿲彳氵亍`)).toEqual({
    operator: IdsOperator.LeftToMiddleToRight,
    left: { operator: `Leaf`, leaf: `彳` },
    middle: { operator: `Leaf`, leaf: `氵` },
    right: { operator: `Leaf`, leaf: `亍` },
  });

  // 京
  expect(parseIds(`⿳亠口小`)).toEqual({
    operator: IdsOperator.AboveToMiddleAndBelow,
    above: { operator: `Leaf`, leaf: `亠` },
    middle: { operator: `Leaf`, leaf: `口` },
    below: { operator: `Leaf`, leaf: `小` },
  });

  // 回
  expect(parseIds(`⿴囗口`)).toEqual({
    operator: IdsOperator.FullSurround,
    surrounding: { operator: `Leaf`, leaf: `囗` },
    surrounded: { operator: `Leaf`, leaf: `口` },
  });

  // 凰
  expect(parseIds(`⿵几皇`)).toEqual({
    operator: IdsOperator.SurroundFromAbove,
    above: { operator: `Leaf`, leaf: `几` },
    surrounded: { operator: `Leaf`, leaf: `皇` },
  });

  // 凶
  expect(parseIds(`⿶凵㐅`)).toEqual({
    operator: IdsOperator.SurroundFromBelow,
    below: { operator: `Leaf`, leaf: `凵` },
    surrounded: { operator: `Leaf`, leaf: `㐅` },
  });

  // 匠
  expect(parseIds(`⿷匚斤`)).toEqual({
    operator: IdsOperator.SurroundFromLeft,
    left: { operator: `Leaf`, leaf: `匚` },
    surrounded: { operator: `Leaf`, leaf: `斤` },
  });

  // 㕚
  expect(parseIds(`⿼叉丶`)).toEqual({
    operator: IdsOperator.SurroundFromRight,
    right: { operator: `Leaf`, leaf: `叉` },
    surrounded: { operator: `Leaf`, leaf: `丶` },
  });

  // 病
  expect(parseIds(`⿸疒丙`)).toEqual({
    operator: IdsOperator.SurroundFromUpperLeft,
    upperLeft: { operator: `Leaf`, leaf: `疒` },
    surrounded: { operator: `Leaf`, leaf: `丙` },
  });

  // 戒
  expect(parseIds(`⿹戈廾`)).toEqual({
    operator: IdsOperator.SurroundFromUpperRight,
    upperRight: { operator: `Leaf`, leaf: `戈` },
    surrounded: { operator: `Leaf`, leaf: `廾` },
  });

  // 超
  expect(parseIds(`⿺走召`)).toEqual({
    operator: IdsOperator.SurroundFromLowerLeft,
    lowerLeft: { operator: `Leaf`, leaf: `走` },
    surrounded: { operator: `Leaf`, leaf: `召` },
  });

  // 氷
  expect(parseIds(`⿽水丶`)).toEqual({
    operator: IdsOperator.SurroundFromLowerRight,
    lowerRight: { operator: `Leaf`, leaf: `水` },
    surrounded: { operator: `Leaf`, leaf: `丶` },
  });

  // 巫
  expect(parseIds(`⿻工从`)).toEqual({
    operator: IdsOperator.Overlaid,
    overlay: { operator: `Leaf`, leaf: `工` },
    underlay: { operator: `Leaf`, leaf: `从` },
  });

  // 卐
  expect(parseIds(`⿾卍`)).toEqual({
    operator: IdsOperator.HorizontalReflection,
    reflected: { operator: `Leaf`, leaf: `卍` },
  });

  // 𠕄
  expect(parseIds(`⿿凹`)).toEqual({
    operator: IdsOperator.Rotation,
    rotated: { operator: `Leaf`, leaf: `凹` },
  });

  expect(parseIds(`①`)).toEqual({ operator: `Leaf`, leaf: `①` });
  expect(parseIds(`②`)).toEqual({ operator: `Leaf`, leaf: `②` });
  expect(parseIds(`③`)).toEqual({ operator: `Leaf`, leaf: `③` });
  expect(parseIds(`④`)).toEqual({ operator: `Leaf`, leaf: `④` });
  expect(parseIds(`⑤`)).toEqual({ operator: `Leaf`, leaf: `⑤` });
  expect(parseIds(`⑥`)).toEqual({ operator: `Leaf`, leaf: `⑥` });
  expect(parseIds(`⑦`)).toEqual({ operator: `Leaf`, leaf: `⑦` });
  expect(parseIds(`⑧`)).toEqual({ operator: `Leaf`, leaf: `⑧` });
  expect(parseIds(`⑨`)).toEqual({ operator: `Leaf`, leaf: `⑨` });
  expect(parseIds(`⑩`)).toEqual({ operator: `Leaf`, leaf: `⑩` });
  expect(parseIds(`⑪`)).toEqual({ operator: `Leaf`, leaf: `⑪` });
  expect(parseIds(`⑫`)).toEqual({ operator: `Leaf`, leaf: `⑫` });
  expect(parseIds(`⑬`)).toEqual({ operator: `Leaf`, leaf: `⑬` });
  expect(parseIds(`⑭`)).toEqual({ operator: `Leaf`, leaf: `⑭` });
  expect(parseIds(`⑮`)).toEqual({ operator: `Leaf`, leaf: `⑮` });
  expect(parseIds(`⑯`)).toEqual({ operator: `Leaf`, leaf: `⑯` });
  expect(parseIds(`⑰`)).toEqual({ operator: `Leaf`, leaf: `⑰` });
  expect(parseIds(`⑱`)).toEqual({ operator: `Leaf`, leaf: `⑱` });
  expect(parseIds(`⑲`)).toEqual({ operator: `Leaf`, leaf: `⑲` });
  expect(parseIds(`⑳`)).toEqual({ operator: `Leaf`, leaf: `⑳` });
});

test(`parseIds handles 2 depth` satisfies HasNameOf<typeof parseIds>, () => {
  {
    const cursor = { index: 0 };
    expect(parseIds(`⿰a⿱bc`, cursor)).toEqual({
      operator: IdsOperator.LeftToRight,
      left: { operator: `Leaf`, leaf: `a` },
      right: {
        operator: IdsOperator.AboveToBelow,
        above: { operator: `Leaf`, leaf: `b` },
        below: { operator: `Leaf`, leaf: `c` },
      },
    });
    expect(cursor).toEqual({ index: 5 });
  }

  {
    const cursor = { index: 0 };
    expect(parseIds(`⿱a⿳bc⿴de`, cursor)).toEqual({
      operator: IdsOperator.AboveToBelow,
      above: { operator: `Leaf`, leaf: `a` },
      below: {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: { operator: `Leaf`, leaf: `b` },
        middle: { operator: `Leaf`, leaf: `c` },
        below: {
          operator: IdsOperator.FullSurround,
          surrounding: { operator: `Leaf`, leaf: `d` },
          surrounded: { operator: `Leaf`, leaf: `e` },
        },
      },
    });
    expect(cursor).toEqual({ index: 8 });
  }
});

test(`parseIds regression tests` satisfies HasNameOf<typeof parseIds>, () => {
  expect(parseIds(`⿱丿𭕄`)).toEqual({
    operator: IdsOperator.AboveToBelow,
    above: { operator: `Leaf`, leaf: `丿` },
    below: { operator: `Leaf`, leaf: `𭕄` },
  });
});

test(
  `walkIdsNodeLeafs fixture` satisfies HasNameOf<typeof walkIdsNodeLeafs>,
  () => {
    const ids = parseIds(`⿰a⿱bc`);

    const leafs = [...walkIdsNodeLeafs(ids)].map((x) => x.leaf);

    expect(leafs).toEqual([`a`, `b`, `c`]);
  },
);

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
      expect(idsNodeToString(parseIds(input))).toEqual(input);
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

test.for([
  [`-→_→=`, `⿱-_`, `=`],
  [`宀→丰→𫲸`, `⿱宀丰`, `𫲸`],
] as const)(
  `makeVerticalMergeCharacterIdsTransform %s` satisfies HasNameOf<
    typeof makeVerticalMergeCharacterIdsTransform
  >,
  ([spec, input, expected]) => {
    const [top, bottom, merged] = spec.split(`→`);

    const transform = makeVerticalMergeCharacterIdsTransform(
      top!,
      bottom!,
      merged!,
    );
    const result = idsNodeToString(
      idsApplyTransforms(parseIds(input), [transform]),
    );

    expect(result).toEqual(expected);
  },
);

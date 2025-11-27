import {
  componentToString,
  flattenIds,
  hanziGraphemeCount,
  horizontalPairToTripleMergeIdsTransform,
  idsApplyTransforms,
  idsNodeToString,
  isHanziGrapheme,
  makeVerticalMergeCharacterIdsTransform,
  mapIdsNodeLeafs,
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
    expect(idsNodeToString(flattenIds(parseIds(input)), (x) => x)).toBe(
      expected,
    );
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
    expect(idsNodeToString(result, (x) => x)).toBe(expected);
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
    expect(idsNodeToString(result, (x) => x)).toBe(expected);
  },
);

test(`parseIds handles 1 depth` satisfies HasNameOf<typeof parseIds>, () => {
  expect.soft(parseIds(`木`)).toMatchInlineSnapshot(`"木"`);

  // 相
  expect.soft(parseIds(`⿰木目`)).toMatchInlineSnapshot(`
    [
      "⿰",
      "木",
      "目",
    ]
  `);

  // 杏
  expect.soft(parseIds(`⿱木口`)).toMatchInlineSnapshot(`
    [
      "⿱",
      "木",
      "口",
    ]
  `);

  // 衍
  expect.soft(parseIds(`⿲彳氵亍`)).toMatchInlineSnapshot(`
    [
      "⿲",
      "彳",
      "氵",
      "亍",
    ]
  `);

  // 京
  expect.soft(parseIds(`⿳亠口小`)).toMatchInlineSnapshot(`
    [
      "⿳",
      "亠",
      "口",
      "小",
    ]
  `);

  // 回
  expect.soft(parseIds(`⿴囗口`)).toMatchInlineSnapshot(`
    [
      "⿴",
      "囗",
      "口",
    ]
  `);

  // 凰
  expect.soft(parseIds(`⿵几皇`)).toMatchInlineSnapshot(`
    [
      "⿵",
      "几",
      "皇",
    ]
  `);

  // 凶
  expect.soft(parseIds(`⿶凵㐅`)).toMatchInlineSnapshot(`
    [
      "⿶",
      "凵",
      "㐅",
    ]
  `);

  // 匠
  expect.soft(parseIds(`⿷匚斤`)).toMatchInlineSnapshot(`
    [
      "⿷",
      "匚",
      "斤",
    ]
  `);

  // 㕚
  expect.soft(parseIds(`⿼叉丶`)).toMatchInlineSnapshot(`
    [
      "⿼",
      "叉",
      "丶",
    ]
  `);

  // 病
  expect.soft(parseIds(`⿸疒丙`)).toMatchInlineSnapshot(`
    [
      "⿸",
      "疒",
      "丙",
    ]
  `);

  // 戒
  expect.soft(parseIds(`⿹戈廾`)).toMatchInlineSnapshot(`
    [
      "⿹",
      "戈",
      "廾",
    ]
  `);

  // 超
  expect.soft(parseIds(`⿺走召`)).toMatchInlineSnapshot(`
    [
      "⿺",
      "走",
      "召",
    ]
  `);

  // 氷
  expect.soft(parseIds(`⿽水丶`)).toMatchInlineSnapshot(`
    [
      "⿽",
      "水",
      "丶",
    ]
  `);

  // 巫
  expect.soft(parseIds(`⿻工从`)).toMatchInlineSnapshot(`
    [
      "⿻",
      "工",
      "从",
    ]
  `);

  // 卐
  expect.soft(parseIds(`⿾卍`)).toMatchInlineSnapshot(`
    [
      "⿾",
      "卍",
    ]
  `);

  // 𠕄
  expect.soft(parseIds(`⿿凹`)).toMatchInlineSnapshot(`
    [
      "⿿",
      "凹",
    ]
  `);

  expect.soft(parseIds(`①`)).toMatchInlineSnapshot(`"①"`);
  expect.soft(parseIds(`②`)).toMatchInlineSnapshot(`"②"`);
  expect.soft(parseIds(`③`)).toMatchInlineSnapshot(`"③"`);
  expect.soft(parseIds(`④`)).toMatchInlineSnapshot(`"④"`);
  expect.soft(parseIds(`⑤`)).toMatchInlineSnapshot(`"⑤"`);
  expect.soft(parseIds(`⑥`)).toMatchInlineSnapshot(`"⑥"`);
  expect.soft(parseIds(`⑦`)).toMatchInlineSnapshot(`"⑦"`);
  expect.soft(parseIds(`⑧`)).toMatchInlineSnapshot(`"⑧"`);
  expect.soft(parseIds(`⑨`)).toMatchInlineSnapshot(`"⑨"`);
  expect.soft(parseIds(`⑩`)).toMatchInlineSnapshot(`"⑩"`);
  expect.soft(parseIds(`⑪`)).toMatchInlineSnapshot(`"⑪"`);
  expect.soft(parseIds(`⑫`)).toMatchInlineSnapshot(`"⑫"`);
  expect.soft(parseIds(`⑬`)).toMatchInlineSnapshot(`"⑬"`);
  expect.soft(parseIds(`⑭`)).toMatchInlineSnapshot(`"⑭"`);
  expect.soft(parseIds(`⑮`)).toMatchInlineSnapshot(`"⑮"`);
  expect.soft(parseIds(`⑯`)).toMatchInlineSnapshot(`"⑯"`);
  expect.soft(parseIds(`⑰`)).toMatchInlineSnapshot(`"⑰"`);
  expect.soft(parseIds(`⑱`)).toMatchInlineSnapshot(`"⑱"`);
  expect.soft(parseIds(`⑲`)).toMatchInlineSnapshot(`"⑲"`);
  expect.soft(parseIds(`⑳`)).toMatchInlineSnapshot(`"⑳"`);
});

test(`parseIds handles 2 depth` satisfies HasNameOf<typeof parseIds>, () => {
  {
    const cursor = { index: 0 };
    expect(parseIds(`⿰a⿱bc`, cursor)).toMatchInlineSnapshot(`
      [
        "⿰",
        "a",
        [
          "⿱",
          "b",
          "c",
        ],
      ]
    `);
    expect(cursor).toEqual({ index: 5 });
  }

  {
    const cursor = { index: 0 };
    expect(parseIds(`⿱a⿳bc⿴de`, cursor)).toMatchInlineSnapshot(`
      [
        "⿱",
        "a",
        [
          "⿳",
          "b",
          "c",
          [
            "⿴",
            "d",
            "e",
          ],
        ],
      ]
    `);
    expect(cursor).toEqual({ index: 8 });
  }
});

test(`parseIds regression tests` satisfies HasNameOf<typeof parseIds>, () => {
  expect(parseIds(`⿱丿𭕄`)).toMatchInlineSnapshot(`
    [
      "⿱",
      "丿",
      "𭕄",
    ]
  `);
});

test(
  `walkIdsNodeLeafs fixture` satisfies HasNameOf<typeof walkIdsNodeLeafs>,
  () => {
    const ids = parseIds(`⿰a⿱bc`);
    const leafs = [...walkIdsNodeLeafs(ids)];

    expect(leafs).toEqual([`a`, `b`, `c`]);
  },
);

test(
  `idsNodeToStringCustom roundtrips` satisfies HasNameOf<
    typeof idsNodeToString
  >,
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
      expect(idsNodeToString(parseIds(input), (x) => x)).toEqual(input);
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
      (x) => x,
    );

    expect(result).toEqual(expected);
  },
);

test.for([
  [{ hanzi: `A`, strokes: `` }, `A`],
  [{ strokes: `0-4` }, `⑤`],
] as const)(
  `idsNodeToString %s -> %s` satisfies HasNameOf<typeof idsNodeToString>,
  ([component, expected]) => {
    expect(componentToString(component)).toBe(expected);
  },
);

test(
  `walkIdsNodeLeafs fixture` satisfies HasNameOf<typeof walkIdsNodeLeafs>,
  () => {
    const ids = parseIds(`⿰a⿱bc`);
    const mapped = mapIdsNodeLeafs(
      ids,
      (leaf, path) => `${leaf.toUpperCase()}(${path.join(`,`)})`,
    );

    expect(mapped).toMatchInlineSnapshot(`
      [
        "⿰",
        "A(0)",
        [
          "⿱",
          "B(1,0)",
          "C(1,1)",
        ],
      ]
    `);
  },
);

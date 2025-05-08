import {
  flattenIds,
  idsNodeToString,
  IdsOperator,
  parseIds,
  walkIdsNode,
} from "#data/hanzi.ts";
import assert from "node:assert/strict";
import test from "node:test";

await test(`${flattenIds.name} handles ⿱⿱ to ⿳ and ⿰⿰ to ⿲`, () => {
  for (const [input, expected] of [
    [`⿱⿱abc`, `⿳abc`],
    [`⿱a⿱bc`, `⿳abc`],
    [`⿰⿰abc`, `⿲abc`],
    [`⿰a⿰bc`, `⿲abc`],
  ] as const) {
    assert.equal(idsNodeToString(flattenIds(parseIds(input))), expected);
  }
});

await test(`${parseIds.name} handles 1 depth`, () => {
  assert.deepEqual(parseIds(`木`), {
    type: `LeafCharacter`,
    character: `木`,
  });

  // 相
  assert.deepEqual(parseIds(`⿰木目`), {
    type: IdsOperator.LeftToRight,
    left: { type: `LeafCharacter`, character: `木` },
    right: { type: `LeafCharacter`, character: `目` },
  });

  // 杏
  assert.deepEqual(parseIds(`⿱木口`), {
    type: IdsOperator.AboveToBelow,
    above: { type: `LeafCharacter`, character: `木` },
    below: { type: `LeafCharacter`, character: `口` },
  });

  // 衍
  assert.deepEqual(parseIds(`⿲彳氵亍`), {
    type: IdsOperator.LeftToMiddleToRight,
    left: { type: `LeafCharacter`, character: `彳` },
    middle: { type: `LeafCharacter`, character: `氵` },
    right: { type: `LeafCharacter`, character: `亍` },
  });

  // 京
  assert.deepEqual(parseIds(`⿳亠口小`), {
    type: IdsOperator.AboveToMiddleAndBelow,
    above: { type: `LeafCharacter`, character: `亠` },
    middle: { type: `LeafCharacter`, character: `口` },
    below: { type: `LeafCharacter`, character: `小` },
  });

  // 回
  assert.deepEqual(parseIds(`⿴囗口`), {
    type: IdsOperator.FullSurround,
    surrounding: { type: `LeafCharacter`, character: `囗` },
    surrounded: { type: `LeafCharacter`, character: `口` },
  });

  // 凰
  assert.deepEqual(parseIds(`⿵几皇`), {
    type: IdsOperator.SurroundFromAbove,
    above: { type: `LeafCharacter`, character: `几` },
    surrounded: { type: `LeafCharacter`, character: `皇` },
  });

  // 凶
  assert.deepEqual(parseIds(`⿶凵㐅`), {
    type: IdsOperator.SurroundFromBelow,
    below: { type: `LeafCharacter`, character: `凵` },
    surrounded: { type: `LeafCharacter`, character: `㐅` },
  });

  // 匠
  assert.deepEqual(parseIds(`⿷匚斤`), {
    type: IdsOperator.SurroundFromLeft,
    left: { type: `LeafCharacter`, character: `匚` },
    surrounded: { type: `LeafCharacter`, character: `斤` },
  });

  // 㕚
  assert.deepEqual(parseIds(`⿼叉丶`), {
    type: IdsOperator.SurroundFromRight,
    right: { type: `LeafCharacter`, character: `叉` },
    surrounded: { type: `LeafCharacter`, character: `丶` },
  });

  // 病
  assert.deepEqual(parseIds(`⿸疒丙`), {
    type: IdsOperator.SurroundFromUpperLeft,
    upperLeft: { type: `LeafCharacter`, character: `疒` },
    surrounded: { type: `LeafCharacter`, character: `丙` },
  });

  // 戒
  assert.deepEqual(parseIds(`⿹戈廾`), {
    type: IdsOperator.SurroundFromUpperRight,
    upperRight: { type: `LeafCharacter`, character: `戈` },
    surrounded: { type: `LeafCharacter`, character: `廾` },
  });

  // 超
  assert.deepEqual(parseIds(`⿺走召`), {
    type: IdsOperator.SurroundFromLowerLeft,
    lowerLeft: { type: `LeafCharacter`, character: `走` },
    surrounded: { type: `LeafCharacter`, character: `召` },
  });

  // 氷
  assert.deepEqual(parseIds(`⿽水丶`), {
    type: IdsOperator.SurroundFromLowerRight,
    lowerRight: { type: `LeafCharacter`, character: `水` },
    surrounded: { type: `LeafCharacter`, character: `丶` },
  });

  // 巫
  assert.deepEqual(parseIds(`⿻工从`), {
    type: IdsOperator.Overlaid,
    overlay: { type: `LeafCharacter`, character: `工` },
    underlay: { type: `LeafCharacter`, character: `从` },
  });

  // 卐
  assert.deepEqual(parseIds(`⿾卍`), {
    type: IdsOperator.HorizontalReflection,
    reflected: { type: `LeafCharacter`, character: `卍` },
  });

  // 𠕄
  assert.deepEqual(parseIds(`⿿凹`), {
    type: IdsOperator.Rotation,
    rotated: { type: `LeafCharacter`, character: `凹` },
  });

  assert.deepEqual(parseIds(`①`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 1,
  });

  assert.deepEqual(parseIds(`②`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 2,
  });

  assert.deepEqual(parseIds(`③`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 3,
  });

  assert.deepEqual(parseIds(`④`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 4,
  });

  assert.deepEqual(parseIds(`⑤`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 5,
  });

  assert.deepEqual(parseIds(`⑥`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 6,
  });

  assert.deepEqual(parseIds(`⑦`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 7,
  });

  assert.deepEqual(parseIds(`⑧`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 8,
  });

  assert.deepEqual(parseIds(`⑨`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 9,
  });

  assert.deepEqual(parseIds(`⑩`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 10,
  });

  assert.deepEqual(parseIds(`⑪`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 11,
  });

  assert.deepEqual(parseIds(`⑫`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 12,
  });

  assert.deepEqual(parseIds(`⑬`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 13,
  });

  assert.deepEqual(parseIds(`⑭`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 14,
  });

  assert.deepEqual(parseIds(`⑮`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 15,
  });

  assert.deepEqual(parseIds(`⑯`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 16,
  });

  assert.deepEqual(parseIds(`⑰`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 17,
  });

  assert.deepEqual(parseIds(`⑱`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 18,
  });

  assert.deepEqual(parseIds(`⑲`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 19,
  });

  assert.deepEqual(parseIds(`⑳`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 20,
  });
});

await test(`${parseIds.name} handles 2 depth`, () => {
  {
    const cursor = { index: 0 };
    assert.deepEqual(parseIds(`⿰a⿱bc`, cursor), {
      type: IdsOperator.LeftToRight,
      left: { type: `LeafCharacter`, character: `a` },
      right: {
        type: IdsOperator.AboveToBelow,
        above: { type: `LeafCharacter`, character: `b` },
        below: { type: `LeafCharacter`, character: `c` },
      },
    });
    assert.deepEqual(cursor, { index: 5 });
  }

  {
    const cursor = { index: 0 };
    assert.deepEqual(parseIds(`⿱a⿳bc⿴de`, cursor), {
      type: IdsOperator.AboveToBelow,
      above: { type: `LeafCharacter`, character: `a` },
      below: {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: { type: `LeafCharacter`, character: `b` },
        middle: { type: `LeafCharacter`, character: `c` },
        below: {
          type: IdsOperator.FullSurround,
          surrounding: { type: `LeafCharacter`, character: `d` },
          surrounded: { type: `LeafCharacter`, character: `e` },
        },
      },
    });
    assert.deepEqual(cursor, { index: 8 });
  }
});

await test(`${parseIds.name} regression tests`, () => {
  assert.deepEqual(parseIds(`⿱丿𭕄`), {
    type: IdsOperator.AboveToBelow,
    above: { type: `LeafCharacter`, character: `丿` },
    below: { type: `LeafCharacter`, character: `𭕄` },
  });
});

await test(`${walkIdsNode.name} fixture`, () => {
  const ids = parseIds(`⿰a⿱bc`);

  const leafs = [...walkIdsNode(ids)].map((x) => {
    switch (x.type) {
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

await test(`${idsNodeToString.name} roundtrips`, () => {
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
});

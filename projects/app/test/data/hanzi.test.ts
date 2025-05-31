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
    operator: `LeafCharacter`,
    character: `木`,
  });

  // 相
  assert.deepEqual(parseIds(`⿰木目`), {
    operator: IdsOperator.LeftToRight,
    left: { operator: `LeafCharacter`, character: `木` },
    right: { operator: `LeafCharacter`, character: `目` },
  });

  // 杏
  assert.deepEqual(parseIds(`⿱木口`), {
    operator: IdsOperator.AboveToBelow,
    above: { operator: `LeafCharacter`, character: `木` },
    below: { operator: `LeafCharacter`, character: `口` },
  });

  // 衍
  assert.deepEqual(parseIds(`⿲彳氵亍`), {
    operator: IdsOperator.LeftToMiddleToRight,
    left: { operator: `LeafCharacter`, character: `彳` },
    middle: { operator: `LeafCharacter`, character: `氵` },
    right: { operator: `LeafCharacter`, character: `亍` },
  });

  // 京
  assert.deepEqual(parseIds(`⿳亠口小`), {
    operator: IdsOperator.AboveToMiddleAndBelow,
    above: { operator: `LeafCharacter`, character: `亠` },
    middle: { operator: `LeafCharacter`, character: `口` },
    below: { operator: `LeafCharacter`, character: `小` },
  });

  // 回
  assert.deepEqual(parseIds(`⿴囗口`), {
    operator: IdsOperator.FullSurround,
    surrounding: { operator: `LeafCharacter`, character: `囗` },
    surrounded: { operator: `LeafCharacter`, character: `口` },
  });

  // 凰
  assert.deepEqual(parseIds(`⿵几皇`), {
    operator: IdsOperator.SurroundFromAbove,
    above: { operator: `LeafCharacter`, character: `几` },
    surrounded: { operator: `LeafCharacter`, character: `皇` },
  });

  // 凶
  assert.deepEqual(parseIds(`⿶凵㐅`), {
    operator: IdsOperator.SurroundFromBelow,
    below: { operator: `LeafCharacter`, character: `凵` },
    surrounded: { operator: `LeafCharacter`, character: `㐅` },
  });

  // 匠
  assert.deepEqual(parseIds(`⿷匚斤`), {
    operator: IdsOperator.SurroundFromLeft,
    left: { operator: `LeafCharacter`, character: `匚` },
    surrounded: { operator: `LeafCharacter`, character: `斤` },
  });

  // 㕚
  assert.deepEqual(parseIds(`⿼叉丶`), {
    operator: IdsOperator.SurroundFromRight,
    right: { operator: `LeafCharacter`, character: `叉` },
    surrounded: { operator: `LeafCharacter`, character: `丶` },
  });

  // 病
  assert.deepEqual(parseIds(`⿸疒丙`), {
    operator: IdsOperator.SurroundFromUpperLeft,
    upperLeft: { operator: `LeafCharacter`, character: `疒` },
    surrounded: { operator: `LeafCharacter`, character: `丙` },
  });

  // 戒
  assert.deepEqual(parseIds(`⿹戈廾`), {
    operator: IdsOperator.SurroundFromUpperRight,
    upperRight: { operator: `LeafCharacter`, character: `戈` },
    surrounded: { operator: `LeafCharacter`, character: `廾` },
  });

  // 超
  assert.deepEqual(parseIds(`⿺走召`), {
    operator: IdsOperator.SurroundFromLowerLeft,
    lowerLeft: { operator: `LeafCharacter`, character: `走` },
    surrounded: { operator: `LeafCharacter`, character: `召` },
  });

  // 氷
  assert.deepEqual(parseIds(`⿽水丶`), {
    operator: IdsOperator.SurroundFromLowerRight,
    lowerRight: { operator: `LeafCharacter`, character: `水` },
    surrounded: { operator: `LeafCharacter`, character: `丶` },
  });

  // 巫
  assert.deepEqual(parseIds(`⿻工从`), {
    operator: IdsOperator.Overlaid,
    overlay: { operator: `LeafCharacter`, character: `工` },
    underlay: { operator: `LeafCharacter`, character: `从` },
  });

  // 卐
  assert.deepEqual(parseIds(`⿾卍`), {
    operator: IdsOperator.HorizontalReflection,
    reflected: { operator: `LeafCharacter`, character: `卍` },
  });

  // 𠕄
  assert.deepEqual(parseIds(`⿿凹`), {
    operator: IdsOperator.Rotation,
    rotated: { operator: `LeafCharacter`, character: `凹` },
  });

  assert.deepEqual(parseIds(`①`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 1,
  });

  assert.deepEqual(parseIds(`②`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 2,
  });

  assert.deepEqual(parseIds(`③`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 3,
  });

  assert.deepEqual(parseIds(`④`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 4,
  });

  assert.deepEqual(parseIds(`⑤`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 5,
  });

  assert.deepEqual(parseIds(`⑥`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 6,
  });

  assert.deepEqual(parseIds(`⑦`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 7,
  });

  assert.deepEqual(parseIds(`⑧`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 8,
  });

  assert.deepEqual(parseIds(`⑨`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 9,
  });

  assert.deepEqual(parseIds(`⑩`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 10,
  });

  assert.deepEqual(parseIds(`⑪`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 11,
  });

  assert.deepEqual(parseIds(`⑫`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 12,
  });

  assert.deepEqual(parseIds(`⑬`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 13,
  });

  assert.deepEqual(parseIds(`⑭`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 14,
  });

  assert.deepEqual(parseIds(`⑮`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 15,
  });

  assert.deepEqual(parseIds(`⑯`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 16,
  });

  assert.deepEqual(parseIds(`⑰`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 17,
  });

  assert.deepEqual(parseIds(`⑱`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 18,
  });

  assert.deepEqual(parseIds(`⑲`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 19,
  });

  assert.deepEqual(parseIds(`⑳`), {
    operator: `LeafUnknownCharacter`,
    strokeCount: 20,
  });
});

await test(`${parseIds.name} handles 2 depth`, () => {
  {
    const cursor = { index: 0 };
    assert.deepEqual(parseIds(`⿰a⿱bc`, cursor), {
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
    assert.deepEqual(parseIds(`⿱a⿳bc⿴de`, cursor), {
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

await test(`${parseIds.name} regression tests`, () => {
  assert.deepEqual(parseIds(`⿱丿𭕄`), {
    operator: IdsOperator.AboveToBelow,
    above: { operator: `LeafCharacter`, character: `丿` },
    below: { operator: `LeafCharacter`, character: `𭕄` },
  });
});

await test(`${walkIdsNode.name} fixture`, () => {
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

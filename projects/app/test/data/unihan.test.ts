// pyly-not-src-test

import { describe, expect, test } from "vitest";
import {
  parseUnihanDefinition,
  serializeUnihanDefinitionGloss,
} from "./unihan";

describe(`parseUnihanDefinition`, () => {
  test.for([
    [`a;b;c`, [[`a`], [`b`], [`c`]]],
    [
      `(same as 旒; corrupted form of 荒) a cup with pendants, a pennant, wild, barren, uncultivated`,
      [
        [
          `{same as 旒} {corrupted form of 荒} a cup with pendants`,
          `a pennant`,
          `wild`,
          `barren`,
          `uncultivated`,
        ],
      ],
    ],
    [
      `(same as 凶) cruel, unfortunate, sad`,
      [[`{same as 凶} cruel`, `unfortunate`, `sad`]],
    ],
    [
      `(corrupted form 咟) to call, to yell, anxious, dazed, image sound, an exclamation expressing sound (such as clap hands; to fire a gun; to strike; sound of firecracker etc.)`,
      [
        [
          `{corrupted form 咟} to call`,
          `to yell`,
          `anxious`,
          `dazed`,
          `image sound`,
          `an exclamation expressing sound (such as clap hands; to fire a gun; to strike; sound of firecracker etc.)`,
        ],
      ],
    ],
    [
      `(same as 栚 㮳) a piece of cross-wise board used for frame on which silkworms spin`,
      [
        [
          `{same as 栚 㮳} a piece of cross-wise board used for frame on which silkworms spin`,
        ],
      ],
    ],
    [
      `(same as 盌) (a variant of 碗) a bowl; a basin; a cup; a dish`,
      [
        [`{same as 盌} {a variant of 碗} a bowl`],
        [`a basin`],
        [`a cup`],
        [`a dish`],
      ],
    ],
    [
      `(same as 瓢) a ladle (often made of dried calabash or gourd)`,
      [[`{same as 瓢} a ladle (often made of dried calabash or gourd)`]],
    ],
    [
      `(same as 鬲) a large earthen pot, a large iron cauldron used in old time`,
      [
        [
          `{same as 鬲} a large earthen pot`,
          `a large iron cauldron used in old time`,
        ],
      ],
    ],
    [
      `(same as 男) a human; a man; a boy (non-classical form of 留) to remain; to stay, to keep, to preserve`,
      [
        [`{same as 男} a human`],
        [`a man`],
        [`a boy (non-classical form of 留) to remain`],
        [`to stay`, `to keep`, `to preserve`],
      ],
    ],
    [
      `(same as 畯) official in charge of farmlands in ancient times; a bailiff or landlord, rustic; crude (ancient form of 允) to allow; to grant`,
      [
        [`{same as 畯} official in charge of farmlands in ancient times`],
        [`a bailiff or landlord`, `rustic`],
        [`crude (ancient form of 允) to allow`],
        [`to grant`],
      ],
    ],
  ] as const)(`%s`, ([input, expected]) => {
    const actual = parseUnihanDefinition(input).map((sense) =>
      sense.map((parsedGloss) => serializeUnihanDefinitionGloss(parsedGloss)),
    );

    expect(actual).toEqual(expected);
  });
});

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import hanzi, { Definition } from "hanzi";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  allHsk1Words,
  allHsk2Words,
  allHsk3Words,
  convertPinyinWithToneNumberToToneMark,
  loadRadicals,
} from "../src/dictionary/dictionary.js";
import "../src/typings/hanzi.d.ts";
import { jsonStringifyIndentOneLevel } from "../src/util/json.js";

hanzi.start();

const lookupFallback: Record<string, Definition> = {
  // hsk1
  车上: {
    traditional: `車上`,
    simplified: `车上`,
    definition: `on the bus`,
    pinyin: `chē shàng`,
  },
  看到: {
    traditional: `看到`,
    simplified: `看到`,
    definition: `to see`,
    pinyin: `kàn dào`,
  },
  请坐: {
    traditional: `請坐`,
    simplified: `请坐`,
    definition: `please sit`,
    pinyin: `qǐng zuò`,
  },
  真的: {
    traditional: `真的`,
    simplified: `真的`,
    definition: `really`,
    pinyin: `zhēn de`,
  },
  // hsk2
  不太: {
    traditional: `不太`,
    simplified: `不太`,
    definition: `not very`,
    pinyin: `bù tài`,
  },
  好人: {
    traditional: `好人`,
    simplified: `好人`,
    definition: `good person`,
    pinyin: `hǎo rén`,
  },
  见过: {
    traditional: `見過`,
    simplified: `见过`,
    definition: `have seen`,
    pinyin: `jiàn guò`,
  },
  拿到: {
    traditional: `拿到`,
    simplified: `拿到`,
    definition: `to get`,
    pinyin: `ná dào`,
  },
  全国: {
    traditional: `全國`,
    simplified: `全国`,
    definition: `whole country`,
    pinyin: `quán guó`,
  },
  送到: {
    traditional: `送到`,
    simplified: `送到`,
    definition: `to deliver`,
    pinyin: `sòng dào`,
  },
  在家: {
    traditional: `在家`,
    simplified: `在家`,
    definition: `at home`,
    pinyin: `zài jiā`,
  },
  放到: {
    traditional: `放到`,
    simplified: `放到`,
    definition: `to put`,
    pinyin: `fàng dào`,
  },
  红酒: {
    traditional: `紅酒`,
    simplified: `红酒`,
    definition: `red wine`,
    pinyin: `hóng jiǔ`,
  },
  交费: {
    traditional: `交費`,
    simplified: `交费`,
    definition: `to pay`,
    pinyin: `jiāo fèi`,
  },
};

const overrides: Record<string, Partial<Definition>> = {
  跟: {
    definition: `with/and/follow/compared to/to go with`,
  },
};

const missing: string[] = [];

const dictionary = new Map<
  string,
  { pinyin: string[]; definitions: string[] }
>();

const itemsToInclude = new Set<string>([
  ...(await allHsk1Words()),
  ...(await allHsk2Words()),
  ...(await allHsk3Words()),
  ...(await loadRadicals()).flatMap((x) => x.hanzi),
]);

for (const word of itemsToInclude) {
  const result =
    hanzi.definitionLookup(word, `s`)?.[0] ?? lookupFallback[word] ?? null;

  if (result == null) {
    missing.push(word);
    continue;
  }

  if (word in overrides) {
    Object.assign(result, overrides[word]);
  }

  const { pinyin, definition } = result;

  let definitions = [];
  const classifiers = [];
  for (const x of definition.split(`/`)) {
    // Separate out classifiers (measure words), see https://cc-cedict.org/wiki/format:syntax
    if (/^CL:/.exec(x)) {
      // TODO: split on comma and | to handle multiple classifiers
      classifiers.push(x);
    } else {
      definitions.push(x);
    }
  }

  // Clean up cruft we don't want to include
  definitions = definitions.filter((d) => !d.startsWith(`also pr`));
  definitions = definitions.filter((d) => !d.includes(`pronunciation `));

  dictionary.set(word, {
    pinyin: pinyin
      .split(` `)
      .map((x) => convertPinyinWithToneNumberToToneMark(x)),
    definitions,
  });
}

if (missing.length > 0) {
  console.warn(`Missing definitions for: ${missing.join(`,`)}`);
}

// Write ts to disk using async node fs APIs
await writeFile(
  join(import.meta.dirname, `../src/dictionary/words.asset.json`),
  jsonStringifyIndentOneLevel([...dictionary.entries()]),
  `utf8`,
);

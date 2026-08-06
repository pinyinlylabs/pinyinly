import {
  parseIds,
  strokeCountPlaceholderOrNull,
  walkIdsNodeLeafs,
} from "#data/hanzi.ts";
import { loadCharactersJson } from "#dictionary.ts";
import { unicodeShortIdentifier } from "#util/unicode.ts";
import { glob, writeFile } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import { jsonStringifyShallowIndent } from "@pinyinly/lib/jsonfmt";
import * as fontkit from "fontkit";
import path from "node:path";

const projectRoot = path.join(import.meta.dirname, `..`);

// oxlint-disable-next-line import/namespace
const notoSansSc = await fontkit.open(
  path.join(projectRoot, `src/assets/fonts/NotoSansSC-VariableFont_wght.ttf`),
);
invariant(notoSansSc.type === `TTF`, `expected a TTF font`);

let pingFangPath;
for (const p of await glob(
  // Sequoia 15.3 path
  `/System/Library/AssetsV2/com_apple_MobileAsset_Font7/*.asset/AssetData/PingFang.ttc`,
)) {
  pingFangPath = p;
  break;
}
invariant(pingFangPath != null, `expected to find PingFang font`);

// oxlint-disable-next-line import/namespace
const pingFangCollection = await fontkit.open(pingFangPath);
invariant(pingFangCollection.type === `TTC`, `expected a TTC font`);
const pingFang = pingFangCollection.fonts[0];
invariant(pingFang != null);

const allComponents = new Set<string>();
const charactersJson = await loadCharactersJson();

for (const [character, characterData] of charactersJson) {
  allComponents.add(character);
  invariant(
    characterData.decompositions != null,
    `character "${character}" (${unicodeShortIdentifier(character)}) has no decomposition`,
  );
  for (const ids of Object.keys(characterData.decompositions)) {
    for (const leaf of walkIdsNodeLeafs(parseIds(ids))) {
      if (strokeCountPlaceholderOrNull(leaf) == null) {
        allComponents.add(leaf);
      }
    }
  }
}

const missingGlyphs = new Set<string>();

for (const char of allComponents) {
  const codePoint = char.codePointAt(0);
  invariant(codePoint != null);
  const isMissingGlyph =
    notoSansSc.glyphForCodePoint(codePoint).id === 0 &&
    pingFang.glyphForCodePoint(codePoint).id === 0;
  if (isMissingGlyph) {
    missingGlyphs.add(char);
  }
}

await writeFile(
  path.join(import.meta.dirname, `../src/data/missingFontGlyphs.asset.json`),
  jsonStringifyShallowIndent({ [`macOS`]: [...missingGlyphs].sort() }),
  `utf8`,
);

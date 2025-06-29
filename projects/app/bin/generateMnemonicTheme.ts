import { MnemonicThemeId, PinyinInitialGroupId } from "#data/model.ts";
import { rMnemonicThemeId } from "#data/rizzleSchema.ts";
import { jsonStringifyShallowIndent } from "#util/json.ts";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import path from "node:path";
import yargs from "yargs";
import { z } from "zod/v4";
import {
  loadHhhPinyinChart,
  pinyinInitialGroupTitle,
} from "../src/data/pinyin.js";
import type { loadMnemonicThemeChoices } from "../src/dictionary/dictionary.js";
import {
  loadMnemonicThemes,
  mnemonicThemeChoicesSchema,
} from "../src/dictionary/dictionary.js";
import {
  deepTransform,
  merge,
  sortComparatorString,
} from "../src/util/collections.js";
import { makeDbCache } from "./util/cache.js";
import {
  dictionaryPath,
  readFileWithSchema,
  writeUtf8FileIfChanged,
} from "./util/fs.js";
import { makeSimpleAiClient } from "./util/openai.js";

const debug = makeDebug(`hhh`);

const pinyinChart = loadHhhPinyinChart();
const chartInitialGroupIds = new Set(pinyinChart.initials.map((x) => x.id));

const initialGroupChoices = Object.entries(PinyinInitialGroupId)
  .filter(([, v]) => chartInitialGroupIds.has(v))
  .map(([k]) => k);
const themeChoices = Object.keys(MnemonicThemeId);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`group`, {
    type: `string`,
    describe: `only update a specific pinyin group`,
    choices: initialGroupChoices,
    default: initialGroupChoices.join(`,`),
    coerce: (x: string) => x.split(`,`).filter((x) => x !== ``),
  })
  .option(`theme`, {
    type: `string`,
    describe: `only update a specific theme`,
    choices: themeChoices,
    default: themeChoices.join(`,`),
    coerce: (x: string) => x.split(`,`).filter((x) => x !== ``),
  })
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

const themes = await loadMnemonicThemes();

const argvGroupIds = argv.group.map(
  (x) => PinyinInitialGroupId[x as keyof typeof PinyinInitialGroupId],
);
const argvThemeIds = argv.theme.map(
  (x) => MnemonicThemeId[x as keyof typeof MnemonicThemeId],
);

const dataFilePath = path.join(
  dictionaryPath,
  `mnemonicThemeChoices.asset.json`,
);
const dbCache = makeDbCache(import.meta.filename, `openai_chat_cache`, debug);
const openai = makeSimpleAiClient(dbCache);

for (const groupId of argvGroupIds) {
  for (const themeId of argvThemeIds) {
    const theme = nonNullable(themes.get(themeId));

    const initialGroup = pinyinChart.initials.find((x) => x.id === groupId);
    invariant(initialGroup != null, `Missing group for ${groupId}`);

    const r = await openai(
      [],
      `
I'm creating a mnemonic system to help me remember Pinyin initials. For each Pinyin initial I want to pick a ${theme.noun} to associate it with. (then I'll create short stories about the ${theme.noun} to help remember the pinyin). 

There are some important constraints:

- I need to imagine each ${theme.noun} visually in my mind, so they be common in the social discourse.
- It's important that I pick a ${theme.noun} that is meaningful to me, so I want to have a lot of choices to select from.

I want to start with group ${pinyinInitialGroupTitle(groupId)} using ${theme.noun} of the theme ${themeId} (${theme.description}). The items in this group are:

${initialGroup.initials.map((i) => `- ${JSON.stringify(i)}`).join(`\n`)}

For each item, come up with 20 ${theme.noun} ideas, then narrow it down to the most popular/well-known 12 ${theme.noun}.
`,
      z.object({
        result: z.array(
          z.object({
            pinyinInitial: z.string(),
            shortlistOfBestSuggestions: z.array(
              z.object({ name: z.string(), description: z.string() }),
            ),
            allSuggestions: z.array(
              z.object({ name: z.string(), description: z.string() }),
            ),
          }),
        ),
      }),
    );

    debug(`result for ${groupId} (${themeId}): %o`, r);

    await saveUpdates(
      new Map([
        [
          themeId,
          new Map(
            r.result.map(
              (x) =>
                [
                  x.pinyinInitial,
                  new Map(
                    x.shortlistOfBestSuggestions.map(
                      (c) => [c.name, c.description] as const,
                    ),
                  ),
                ] as const,
            ),
          ),
        ],
      ]),
    );
  }
}

type MnemonicThemeChoices = Awaited<
  ReturnType<typeof loadMnemonicThemeChoices>
>;

async function saveUpdates(updates: MnemonicThemeChoices) {
  const existingData = await readMnemonicThemeChoices();
  await writeMnemonicThemeChoices(merge(existingData, updates));
}

async function readMnemonicThemeChoices() {
  return await readFileWithSchema(
    dataFilePath,
    mnemonicThemeChoicesSchema,
    new Map(),
  );
}

async function writeMnemonicThemeChoices(data: MnemonicThemeChoices) {
  const newData = deepTransform(
    new Map(
      [...data.entries()].map(([key, value]) => [
        rMnemonicThemeId().marshal(key),
        value,
      ]),
    ),
    (x) =>
      x instanceof Map
        ? Object.fromEntries(
            [...x.entries()].sort(sortComparatorString(([k]) => k as string)),
          )
        : x,
  );

  // Make sure the data is valid before writing
  mnemonicThemeChoicesSchema.parse(newData);

  await writeUtf8FileIfChanged(
    dataFilePath,
    jsonStringifyShallowIndent(newData, 2),
  );
}

import type { PinyinSoundGroupId } from "#data/model.ts";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupThemes,
  loadPylyPinyinChart,
} from "#data/pinyin.js";
import type { loadPinyinSoundNameSuggestions } from "#dictionary/dictionary.js";
import {
  loadPinyinSoundThemeDetails,
  pinyinSoundNameSuggestionsSchema,
} from "#dictionary/dictionary.js";
import { jsonStringifyShallowIndent } from "#util/json.ts";
import {
  deepTransform,
  merge,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import path from "node:path";
import yargs from "yargs";
import { z } from "zod/v4";
import { makeDbCache } from "./util/cache.js";
import {
  dictionaryPath,
  readFileWithSchema,
  writeUtf8FileIfChanged,
} from "./util/fs.js";
import { makeSimpleAiClient } from "./util/openai.js";

const debug = makeDebug(`pyly`);

const pinyinChart = loadPylyPinyinChart();
const allGroupIds = pinyinChart.soundGroups.map((x) => x.id);
const allThemes = Object.values(defaultPinyinSoundGroupThemes);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`groupIds`, {
    type: `string`,
    describe: `only update a specific pinyin group`,
    choices: allGroupIds,
    default: allGroupIds.join(`,`),
    alias: `group`,
    coerce: (x: string) =>
      x
        .split(`,`)
        .filter((x) => x !== ``)
        .map((x) => x as PinyinSoundGroupId),
  })
  .option(`themes`, {
    type: `string`,
    describe: `only update a specific theme`,
    choices: allThemes,
    default: allThemes.join(`,`),
    alias: `theme`,
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

const pinyinSoundThemeDetails = await loadPinyinSoundThemeDetails();

const dataFilePath = path.join(
  dictionaryPath,
  `mnemonicThemeChoices.asset.json`,
);
const dbCache = makeDbCache(import.meta.filename, `openai_chat_cache`, debug);
const openai = makeSimpleAiClient(dbCache);

for (const groupId of argv.groupIds) {
  for (const theme of argv.themes) {
    const { noun: themeNoun, description: themeDescription } = nonNullable(
      pinyinSoundThemeDetails.get(theme),
    );
    const groupName = nonNullable(defaultPinyinSoundGroupNames[groupId]);

    const soundGroup = pinyinChart.soundGroups.find((x) => x.id === groupId);
    invariant(soundGroup != null, `Missing group for ${groupId}`);

    for (const [initial] of soundGroup.sounds) {
      invariant(initial != null);
      // if (initial !== `chu`) {
      //   continue;
      // }

      const r = await openai(
        [],
        `
I'm creating a mnemonic system to help people remember Pinyin initials. For each Pinyin initial I want to pick a ${themeNoun} to associate it with. (then I'll create short stories about the ${themeNoun} to help remember the pinyin). 

There are some important constraints:

- Each ${themeNoun} should be able to spark a rich image in my mind, so it's important they're well known in modern discourse.
- It's important that I pick a ${themeNoun} that is meaningful to me, so I want to have a lot of choices to select from.
- The ${themeNoun}'s name be based on similar pronunciation (not necessarily similar spelling) of the pinyin.
  - "chu-" ✅ Chancellor ❌ Chef ❌ Choreographer ❌ Chiropractor ❌ Chauffeur ❌ Train Conductor
  - "cu-"  ✅ Sushi Chef ❌ Cupid
- The best choices are simple, short, and stand alone. For example "Doctor" for "d-" is good, but "Medical Doctor" for "mu-" is bad.)
- Make sure the names for one initial and distinct from names for other initials. For example, "Doctor" for "d-" is good, but "Doctor" for "du-" is bad.

I'm working on the group ${groupName} using ${themeNoun} of the theme ${theme} (${themeDescription}). 

The pinyin initials in this group are:

${soundGroup.sounds.join(`, `)}

For now let's just focus on "${initial}".

Can you come up with a short explanation for how you pronounce it?

Which other initials in the group sound similar and might cause confusion?

So based how you pronounce the first syllable can you give me 5 suitable ${themeNoun} suggestions.
`,
        z.object({
          result: z.array(
            z.object({
              pinyinInitial: z.string(),
              englishStudentPronunciationHint: z.string(),
              similarSoundingConflicts: z.array(z.string()),
              bestSuggestions: z.array(
                z.object({ name: z.string(), rationale: z.string() }),
              ),
            }),
          ),
        }),
      );

      debug(`result for ${groupId} (${theme}): %o`, r);

      await saveUpdates(
        new Map([
          [
            theme,
            new Map(
              r.result.map(
                (x) =>
                  [
                    x.pinyinInitial.replace(`-`, ``),
                    new Map(
                      x.bestSuggestions.map(
                        (c) => [c.name, c.rationale] as const,
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
}

type MnemonicThemeChoices = Awaited<
  ReturnType<typeof loadPinyinSoundNameSuggestions>
>;

async function saveUpdates(updates: MnemonicThemeChoices) {
  const existingData = await readMnemonicThemeChoices();
  await writeMnemonicThemeChoices(merge(existingData, updates));
}

async function readMnemonicThemeChoices() {
  return await readFileWithSchema(
    dataFilePath,
    pinyinSoundNameSuggestionsSchema,
    new Map(),
  );
}

async function writeMnemonicThemeChoices(data: MnemonicThemeChoices) {
  const newData = deepTransform(new Map(data.entries()), (x) =>
    x instanceof Map
      ? Object.fromEntries(
          [...x.entries()].sort(sortComparatorString(([k]) => k as string)),
        )
      : x,
  );

  // Make sure the data is valid before writing
  pinyinSoundNameSuggestionsSchema.parse(newData);

  await writeUtf8FileIfChanged(
    dataFilePath,
    jsonStringifyShallowIndent(newData, 2),
  );
}

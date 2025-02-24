import { rMnemonicThemeId, rPinyinInitialGroupId } from "#data/rizzleSchema.ts";
import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import { join } from "node:path";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import yargs from "yargs";
import { z } from "zod";
import {
  loadMmPinyinChart,
  loadMnemonicThemeChoices,
  loadMnemonicThemes,
} from "../src/dictionary/dictionary.js";
import {
  deepTransform,
  merge,
  sortComparatorString,
} from "../src/util/collections.js";
import { makeDbCache } from "./util/cache.js";
import { writeUtf8FileIfChanged } from "./util/fs.js";
import { openAiWithCache } from "./util/openai.js";

const debug = makeDebug(`hhh`);

const themes = await loadMnemonicThemes();
const pinyinChart = await loadMmPinyinChart();
const groupIds = pinyinChart.initials.map((x) => x.id);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`group`, {
    type: `string`,
    describe: `only update a specific pinyin group`,
    choices: groupIds,
    coerce: (x: string) =>
      x
        .split(`,`)
        .filter((x) => x !== ``)
        .map((x) => rPinyinInitialGroupId.unmarshal(x)),
  })
  .option(`theme`, {
    type: `string`,
    describe: `only update a specific theme`,
    choices: [...themes.keys()],
    coerce: (x: string) =>
      x
        .split(`,`)
        .filter((x) => x !== ``)
        .map((x) => rMnemonicThemeId.unmarshal(x)),
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

const dbCache = makeDbCache(import.meta.filename, `openai_chat_cache`, debug);

const openAiSchema = z.object({
  result: z.array(
    z.object({
      pinyinInitial: z.string(),
      shortlistOfBestSuggestions: z.array(
        z.object({ fullName: z.string(), description: z.string() }),
      ),
      allCharacterSuggestions: z.array(
        z.object({ fullName: z.string(), description: z.string() }),
      ),
    }),
  ),
});

const openai = new OpenAI();

for (const groupId of groupIds) {
  if (argv.group && !argv.group.includes(groupId)) {
    continue;
  }

  for (const [themeId, theme] of themes) {
    if (argv.theme && !argv.theme.includes(themeId)) {
      continue;
    }

    const group = pinyinChart.initials.find((x) => x.id === groupId);
    invariant(group != null, `Missing group for ${groupId}`);

    const rawJson = await openAiWithCache(
      {
        model: `gpt-4o`,
        messages: [
          {
            role: `system`,
            content: `You are a Chinese tutor helping English students learn Chinese.`,
          },
          {
            role: `user`,
            content: `
I'm creating a mnemonic system to help me remember Pinyin initials. For each Pinyin initial I want to pick a ${theme.noun} to associate it with. (then I'll create short stories about the ${theme.noun} to help remember the pinyin). 

There are some important constraints:

- I need to imagine each ${theme.noun} visually in my mind, so they should feature in news/movies/tv/videos.
- It's important that I pick a ${theme.noun} that is meaningful to me, so I want to have a lot of choices to select from.

I want to start with group ${JSON.stringify(groupId)} using ${theme.noun} of the theme ${themeId} (${theme.description}). The items in this group are:

${group.initials.map((i) => `- ${JSON.stringify(i)}`).join(`\n`)}

For each item, come up with 20 ${theme.noun} ideas, then narrow it down to the most popular/well-known 12 ${theme.noun}.
`,
          },
        ],
        response_format: zodResponseFormat(openAiSchema, `schema`),
      },
      { dbCache, openai, debug },
    );

    try {
      const r = openAiSchema.parse(JSON.parse(rawJson));
      console.log(`result for ${groupId} (${themeId}):`);
      console.log(JSON.stringify(r, null, 2));

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
                        (c) => [c.fullName, c.description] as const,
                      ),
                    ),
                  ] as const,
              ),
            ),
          ],
        ]),
      );
    } catch (e) {
      console.error(`Failed to parse response for ${groupId}, skipping…`, e);
      continue;
    }
  }
}

type MnemonicThemeChoices = Awaited<
  ReturnType<typeof loadMnemonicThemeChoices>
>;

async function saveUpdates(updates: MnemonicThemeChoices) {
  const existingData = await loadMnemonicThemeChoices();

  const updatedData = deepTransform(merge(existingData, updates), (x) =>
    x instanceof Map
      ? Object.fromEntries(
          [...x.entries()].sort(sortComparatorString(([k]) => k as string)),
        )
      : x,
  );

  await writeUtf8FileIfChanged(
    join(
      import.meta.dirname,
      `../src/dictionary/mnemonicThemeChoices.asset.json`,
    ),
    JSON.stringify(updatedData, null, 1),
  );
}

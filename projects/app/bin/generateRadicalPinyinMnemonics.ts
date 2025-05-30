import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import path from "node:path";
import OpenAI from "openai";
import yargs from "yargs";
import { z } from "zod/v4";
import {
  loadHanziDecomposition,
  loadHanziWordPinyinMnemonics,
  lookupHanzi,
} from "../src/dictionary/dictionary.js";
import {
  mergeMaps,
  sortComparatorNumber,
  sortComparatorString,
} from "../src/util/collections.js";
import { jsonStringifyIndentOneLevel } from "../src/util/json.js";
import { makeDbCache } from "./util/cache.js";
import { writeUtf8FileIfChanged } from "./util/fs.js";
import { openAiWithCache, zodResponseFormat } from "./util/openai.js";

const debug = makeDebug(`hhh`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`update`, {
    type: `string`,
    describe: `characters to explicitly update`,
    coerce: (x: string) => x.split(`,`).filter((x) => x !== ``),
  })
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .option(`force-write`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

const theme = {
  tones: new Map<number, string>(),
  initials: new Map<string, { n: string; desc: string }>(),
  finals: new Map<string, { suffix: string; location: string }>(),
};

const dbCache = makeDbCache(import.meta.filename, `openai_chat_cache`, debug);

const openAiSchema = z.object({
  character: z.string(),
  initial: z.string(),
  final: z.string(),
  tone: z.string(),
  meaning: z.string(),
  mnemonics: z.array(
    z.object({
      mnemonic: z.string(),
      reasoning_steps: z.array(z.string()),
    }),
  ),
});

const openai = new OpenAI();

const radicalsToCheck =
  argv.update ??
  [
    // ...new Set((await loadHanziWordPinyinMnemonics()).keys()).difference(
    //   new Set(await allRadicalPrimaryForms()),
    // ),
  ];

const updates = new Map<string, { mnemonic: string; strategy: string }[]>();

const decompositions = await loadHanziDecomposition();

for (const hanzi of radicalsToCheck) {
  const lookup = await lookupHanzi(hanzi).then((x) => x[0]?.[1]);

  const name = lookup?.gloss[0];
  const pinyin = lookup?.pinyin?.[0];
  const decomposition = decompositions.get(hanzi);
  invariant(name != null, `Missing name data for ${hanzi}`);
  invariant(pinyin != null, `Missing pinyin data for ${hanzi}`);
  invariant(decomposition != null, `Missing decomposition data for ${hanzi}`);

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
Create a mnemonic to help remember that the pinyin of the Chinese radical ${hanzi} (${name}) is "${pinyin}".

Use the following strategy:

**1. Analyze the radical components**

- The radical's composition is IDS: ${decomposition}
  - "？" symbolises unknown, likely the character is in its most simple form.
- Write a description of the layout of the sub-radicals.
- For each component, list out separately:
  - **Name:** <insert>
  - **Meaning:** <insert>
  - **Position:** <insert>
  - **Visual depictions:** (if this component was a sketch what might it be of (take into account its position relative to other components, for example 八 at the top could be a chimney, but at the bottom might be a rocket nozzle))
    - <insert description 1>
    - ...
    - <insert description 5>

---

**2. Incorporate critical information**

The mnemonic must encode the character's **pinyin initial**, **final**, **tone**, and **meaning**, while incorporating its **visual appearance**. Use the following associations for initials and finals to ensure consistency with other mnemonics.

---

**3. Use a distinct themes**
 
For each piece of critical information, encode it using a distinct theme. This ensures that when someone reads the mnemonic they're able to know which part of the mnemonic is referring to which piece of information, avoiding ambiguity and overlaps in references.

- **Initials**: Represented by a person or pop-culture character based on the initial.
- **Finals**: Represented by a location, place, or environment based on the final.
- **Tone**: Encoded using an action, emotion, or motion:
${[...theme.tones.entries()]
  .sort(sortComparatorNumber(([num]) => num))
  .map(([num, desc]) => `  - **Tone ${num}**: ${desc}`)
  .join(`\n`)}


**3.1. Associations for Initials**
| Initial | Person/Pop-Culture Character |
|---------|-------------------------------|
${[...theme.initials.entries()]
  .sort(sortComparatorString(([initial]) => initial))
  .map(([, { n, desc }]) => `| **{TODOFIXprefix}** | ${n} (${desc}) |`)
  .join(`\n`)}


**3.2 Associations for Finals**
| Final   | Location/Environment         |
|---------|-------------------------------|
${[...theme.finals.entries()]
  .sort(sortComparatorString(([initial]) => initial))
  .map(([, { suffix, location }]) => `| **${suffix}** | ${location}) |`)
  .join(`\n`)}

---

**4. Structure of the Mnemonic**
Each mnemonic must:
1. Include a **vivid person or character** for the pinyin initial.
2. Reference a **location or environment** for the pinyin final.
3. Use an **action or motion** that matches the pinyin tone, including tone 5's neutral/light emphasis.
4. Incorporate the **character's meaning** as the central concept.
5. Reference the **visual appearance** of the character to aid recognition.
6. Be concise, memorable, and easy to visualize.

**5. Final tips**

- Link together one of the visual depictions of each component.
- The story should be something that someone could picture in their head.
- Make it clear why (given its components) the radical's pinyin makes sense.
- Don't make the mnemonics too long, shorter can be easier to remember.
- Be sure to include the exact pinyin of the radical (i.e. "${pinyin}")
- Explain the logical steps in creating the mnemonic.

---

Write 5 mnemonic variations for ${hanzi} (${pinyin}).
`,
        },
      ],
      response_format: zodResponseFormat(openAiSchema, `radical_mnemonics`),
    },
    { dbCache, openai },
  );

  try {
    const r = openAiSchema.parse(JSON.parse(rawJson));

    updates.set(
      r.character,
      r.mnemonics.map((m) => ({
        mnemonic: m.mnemonic,
        strategy: m.reasoning_steps.join(`\n`),
      })),
    );
    console.log(
      `Radical ${r.character} [${r.initial === `` ? `_` : r.initial}- + -${r.final} + ${r.tone}] "${r.meaning}"
Mnemonics:\n${r.mnemonics.map((m, i) => `  ${i + 1}. ${m.mnemonic}\n    Rationale:\n${m.reasoning_steps.map((x, i) => `    ${i + 1}. ${x}`).join(`\n`)}`).join(`\n`)}`,
    );
  } catch (error) {
    console.error(`Failed to parse response for ${hanzi}, skipping…`, error);
    continue;
  }
}

if (argv[`force-write`] || updates.size > 0) {
  const existingData = await loadHanziWordPinyinMnemonics();

  const updatedData = [...mergeMaps(existingData, updates).entries()]
    // Sort the map for minimal diffs in PR
    .sort(sortComparatorString(([key]) => key));

  await writeUtf8FileIfChanged(
    path.join(
      import.meta.dirname,
      `../src/dictionary/radicalPinyinMnemonics.asset.json`,
    ),
    jsonStringifyIndentOneLevel(updatedData),
  );
}

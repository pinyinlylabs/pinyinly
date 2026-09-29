import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";
import { buildCharacterCoreMeaningsSpecPrompt } from "#util/prompts/characterCoreMeanings.ts";
import type { HanziCharacter, HanziText, PinyinText } from "#data/model.js";

describe(`buildCharacterCoreMeaningsSpecPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildCharacterCoreMeaningsSpecPrompt({
      character: `行` as HanziCharacter,
      usages: [
        { hanzi: `并行`, pinyin: `bìng xíng` },
        { hanzi: `不行`, pinyin: `bù xíng` },
        { hanzi: `步行`, pinyin: `bù xíng` },
        { hanzi: `出行`, pinyin: `chū xíng` },
        { hanzi: `发行`, pinyin: `fā xíng` },
        { hanzi: `飞行`, pinyin: `fēi xíng` },
        { hanzi: `飞行员`, pinyin: `fēi xíng yuán` },
        { hanzi: `航行`, pinyin: `háng xíng` },
        { hanzi: `进行`, pinyin: `jìn xíng` },
        { hanzi: `举行`, pinyin: `jǔ xíng` },
        { hanzi: `可行`, pinyin: `kě xíng` },
        { hanzi: `流行`, pinyin: `liú xíng` },
        { hanzi: `旅行`, pinyin: `lǚ xíng` },
        { hanzi: `旅行社`, pinyin: `lǚ xíng shè` },
        { hanzi: `履行`, pinyin: `lǚ xíng` },
        { hanzi: `内行`, pinyin: `nèi háng` },
        { hanzi: `排行榜`, pinyin: `pái háng bǎng` },
        { hanzi: `品行`, pinyin: `pǐn xíng` },
        { hanzi: `平行`, pinyin: `píng xíng` },
        { hanzi: `强行`, pinyin: `qiáng xíng` },
        { hanzi: `绕行`, pinyin: `rào xíng` },
        { hanzi: `人行道`, pinyin: `rén xíng dào` },
        { hanzi: `盛行`, pinyin: `shèng xíng` },
        { hanzi: `施行`, pinyin: `shī xíng` },
        { hanzi: `实行`, pinyin: `shí xíng` },
        { hanzi: `试行`, pinyin: `shì xíng` },
        { hanzi: `送行`, pinyin: `sòng xíng` },
        { hanzi: `通行`, pinyin: `tōng xíng` },
        { hanzi: `通行证`, pinyin: `tōng xíng zhèng` },
        { hanzi: `同行`, pinyin: `tóng háng` },
        { hanzi: `同行`, pinyin: `tóng xíng` },
        { hanzi: `推行`, pinyin: `tuī xíng` },
        { hanzi: `外行`, pinyin: `wài háng` },
        { hanzi: `现行`, pinyin: `xiàn xíng` },
        { hanzi: `行`, pinyin: `háng` },
        { hanzi: `行`, pinyin: `xíng` },
        { hanzi: `行程`, pinyin: `xíng chéng` },
        { hanzi: `行动`, pinyin: `xíng dòng` },
        { hanzi: `行家`, pinyin: `háng jiā` },
        { hanzi: `行李`, pinyin: `xíng li` },
        { hanzi: `行李箱`, pinyin: `xíng li xiāng` },
        { hanzi: `行列`, pinyin: `háng liè` },
        { hanzi: `行情`, pinyin: `háng qíng` },
        { hanzi: `行人`, pinyin: `xíng rén` },
        { hanzi: `行使`, pinyin: `xíng shǐ` },
        { hanzi: `行驶`, pinyin: `xíng shǐ` },
        { hanzi: `行为`, pinyin: `xíng wéi` },
        { hanzi: `行业`, pinyin: `háng yè` },
        { hanzi: `行政`, pinyin: `xíng zhèng` },
        { hanzi: `行走`, pinyin: `xíng zǒu` },
        { hanzi: `言行`, pinyin: `yán xíng` },
        { hanzi: `一行`, pinyin: `yī xíng` },
        { hanzi: `一言一行`, pinyin: `yī yán yī xíng` },
        { hanzi: `衣食住行`, pinyin: `yī shí zhù xíng` },
        { hanzi: `银行`, pinyin: `yín háng` },
        { hanzi: `银行卡`, pinyin: `yín háng kǎ` },
        { hanzi: `游行`, pinyin: `yóu xíng` },
        { hanzi: `运行`, pinyin: `yùn xíng` },
        { hanzi: `执行`, pinyin: `zhí xíng` },
        { hanzi: `自行`, pinyin: `zì xíng` },
        { hanzi: `自行车`, pinyin: `zì xíng chē` },
      ] as { hanzi: HanziText; pinyin: PinyinText }[],
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "messages": "
      =====================
       SYSTEM MESSAGE
      ---------------------
      # Task

      Infer the semantic curriculum for a Chinese character from the supplied vocabulary.

      The goal is **not** to reproduce dictionary senses.

      Instead, organize the vocabulary into the smallest set of memorable concepts that will help a student understand how the character contributes meaning across many words.

      Think like a **curriculum designer**, not a dictionary editor.

      ## Principles

      - Prefer the smallest set of Core Meanings that naturally explains the supplied vocabulary.
      - A Core Meaning should represent a stable semantic idea that can be reused across many words.
      - A Branch should represent a **teaching category**, not a dictionary sense.
      - Prefer broad, memorable conceptual groupings over fine-grained lexical distinctions.
      - Group words by the idea that best helps a student understand them, even if a dictionary would distinguish them more precisely.
      - If a Branch would contain only one or two narrowly related words, consider whether it should instead be merged into a broader teaching category.
      - Do not create unnecessary semantic distinctions merely because they exist in dictionaries.
      - Do not merge genuinely unrelated meanings merely to reduce the number of Core Meanings.
      - Every supplied occurrence must appear exactly once.
      - Do not invent vocabulary that was not supplied.
      - If the same written word appears multiple times with different pronunciations, treat them as separate occurrences.
      - Do not include pinyin anywhere in the output except "primaryReading" and "pronunciationExceptions".

      ## Core Meaning

      Each Core Meaning contains:

      - "lemma"
      - "primaryReading"
      - optional "pronunciationExceptions"
      - "description"
      - "branches"

      ### lemma

      "lemma" is a short English semantic anchor.

      Its purpose is to give students a memorable central idea.

      Prefer a single common English word.

      Use lowercase unless the word is a proper noun.

      Examples of formatting:

      - "go"
      - "line"
      - "flower"
      - "wood"
      - "hand"

      Avoid title case:

      - "Go"
      - "Flower"

      Do not optimize for dictionary precision.

      Choose the simplest English word that best captures the central semantic idea.

      ### pronunciationExceptions

      Include the original written item exactly as supplied in the input.

      ### description

      Briefly describe the semantic scope of the Core Meaning and the major kinds of meanings it includes.

      Focus on the conceptual network rather than dictionary definitions.

      Do not define the English lemma.

      Do not refer to "this Core Meaning".

      Keep it concise.

      Bad example:

      - "Movement extends to travel, operation, circulation, and conduct."

      Good example:

      - "Physical movement, travel, operation, circulation, feasibility, and conduct."

      ## Branch

      Each Branch contains:

      - "lemma"
      - "description"
      - "occurrences"

      ### lemma

      Like Core Meanings, this is a short English semantic anchor.

      Prefer a single common English word whenever possible.

      Choose a **teaching concept**, not the most precise dictionary term.

      Good examples:

      - "travel"
      - "growth"
      - "energy"
      - "trade"
      - "shape"
      - "approval"

      Avoid unnecessarily specific labels when a broader concept would teach the character better.

      ### description

      Describe the semantic scope of this Branch.

      Describe the conceptual connection.

      Do not simply restate the lemma.

      Do not refer to "this Branch".

      Keep it concise.

      ## Occurrences

      Each Branch contains an "occurrences" array.

      Each item is the written form of one supplied occurrence assigned to that Branch.

      Requirements:

      - Every supplied occurrence must appear **exactly once** across all Branches.
      - Use the written word exactly as supplied in the input.
      - Do not include pronunciation, pinyin, glosses, definitions, or explanations.
      - Do not invent occurrences that were not supplied.

      Example:

        "occurrences": [
          "步行",
          "旅行",
          "飞行"
        ]

      ## Example of the desired level of abstraction

      Prefer conceptual teaching categories:

      Good:

      go
      - travel
        - 步行
        - 飞行
        - 航行
        - 行驶

      Avoid splitting into unnecessarily fine-grained categories:

      go
      - walk
      - fly
      - sail
      - drive

      The purpose is to help students understand how the character's meaning expands, not to classify every lexical nuance.

      ---

      <input>
      {"character":"行","wordList":["并行 (bìng xíng)","不行 (bù xíng)","步行 (bù xíng)","出行 (chū xíng)","发行 (fā xíng)","飞行 (fēi xíng)","飞行员 (fēi xíng yuán)","航行 (háng xíng)","进行 (jìn xíng)","举行 (jǔ xíng)","可行 (kě xíng)","流行 (liú xíng)","旅行 (lǚ xíng)","旅行社 (lǚ xíng shè)","履行 (lǚ xíng)","内行 (nèi háng)","排行榜 (pái háng bǎng)","品行 (pǐn xíng)","平行 (píng xíng)","强行 (qiáng xíng)","绕行 (rào xíng)","人行道 (rén xíng dào)","盛行 (shèng xíng)","施行 (shī xíng)","实行 (shí xíng)","试行 (shì xíng)","送行 (sòng xíng)","通行 (tōng xíng)","通行证 (tōng xíng zhèng)","同行 (tóng háng)","同行 (tóng xíng)","推行 (tuī xíng)","外行 (wài háng)","现行 (xiàn xíng)","行 (háng)","行 (xíng)","行程 (xíng chéng)","行动 (xíng dòng)","行家 (háng jiā)","行李 (xíng li)","行李箱 (xíng li xiāng)","行列 (háng liè)","行情 (háng qíng)","行人 (xíng rén)","行使 (xíng shǐ)","行驶 (xíng shǐ)","行为 (xíng wéi)","行业 (háng yè)","行政 (xíng zhèng)","行走 (xíng zǒu)","言行 (yán xíng)","一行 (yī xíng)","一言一行 (yī yán yī xíng)","衣食住行 (yī shí zhù xíng)","银行 (yín háng)","银行卡 (yín háng kǎ)","游行 (yóu xíng)","运行 (yùn xíng)","执行 (zhí xíng)","自行 (zì xíng)","自行车 (zì xíng chē)"]}
      </input>
      =====================
      ",
        "model": "gpt-5.6-terra",
        "reasoningEffort": "medium",
        "schema": {
          "name": "characterCoreMeaningsSpecSchema",
          "schema": {
            "additionalProperties": false,
            "properties": {
              "coreMeanings": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "branches": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "description": {
                            "type": "string",
                          },
                          "lemma": {
                            "type": "string",
                          },
                          "occurrences": {
                            "items": {
                              "type": "string",
                            },
                            "type": "array",
                          },
                        },
                        "required": [
                          "lemma",
                          "description",
                          "occurrences",
                        ],
                        "type": "object",
                      },
                      "type": "array",
                    },
                    "description": {
                      "type": "string",
                    },
                    "lemma": {
                      "type": "string",
                    },
                    "primaryReading": {
                      "type": "string",
                    },
                    "pronunciationExceptions": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "lemma",
                    "primaryReading",
                    "pronunciationExceptions",
                    "description",
                    "branches",
                  ],
                  "type": "object",
                },
                "type": "array",
              },
            },
            "required": [
              "coreMeanings",
            ],
            "title": "characterCoreMeaningsSpecSchema",
            "type": "object",
          },
          "type": "json_schema",
        },
        "transform": [Function],
      }
    `);
  });

  test(`transform sanity check`, () => {
    const prompt = buildCharacterCoreMeaningsSpecPrompt({
      character: `行` as HanziCharacter,
      usages: [
        { hanzi: `并行`, pinyin: `bìng xíng` },
        { hanzi: `不行`, pinyin: `bù xíng` },
        { hanzi: `同行`, pinyin: `tóng háng` },
        { hanzi: `不行`, pinyin: `bù xíng` },
        { hanzi: `行`, pinyin: `xíng` },
        { hanzi: `行`, pinyin: `háng` },
      ] as { hanzi: HanziText; pinyin: PinyinText }[],
    });

    expect(
      prompt.transform({
        coreMeanings: [
          {
            lemma: `go`,
            primaryReading: `xíng`,
            pronunciationExceptions: [`同行 (tóng háng)`],
            description: `Movement from place to place extends to coordinated direction, the running of processes, undertaking or putting things into effect, and judgments of whether something works.`,
            branches: [
              {
                lemma: `run`,
                description: `Movement from place to place.`,
                occurrences: [`并行`, `不行`, `行`],
              },
            ],
          },
          {
            lemma: `row`,
            primaryReading: `háng`,
            pronunciationExceptions: [],
            description: `An ordered row develops into a recognized sphere of activity, its members and expertise, and commercial or ranked standing.`,
            branches: [
              {
                lemma: `trade`,
                description: `A recognized occupational or commercial sphere, including its institutions, conditions, and fellow members.`,
                occurrences: [`行`, `同行`],
              },
            ],
          },
        ],
      }),
    ).toMatchInlineSnapshot(`
      [
        {
          "branches": [
            {
              "description": "Movement from place to place.",
              "gloss": "run",
              "occurrences": {
                "不行": "bù xíng",
                "并行": "bìng xíng",
                "行": "xíng",
              },
            },
          ],
          "description": "Movement from place to place extends to coordinated direction, the running of processes, undertaking or putting things into effect, and judgments of whether something works.",
          "gloss": "go",
          "id": "行:go",
          "pinyin": "xíng",
          "pinyinExceptions": {
            "同行": "tóng háng",
          },
        },
        {
          "branches": [
            {
              "description": "A recognized occupational or commercial sphere, including its institutions, conditions, and fellow members.",
              "gloss": "trade",
              "occurrences": {
                "同行": "tóng háng",
                "行": "háng",
              },
            },
          ],
          "description": "An ordered row develops into a recognized sphere of activity, its members and expertise, and commercial or ranked standing.",
          "gloss": "row",
          "id": "行:row",
          "pinyin": "háng",
        },
      ]
    `);
  });
});

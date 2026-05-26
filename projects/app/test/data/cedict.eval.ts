// pyly-not-src-test
import type { CedictV2EntryType, SenseGroupingEntryType } from "./cedict";
import {
  parseCedictV2Line,
  buildCedictEntrySenseGroupingPrompt,
  nestedStringSetScorer,
  buildCedictEntrySenseGrouping2Prompt,
  buildCedictEntrySenseMergingPrompt,
} from "./cedict";
import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { HarnessMetadata, JudgeContext } from "vitest-evals";
import { requestOpenAiChatJson } from "#server/lib/ai.js";
import { normalizePinyinText } from "#data/pinyin.js";
import { invariant } from "@pinyinly/lib/invariant";

interface SenseGroupingHarnessMetadata extends HarnessMetadata {
  expecteds: SenseGroupingEntryType[];
}

export const cedictEntrySenseGroupingHarness = createHarness<
  SenseGroupingEntryType,
  SenseGroupingEntryType,
  SenseGroupingHarnessMetadata
>({
  name: `cedictEntrySenseGrouping`,
  run: async ({ input, signal }) => {
    const prompt = buildCedictEntrySenseGroupingPrompt(input);

    const { result: output, usage } = await requestOpenAiChatJson(prompt, {
      signal,
    });

    return {
      output,
      usage: {
        provider: `openai`,
        model: prompt.model,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  },
});

export const cedictEntrySenseGrouping2Harness = createHarness<
  SenseGroupingEntryType,
  SenseGroupingEntryType,
  SenseGroupingHarnessMetadata
>({
  name: `cedictEntrySenseGrouping2`,
  run: async ({ input, signal }) => {
    const prompt = buildCedictEntrySenseGrouping2Prompt(input);

    const { result: output, usage } = await requestOpenAiChatJson(prompt, {
      signal,
    });

    return {
      output,
      usage: {
        provider: `openai`,
        model: prompt.model,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  },
});

const SenseGroupingJudge = createJudge(
  `SenseGroupingJudge`,
  async ({
    output,
    metadata,
  }: JudgeContext<
    SenseGroupingEntryType,
    SenseGroupingEntryType,
    SenseGroupingHarnessMetadata
  >) => {
    const { expecteds } = metadata;

    let bestScore;

    // Score the output against each expected and take the best one, since there
    // can be multiple valid groupings.
    for (const expected of expecteds) {
      const score = nestedStringSetScorer({
        actual: output.definition,
        expected: expected.definition,
      });
      bestScore ??= score;
      if (score.score > bestScore.score) {
        bestScore = score;
      }
    }

    invariant(bestScore != null);

    return {
      score: bestScore.score,
      metadata: {
        rationale:
          bestScore.score === 1
            ? `perfect match`
            : `Mismatches: \n - ${[...bestScore.mismatches].map((m) => `/${[...m.actual].sort().join(`; `)}/ vs /${[...m.expected].sort().join(`; `)}/`).join(`\n - `)}`,
      },
    };
  },
);

const senseGroupingCases = [
  {
    name: `往 往 [[wang3]]`,
    input: `/depart; to go (in a direction); go; previous; towards; (of a train) bound for; past; to/`,
    expecteds: [
      `/to go (in a direction); go; depart/to; towards; (of a train) bound for/past; previous/`,
      `/to go (in a direction); go; depart/to; towards/(of a train) bound for/past; previous/`,
    ],
  },
  {
    name: `惡心 恶心 [[e3xin1]]`,
    input: `/nausea; to feel sick; disgust; nauseating; to embarrass (deliberately)/`,
    expecteds: [
      `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
    ],
  },
  {
    name: `惡臭 恶臭 [[e4chou4]]`,
    input: `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
    expecteds: [`/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`],
  },
  {
    name: `惡貫滿盈 恶贯满盈 [[e4guan4man3ying2]]`,
    input: `/{lit.} {idiom} strung through and filled with evil; filled with extreme evil/replete with vice/guilty of monstrous crimes/`,
    expecteds: [
      `/{lit.} {idiom} strung through and filled with evil; filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
      `/{lit.} {idiom} strung through and filled with evil/filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
    ],
  },
] as const;

describeEval(
  `buildCedictEntrySenseGroupingPrompt eval`,
  { harness: cedictEntrySenseGroupingHarness, judges: [SenseGroupingJudge] },
  (it) => {
    it.skip.for(senseGroupingCases)(`$name`, async (spec, { run }) => {
      const input = parsedLineToEntry(
        parseCedictV2Line(`${spec.name} ${spec.input}`, { strict: true })!,
      );
      const expecteds = spec.expecteds.map((s) =>
        parsedLineToEntry(
          parseCedictV2Line(`${spec.name} ${s}`, { strict: true })!,
        ),
      );

      await run(input, {
        metadata: {
          expecteds: expecteds,
        },
      });
    });
  },
);

describeEval(
  `buildCedictEntrySenseGrouping2Prompt eval`,
  { harness: cedictEntrySenseGrouping2Harness, judges: [SenseGroupingJudge] },
  (it) => {
    it.for(senseGroupingCases)(`$name`, async (spec, { run }) => {
      const input = parsedLineToEntry(
        parseCedictV2Line(`${spec.name} ${spec.input}`, { strict: true })!,
      );
      const expecteds = spec.expecteds.map((s) =>
        parsedLineToEntry(
          parseCedictV2Line(`${spec.name} ${s}`, { strict: true })!,
        ),
      );

      await run(input, {
        metadata: {
          expecteds: expecteds,
        },
      });
    });
  },
);

export const cedictEntrySenseMergingHarness = createHarness<
  SenseGroupingEntryType,
  SenseGroupingEntryType,
  SenseGroupingHarnessMetadata
>({
  name: `cedictEntrySenseMerging`,
  run: async ({ input, signal }) => {
    const prompt = buildCedictEntrySenseMergingPrompt(input);

    const { result: output, usage } = await requestOpenAiChatJson(prompt, {
      signal,
    });

    return {
      output,
      usage: {
        provider: `openai`,
        model: prompt.model,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  },
});

describeEval(
  `buildCedictEntrySenseMergingPrompt eval`,
  { harness: cedictEntrySenseMergingHarness, judges: [SenseGroupingJudge] },
  (it) => {
    it.for([
      {
        name: `往 往 [[wang3]]`,
        input: `/to go (in a direction); go; depart/to; towards/(of a train) bound for/past; previous/`,
        expecteds: [
          `/to go (in a direction); go; depart/to; towards; (of a train) bound for/past; previous/`,
        ],
      },
      {
        name: `惡心 恶心 [[e3xin1]]`,
        input: `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
        expecteds: [
          `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
        ],
      },
      {
        name: `惡臭 恶臭 [[e4chou4]]`,
        input: `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
        expecteds: [
          `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
        ],
      },
      {
        name: `惡貫滿盈 恶贯满盈 [[e4guan4man3ying2]]`,
        input: `/{lit.} {idiom} strung through and filled with evil/filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
        expecteds: [
          `/{lit.} {idiom} strung through and filled with evil; filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
        ],
      },
    ] as const)(`$name`, async (spec, { run }) => {
      const input = parsedLineToEntry(
        parseCedictV2Line(`${spec.name} ${spec.input}`, { strict: true })!,
      );
      const expecteds = spec.expecteds.map((s) =>
        parsedLineToEntry(
          parseCedictV2Line(`${spec.name} ${s}`, { strict: true })!,
        ),
      );

      await run(input, {
        metadata: {
          expecteds: expecteds,
        },
      });
    });
  },
);

function parsedLineToEntry(parsed: CedictV2EntryType): SenseGroupingEntryType {
  return {
    traditional: parsed.traditional,
    simplified: parsed.simplified,
    pinyin: normalizePinyinText(parsed.pinyin),
    definition: parsed.senses.map((s) => s.split(`; `)),
  };
}

// pyly-not-src-test
import type { CedictV2EntryType, SenseGroupingEntryType } from "./cedict";
import {
  parseCedictV2Line,
  nestedStringSetScorer,
  buildCedictEntrySenseMergingPrompt,
  senseGroupingEntrySchema,
  sampledRegroupEntry,
} from "./cedict";
import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { HarnessMetadata, JsonValue, JudgeContext } from "vitest-evals";
import type { ChatPrompt } from "#server/lib/ai.js";
import { requestOpenAiChatJson } from "#server/lib/ai.js";
import { normalizePinyinText } from "#data/pinyin.js";
import { invariant } from "@pinyinly/lib/invariant";
import { diffStringsUnified } from "@vitest/utils/diff";
import { z } from "zod/v4";

interface SenseGroupingHarnessMetadata extends HarnessMetadata {
  expecteds: SenseGroupingEntryType[];
}

function createChatPromptHarness<
  TMetadata extends HarnessMetadata,
  Schema extends z.ZodType<TOutput>,
  TInput = unknown,
  TOutput extends JsonValue | undefined = z.infer<Schema>,
>(
  buildPrompt: (input: TInput) => ChatPrompt<Schema>,
  _metadataSchema?: z.ZodType<TMetadata>,
) {
  return createHarness<TInput, TOutput, TMetadata>({
    name: `chatHarness`,
    run: async ({ input, signal }) => {
      const prompt = buildPrompt(input);

      const { data, usage } = await requestOpenAiChatJson(prompt, {
        signal,
      });

      return {
        output: data,
        messages: prompt.messages,
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
}

function formatDefinitionStable(definition: string[][]): string {
  return (
    `/` +
    definition
      .map((glosses) => [...glosses].sort().join(`; `))
      .sort()
      .join(`/`) +
    `/`
  );
}

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
    let bestExpected;

    // Score the output against each expected and take the best one, since there
    // can be multiple valid groupings.
    for (const expected of expecteds) {
      const score = nestedStringSetScorer({
        actual: output.definition,
        expected: expected.definition,
      });
      bestScore ??= score;
      bestExpected ??= expected;
      if (score.score > bestScore.score) {
        bestScore = score;
        bestExpected = expected;
      }
    }

    invariant(bestScore != null);
    invariant(bestExpected != null);

    return {
      score: bestScore.score,
      metadata: {
        rationale:
          bestScore.score === 1
            ? `Exact match`
            : `Output differed:\n${diffStringsUnified(formatDefinitionStable(bestExpected.definition), formatDefinitionStable(output.definition))}`,
        output: `hello world`,
      },
    };
  },
);

const senseGroupingCases = [
  {
    name: `下 下 [[xia4]]`,
    input: `/under/underneath/inferior/bring down/down/downwards/below/lower/later/next (week etc)/second (of two parts)/to decline/to go down/to arrive at (a decision, conclusion etc)/measure word to show the frequency of an action/`,
    expecteds: [
      `/below; under; underneath/bring down; to decline; to go down/down; downwards/inferior; lower/later; next (week etc)/measure word to show the frequency of an action/second (of two parts)/to arrive at (a decision, conclusion etc)/`,
      `/below; down; downwards; lower; under; underneath/bring down; to decline; to go down/inferior/later; next (week etc)/measure word to show the frequency of an action/second (of two parts)/to arrive at (a decision, conclusion etc)/`,
      `/below; down; downwards; lower; under; underneath/bring down/inferior/later; next (week etc); second (of two parts)/measure word to show the frequency of an action/to arrive at (a decision, conclusion etc)/to decline; to go down/`,
      `/below; down; downwards; lower; under; underneath/bring down/inferior/later; next (week etc)/measure word to show the frequency of an action/second (of two parts)/to arrive at (a decision, conclusion etc)/to decline; to go down/`,
    ],
  },
  {
    name: `上 上 [[shang4]]`,
    input: `/{bound form} up; upper/previous/first (of multiple parts)/to climb; to get onto; to go up/to attend (class or university)/{directional complement} up/{noun suffix} on; above/top/superior/highest/go up/send up/on top/upon/`,
    expecteds: [
      `/above; upper; {bound form} up/first (of multiple parts)/go up; to climb; to get onto; to go up/highest; superior/on top; upon; {noun suffix} on/previous/send up/to attend (class or university)/top/{directional complement} up/`,
      `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior/on top; upon; {noun suffix} on/send up/to attend (class or university)/top/{directional complement} up/`,
      `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior/on top; top; upon; {noun suffix} on/send up/to attend (class or university)/{directional complement} up/`,
      `/above; on top; upon; upper; {noun suffix} on/first (of multiple parts)/go up; to climb; to get onto; to go up/highest; superior/previous/send up/to attend (class or university)/top/{bound form} up; {directional complement} up/`,
      `/above; on top; upon; {noun suffix} on/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior/send up/to attend (class or university)/top/upper; {bound form} up/{directional complement} up/`,
      `/above; on top; upon; {noun suffix} on/first (of multiple parts)/go up; to climb; to get onto; to go up/highest; superior/previous/send up/to attend (class or university)/top/upper; {bound form} up/{directional complement} up/`,
      `/above; on top; upon; {noun suffix} on/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior; top/send up/to attend (class or university)/upper; {bound form} up/{directional complement} up/`,
    ],
  },
  {
    name: `一定 一定 [[yi1ding4]]`,
    input: `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
    expecteds: [
      `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
    ],
  },
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
  {
    harness: createChatPromptHarness(
      buildCedictEntrySenseMergingPrompt,
      z.object({ expecteds: z.array(senseGroupingEntrySchema) }),
    ),
    judges: [SenseGroupingJudge],
  },
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

describeEval(
  `buildCedictEntrySenseMergingPrompt eval`,
  {
    harness: createChatPromptHarness(
      buildCedictEntrySenseMergingPrompt,
      z.object({ expecteds: z.array(senseGroupingEntrySchema) }),
    ),
    judges: [SenseGroupingJudge],
  },
  (it) => {
    it.for([
      {
        name: `下 下 [[xia4]]`,
        input: `/below; under; underneath; down; downwards/inferior; lower/later; next (week etc)/second (of two parts)/to decline; to go down; bring down/to arrive at (a decision, conclusion etc)/measure word to show the frequency of an action/`,
        expecteds: [
          `/below; under; underneath; down; downwards/inferior; lower/later; next (week etc)/second (of two parts)/to decline; to go down; bring down/to arrive at (a decision, conclusion etc)/measure word to show the frequency of an action/`,
        ],
      },
      {
        name: `上 上 [[shang4]]`,
        input: `/{bound form} up; upper; above/first (of multiple parts)/to climb; to get onto; to go up; go up/to attend (class or university)/{directional complement} up/top/superior; highest/send up/on top; upon; {noun suffix} on/previous/`,
        expecteds: [
          `/above; upper; {bound form} up/first (of multiple parts)/go up; to climb; to get onto; to go up/highest; superior; top/on top; upon; {noun suffix} on/previous/send up/to attend (class or university)/{directional complement} up/`,
          `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior; top/on top; upon; {noun suffix} on/send up/to attend (class or university)/{directional complement} up/`,
          `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior/on top; top; upon; {noun suffix} on/send up/to attend (class or university)/{directional complement} up/`,
        ],
      },
      {
        name: `一定 一定 [[yi1ding4]]`,
        input: `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
        expecteds: [
          `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
        ],
      },
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
          `/filled with extreme evil; guilty of monstrous crimes; replete with vice; {lit.} {idiom} strung through and filled with evil/`,
          `/filled with extreme evil; guilty of monstrous crimes; replete with vice/{lit.} {idiom} strung through and filled with evil/`,
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

describeEval(
  `sampledRegroupEntry eval`,
  {
    harness: createHarness<
      SenseGroupingEntryType,
      SenseGroupingEntryType,
      SenseGroupingHarnessMetadata
    >({
      name: `sampledRegroupEntryHarness`,
      run: async ({ input, signal, setArtifact }) => {
        const {
          result: output,
          usages,
          reviews,
          messages,
          affinityMatrix,
        } = await sampledRegroupEntry(input, {
          samples: 15,
          threshold: 0.5,
          signal,
        });

        setArtifact(`reviews`, reviews as unknown as JsonValue);
        setArtifact(`affinityMatrix`, affinityMatrix as unknown as JsonValue);

        const inputTokens = usages.reduce(
          (sum, usage) => sum + usage.prompt_tokens,
          0,
        );
        const outputTokens = usages.reduce(
          (sum, usage) => sum + usage.completion_tokens,
          0,
        );
        const reasoningTokens = usages.reduce(
          (sum, usage) =>
            sum + (usage.completion_tokens_details?.reasoning_tokens ?? 0),
          0,
        );
        const totalTokens = usages.reduce(
          (sum, usage) => sum + usage.total_tokens,
          0,
        );

        return {
          output,
          messages: messages,
          usage: {
            provider: `openai`,
            // model: prompt.model,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            reasoningTokens: reasoningTokens,
            totalTokens: totalTokens,
          },
        };
      },
    }),

    judges: [SenseGroupingJudge],
  },
  (it) => {
    it.for([
      {
        name: `下 下 [[xia44]]`,
        input: `/below; under; underneath; down; downwards/inferior; lower/later; next (week etc)/second (of two parts)/to decline; to go down; bring down/to arrive at (a decision, conclusion etc)/measure word to show the frequency of an action/`,
        expecteds: [
          `/below; down; downwards; under; underneath/bring down; to decline; to go down/inferior; lower/later; next (week etc); second (of two parts)/measure word to show the frequency of an action/to arrive at (a decision, conclusion etc)/`,
        ],
      },
      // {
      //   name: `上 上 [[shang4]]`,
      //   input: `/{bound form} up; upper; above/first (of multiple parts)/to climb; to get onto; to go up; go up/to attend (class or university)/{directional complement} up/top/superior; highest/send up/on top; upon; {noun suffix} on/previous/`,
      //   expecteds: [
      //     `/above; upper; {bound form} up/first (of multiple parts)/go up; to climb; to get onto; to go up/highest; superior; top/on top; upon; {noun suffix} on/previous/send up/to attend (class or university)/{directional complement} up/`,
      //     `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior; top/on top; upon; {noun suffix} on/send up/to attend (class or university)/{directional complement} up/`,
      //     `/above; upper; {bound form} up/first (of multiple parts); previous/go up; to climb; to get onto; to go up/highest; superior/on top; top; upon; {noun suffix} on/send up/to attend (class or university)/{directional complement} up/`,
      //   ],
      // },
      // {
      //   name: `一定 一定 [[yi1ding4]]`,
      //   input: `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
      //   expecteds: [
      //     `/surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
      //   ],
      // },
      // {
      //   name: `往 往 [[wang3]]`,
      //   input: `/to go (in a direction); go; depart/to; towards/(of a train) bound for/past; previous/`,
      //   expecteds: [
      //     `/to go (in a direction); go; depart/to; towards; (of a train) bound for/past; previous/`,
      //   ],
      // },
      // {
      //   name: `惡心 恶心 [[e3xin1]]`,
      //   input: `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
      //   expecteds: [
      //     `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
      //   ],
      // },
      // {
      //   name: `惡臭 恶臭 [[e4chou4]]`,
      //   input: `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
      //   expecteds: [
      //     `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
      //   ],
      // },
      // {
      //   name: `惡貫滿盈 恶贯满盈 [[e4guan4man3ying2]]`,
      //   input: `/{lit.} {idiom} strung through and filled with evil/filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
      //   expecteds: [
      //     `/filled with extreme evil; guilty of monstrous crimes; replete with vice; {lit.} {idiom} strung through and filled with evil/`,
      //     `/filled with extreme evil; guilty of monstrous crimes; replete with vice/{lit.} {idiom} strung through and filled with evil/`,
      //   ],
      // },
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

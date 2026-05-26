// pyly-not-src-test
import type { SenseGroupingEntryType } from "./cedict";
import {
  parseCedictV2Line,
  buildCedictEntrySenseGroupingPrompt,
  nestedStringSetScorer,
} from "./cedict";
import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { HarnessMetadata, JudgeContext } from "vitest-evals";
import { requestOpenAiJson } from "#server/lib/ai.js";
import { normalizePinyinText } from "#data/pinyin.js";
import { invariant } from "@pinyinly/lib/invariant";

interface SenseGroupingHarnessMetadata extends HarnessMetadata {
  expected: string[][];
}

export const senseGroupingHarness = createHarness<
  SenseGroupingEntryType,
  SenseGroupingEntryType,
  SenseGroupingHarnessMetadata
>({
  name: `senseGrouping`,
  run: async ({ input, setArtifact }) => {
    const prompt = buildCedictEntrySenseGroupingPrompt(input);

    const output = await requestOpenAiJson(prompt);

    setArtifact(`question`, { input });

    return {
      output,
      usage: {
        provider: `openai`,
        model: prompt.model,
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
    const { expected } = metadata;
    const result = nestedStringSetScorer({
      actual: output.definition,
      expected,
    });

    return {
      score: result.score,
      metadata: {
        rationale:
          result.score === 1 ? `perfect match` : `didn't match exactly`,
      },
    };
  },
);

describeEval(
  `sense grouping`,
  { harness: senseGroupingHarness, judges: [SenseGroupingJudge] },
  (it) => {
    it.for([
      {
        name: `往 往 [[wang3]]`,
        input: `/depart; to go (in a direction); go; previous; towards; (of a train) bound for; past; to/`,
        expected: `/to go (in a direction); go; depart/to; towards; (of a train) bound for/past; previous/`,
      },
      {
        name: `惡心 恶心 [[e3xin1]]`,
        input: `/nausea; to feel sick; disgust; nauseating; to embarrass (deliberately)/`,
        expected: `/nausea; to feel sick/disgust; nauseating/to embarrass (deliberately)/`,
      },
      {
        name: `惡臭 恶臭 [[e4chou4]]`,
        input: `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
        expected: `/stink; stench/stinky; smelly/{fig.} disgusting; repugnant/`,
      },
      {
        name: `惡貫滿盈 恶贯满盈 [[e4guan4man3ying2]]`,
        input: `/{lit.} {idiom} strung through and filled with evil; filled with extreme evil/replete with vice/guilty of monstrous crimes/`,
        expected: `/{lit.} {idiom} strung through and filled with evil; filled with extreme evil; replete with vice; guilty of monstrous crimes/`,
      },
    ] as const)(`$name`, async (spec, { run }) => {
      const input = parseCedictV2Line(`${spec.name} ${spec.input}`);
      const expected = parseCedictV2Line(`${spec.name} ${spec.expected}`);

      invariant(input != null, `failed to parse input spec`);
      invariant(expected != null, `failed to parse expected spec`);

      await run(
        {
          traditional: input.traditional,
          simplified: input.simplified,
          pinyin: normalizePinyinText(input.pinyin),
          definition: input.senses.map((s) => s.split(`; `)),
        },
        {
          metadata: {
            expected: expected.senses.map((x) => x.split(`; `)),
          },
        },
      );
    });
  },
);

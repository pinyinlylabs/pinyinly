import type { CedictV2EntryType } from "./cedict";
import {
  parseCedictV2Line,
  nestedStringSetScorer,
  splitCedictV2Sense,
  splitCedictV2Definition,
} from "./cedict";
import { createJudge, describeEval } from "vitest-evals";
import type { HarnessMetadata, JudgeContext } from "vitest-evals";
import { normalizePinyinText } from "#data/pinyin.js";
import { invariant } from "@pinyinly/lib/invariant";
import { diffStringsUnified } from "@vitest/utils/diff";
import { z } from "zod/v4";
import type { HskLevelJudgeEntryType, HskLevelJudgeResultType } from "./hsk";
import { buildHskLevelJudgePrompt } from "./hsk";
import { createChatPromptHarness } from "./eval";

interface HskLevelHarnessMetadata extends HarnessMetadata {
  expecteds: string[][][];
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

const HskLevelJudge = createJudge(
  `HskLevelJudge`,
  async ({
    output,
    metadata,
  }: JudgeContext<
    HskLevelJudgeEntryType,
    HskLevelJudgeResultType,
    HskLevelHarnessMetadata
  >) => {
    const { expecteds } = metadata;

    const actual = output.hskRequiredDefinitions.map((s) => s.split(`; `));
    let bestScore;
    let bestExpected;

    // Score the output against each expected and take the best one, since there
    // can be multiple valid groupings.
    for (const expected of expecteds) {
      const score = nestedStringSetScorer({
        actual,
        expected,
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
            : `Output differed:\n${diffStringsUnified(formatDefinitionStable(bestExpected), formatDefinitionStable(actual))}`,
        output: `hello world`,
      },
    };
  },
);

const hskLevelJudgeCases = [
  {
    name: `長 长 [[chang2]]`,
    definition: `/long/(bound form) length/(bound form) strong point; forte/(bound form) to be good at/(lit.) surplus; spare (Taiwan pr. [zhang4])/`,
    hskLevel: `2`,
    expecteds: [`/long/(bound form) length/`],
  },
] as const;

describeEval(
  `buildHskLevelJudgePrompt eval`,
  {
    harness: createChatPromptHarness(
      buildHskLevelJudgePrompt,
      z.object({
        expecteds: z.array(z.array(z.array(z.string()))),
      }),
    ),
    judges: [HskLevelJudge],
  },
  (it) => {
    it.for(hskLevelJudgeCases)(`$name`, async (spec, { run }) => {
      const cedictEntry = parsedLineToEntry(
        parseCedictV2Line(`${spec.name} ${spec.definition}`, {
          strict: true,
        })!,
      );

      const input = {
        hskLevel: spec.hskLevel,
        definition: cedictEntry.definition,
        pinyin: cedictEntry.pinyin,
        simplified: cedictEntry.simplified,
        traditional: cedictEntry.traditional,
      };

      const expecteds = spec.expecteds.map((s) =>
        splitCedictV2Definition(s).map((sense) => splitCedictV2Sense(sense)),
      );

      await run(input, {
        metadata: {
          expecteds,
        },
      });
    });
  },
);

function parsedLineToEntry(
  parsed: CedictV2EntryType,
): Omit<HskLevelJudgeEntryType, `hskLevel`> {
  return {
    traditional: parsed.traditional,
    simplified: parsed.simplified,
    pinyin: normalizePinyinText(parsed.pinyin),
    definition: parsed.senses,
  };
}

// pyly-not-src-test
import { describe, expect, test } from "vitest";
import {
  renderThoughtChainFunnelAscii,
  runGuidedImaginationDeterministicChecks,
} from "./thoughtChainFunnel";
import type { ThoughtChainFunnelType } from "./thoughtChainFunnel";

describe(`renderThoughtChainFunnelAscii`, () => {
  test(`renders backbone and supporting cue joins as ASCII flow`, () => {
    const thoughtFunnel: ThoughtChainFunnelType = {
      backboneThoughtChain: [
        { thought: `fire`, elaboration: `campfire`, because: null },
        {
          thought: `furnace`,
          elaboration: null,
          because: `Fire is used in furnaces.`,
        },
        {
          thought: `to smelt`,
          elaboration: null,
          because: `Furnaces are used to smelt ore.`,
        },
      ],
      supportingCues: [
        {
          concept: `east`,
          cueThoughtChain: [
            { thought: `east`, elaboration: null, because: null },
            {
              thought: `sunrise`,
              elaboration: null,
              because: `The sun rises in the east.`,
            },
            {
              thought: `furnace`,
              elaboration: null,
              because: `Sunrise glow suggests furnace heat.`,
            },
          ],
          joinBackboneStepIndex: 1,
        },
      ],
    };

    expect(renderThoughtChainFunnelAscii(thoughtFunnel)).toMatchInlineSnapshot(`
      "GRAPH
      * fire (campfire)
      |
      * furnace (Fire is used in furnaces.)
      |
      | * east
      | * sunrise (The sun rises in the east.)
      | * furnace (Sunrise glow suggests furnace heat.)
      |/
      |
      * to smelt (Furnaces are used to smelt ore.) (target)"
    `);
  });

  test(`marks invalid join index without throwing`, () => {
    const thoughtFunnel: ThoughtChainFunnelType = {
      backboneThoughtChain: [
        { thought: `ice`, elaboration: null, because: null },
      ],
      supportingCues: [
        {
          concept: `east`,
          cueThoughtChain: [
            { thought: `east`, elaboration: null, because: null },
          ],
          joinBackboneStepIndex: 99,
        },
      ],
    };

    expect(renderThoughtChainFunnelAscii(thoughtFunnel)).toContain(
      `INVALID joins [99]`,
    );
  });
});

describe(`runGuidedImaginationDeterministicChecks`, () => {
  test(`flags em dash deterministically`, () => {
    const result = runGuidedImaginationDeterministicChecks(
      `A calm explanation—with an em dash.`,
    );

    expect(result.passed).toBe(false);
    expect(result.criticisms.some((c) => c.code === `EM_DASH_USED`)).toBe(true);
  });

  test(`flags markdown list formatting`, () => {
    const result =
      runGuidedImaginationDeterministicChecks(`- table\n- meeting`);

    expect(result.passed).toBe(false);
    expect(
      result.criticisms.some((c) => c.code === `FORBIDDEN_FORMATTING`),
    ).toBe(true);
  });

  test(`flags metadata leakage`, () => {
    const result = runGuidedImaginationDeterministicChecks(
      `fidelity: 0.9 and readability: 0.8`,
    );

    expect(result.passed).toBe(false);
    expect(result.criticisms.some((c) => c.code === `METADATA_LEAKAGE`)).toBe(
      true,
    );
  });
});

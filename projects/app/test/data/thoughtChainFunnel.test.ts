// pyly-not-src-test
import { describe, expect, test } from "vitest";
import {
  parseMnemonicConcept,
  parseMnemonicConcepts,
  renderThoughtChainFunnelAscii,
  runGuidedImaginationDeterministicChecks,
  runThoughtChainFunnelDeterministicChecks,
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

describe(`parseMnemonicConcept`, () => {
  test(`parses canonical identity and context glosses`, () => {
    expect(parseMnemonicConcept(`earth; soil`)).toEqual({
      raw: `earth; soil`,
      canonicalIdentity: `earth`,
      contextGlosses: [`soil`],
    });
  });

  test(`trims expressions and removes empty expressions`, () => {
    expect(parseMnemonicConcept(` earth ; soil `)).toEqual({
      raw: ` earth ; soil `,
      canonicalIdentity: `earth`,
      contextGlosses: [`soil`],
    });

    expect(parseMnemonicConcept(`earth;;soil;`)).toEqual({
      raw: `earth;;soil;`,
      canonicalIdentity: `earth`,
      contextGlosses: [`soil`],
    });
  });

  test(`keeps single-expression concept unchanged`, () => {
    expect(parseMnemonicConcept(`earth`)).toEqual({
      raw: `earth`,
      canonicalIdentity: `earth`,
      contextGlosses: [],
    });
  });

  test(`throws for all-empty concept expression`, () => {
    expect(() => parseMnemonicConcept(`;;`)).toThrow(
      /expected at least one non-empty expression/u,
    );
  });

  test(`supports multi-word context glosses`, () => {
    expect(parseMnemonicConcept(`bank; financial institution`)).toEqual({
      raw: `bank; financial institution`,
      canonicalIdentity: `bank`,
      contextGlosses: [`financial institution`],
    });
  });
});

describe(`parseMnemonicConcepts`, () => {
  test(`parses concept arrays`, () => {
    expect(parseMnemonicConcepts([`earth; soil`, `arch`])).toEqual([
      {
        raw: `earth; soil`,
        canonicalIdentity: `earth`,
        contextGlosses: [`soil`],
      },
      {
        raw: `arch`,
        canonicalIdentity: `arch`,
        contextGlosses: [],
      },
    ]);
  });
});

describe(`runThoughtChainFunnelDeterministicChecks`, () => {
  test(`passes when canonical identities are used`, () => {
    const result = runThoughtChainFunnelDeterministicChecks({
      target: `at`,
      concepts: [`arch`, `earth; soil`],
      thoughtFunnel: {
        backboneThoughtChain: [
          { thought: `arch`, elaboration: null, because: null },
          {
            thought: `at`,
            elaboration: null,
            because: `Arches are often pictured at an entrance location.`,
          },
        ],
        supportingCues: [
          {
            concept: `earth`,
            cueThoughtChain: [
              { thought: `earth`, elaboration: null, because: null },
              {
                thought: `arch`,
                elaboration: null,
                because: `Earth can support stone arches.`,
              },
            ],
            joinBackboneStepIndex: 0,
          },
        ],
      },
    });

    expect(result.passed).toBe(true);
    expect(result.criticisms).toEqual([]);
  });

  test(`rejects raw semicolon concept labels`, () => {
    const result = runThoughtChainFunnelDeterministicChecks({
      target: `at`,
      concepts: [`arch`, `earth; soil`],
      thoughtFunnel: {
        backboneThoughtChain: [
          { thought: `earth; soil`, elaboration: null, because: null },
          {
            thought: `at`,
            elaboration: null,
            because: `This leads to a location.`,
          },
        ],
        supportingCues: [
          {
            concept: `arch`,
            cueThoughtChain: [
              { thought: `arch`, elaboration: null, because: null },
              {
                thought: `earth; soil`,
                elaboration: null,
                because: `The cue joins the root.`,
              },
            ],
            joinBackboneStepIndex: 0,
          },
        ],
      },
    });

    expect(result.passed).toBe(false);
    expect(
      result.criticisms.some(
        (criticism) => criticism.code === `CONCEPT_IDENTITY_MISMATCH`,
      ),
    ).toBe(true);
  });

  test(`rejects context gloss substitution and invalid cue labels`, () => {
    const result = runThoughtChainFunnelDeterministicChecks({
      target: `at`,
      concepts: [`arch`, `earth; soil`],
      thoughtFunnel: {
        backboneThoughtChain: [
          { thought: `arch`, elaboration: null, because: null },
          {
            thought: `at`,
            elaboration: null,
            because: `This leads to a location.`,
          },
        ],
        supportingCues: [
          {
            concept: `soil`,
            cueThoughtChain: [
              { thought: `soil`, elaboration: null, because: null },
              {
                thought: `arch`,
                elaboration: null,
                because: `This cue joins the arch.`,
              },
            ],
            joinBackboneStepIndex: 0,
          },
        ],
      },
    });

    expect(result.passed).toBe(false);
    expect(
      result.criticisms.some(
        (criticism) => criticism.code === `CONCEPT_IDENTITY_MISMATCH`,
      ),
    ).toBe(true);
    expect(
      result.criticisms.some(
        (criticism) => criticism.code === `CONCEPT_COVERAGE_MISSING`,
      ),
    ).toBe(true);
  });
});

import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot, makeLocationSpec } from "./helpers";
import { buildLocationSpecEvaluatePrompt } from "#util/prompts/locationSpecEvaluate.js";

describe(`buildLocationSpecEvaluatePrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildLocationSpecEvaluatePrompt({
      location: `Pirate ship`,
      locationSpec: makeLocationSpec(`Pirate ship`),
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "messages": "
      =====================
       SYSTEM MESSAGE
      ---------------------
      You are evaluating a location specification for a recurring fictional location.

      Your task is to diagnose problems in the specification.

      Do not rewrite it.

      Do not improve it.

      You are judging whether the specification is canonical, reusable, visually coherent, and useful for repeated illustration.

      ## Canonicality

      Check whether the output represents the shared, default mental image of the supplied location.

      Reject invented lore, proper nouns, overly specialised variants, and arbitrary distinguishing details.

      Names should be simple and widely recognised.

      ## Natural set selection

      Check whether each set naturally exists within the location.

      Reject contrived sets that only exist to satisfy the schema.

      The Heart must be the highlight visitors would most want to reach, not a courtyard, corridor, circulation hub, or overview chosen for architectural convenience.

      The Ascent should naturally lead toward the Summit.

      The Below set must be meaningfully distinct from the others.

      ## Recognition

      Check whether there are 3–5 strong recognition hooks.

      Hooks should be iconic, concise, visual, and useful across different art styles.

      Reject hooks that depend on arbitrary colours, materials, moods, or implementation details.

      Global and set-level rules should preserve recognisability.

      ## Distinctiveness and coherence

      Check whether the five sets are visually and spatially distinct while still belonging to the same location.

      Repeated scenes should be easy to distinguish by set.

      Canonical framings should provide stable, recognisable compositions.

      ## Rule quality

      Every design rule must be directly observable.

      Rules should be concise and non-redundant.

      Reject abstract intentions, overly specific details, and repeated global rules in individual sets.

      ## Guest appeal and revisitability

      The location should be enjoyable to imagine revisiting.

      The Heart should have strong appeal, wonder, and story potential.

      Technically correct but boring or unrewarding sets should be criticised.

      The Summit should feel like a satisfying payoff after the Ascent.

      ## Framing quality

      Each canonical framing should clearly define viewpoint, direction, dominant composition, and relevant hooks.

      Avoid impossible visibility or frames that force unrelated exterior hooks into enclosed interior spaces.

      Return structured criticisms only.
      =====================



      =====================
       USER MESSAGE
      ---------------------
      Evaluate the following location specification.

      <data>
      {"location":"Pirate ship","locationSpec":{"location":"Pirate ship","sets":{"arrival":{"name":"dock"},"heart":{"name":"captain's cabin"},"below":{"name":"cargo hold"},"ascent":{"name":"stairs"},"summit":{"name":"crow's nest"}}}}
      </data>
      =====================
      ",
        "model": "gpt-5.4",
        "reasoningEffort": "medium",
        "schema": {
          "name": "locationEvaluationSchema",
          "schema": {
            "additionalProperties": false,
            "properties": {
              "criticisms": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "code": {
                      "enum": [
                        "NON_CANONICAL",
                        "INVENTED_LORE",
                        "AWKWARD_SET",
                        "WEAK_RECOGNITION_HOOK",
                        "REDUNDANT_RULE",
                        "UNOBSERVABLE_RULE",
                        "OVER_SPECIFIC",
                        "WEAK_DISTINCTIVENESS",
                        "WEAK_COHERENCE",
                        "WEAK_FRAMING",
                        "LOW_GUEST_APPEAL",
                        "OTHER",
                      ],
                      "type": "string",
                    },
                    "message": {
                      "type": "string",
                    },
                    "recommendation": {
                      "type": "string",
                    },
                    "scope": {
                      "enum": [
                        "location",
                        "recognitionHooks",
                        "designRules",
                        "arrival",
                        "heart",
                        "below",
                        "ascent",
                        "summit",
                      ],
                      "type": "string",
                    },
                    "severity": {
                      "enum": [
                        "minor",
                        "major",
                      ],
                      "type": "string",
                    },
                  },
                  "required": [
                    "code",
                    "scope",
                    "severity",
                    "message",
                    "recommendation",
                  ],
                  "type": "object",
                },
                "type": "array",
              },
              "passed": {
                "type": "boolean",
              },
              "score": {
                "maximum": 1,
                "minimum": 0,
                "type": "number",
              },
            },
            "required": [
              "passed",
              "score",
              "criticisms",
            ],
            "title": "locationEvaluationSchema",
            "type": "object",
          },
          "type": "json_schema",
        },
      }
    `);
  });
});

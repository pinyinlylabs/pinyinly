import { describe, expect, test } from "vitest";
import { buildPronunciationMnemonicStoryboardPanelsPrompt } from "#util/prompts/pronunciationMnemonicStoryboardPanels.js";
import {
  fmtChatPromptForSnapshot,
  makeActorSpec,
  makeLocationSpecWithDetail,
} from "./helpers";

describe(`buildPronunciationMnemonicStoryboardPanelsPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildPronunciationMnemonicStoryboardPanelsPrompt({
      locationSpec: makeLocationSpecWithDetail(`Ship`),
      locationSetKey: `arrival`,
      actor: makeActorSpec(`Ethan`),
      hook: `hook`,
      premise: `premise`,
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You are a helpful assistant that converts visual mnemonic premises into storyboard panels.

        You are given:
        - actor
        - set
        - hook
        - premise

        # Objective

        The hook and premise already define the mnemonic.

        Do not invent a better idea, reinterpret the cue, or search for a different interaction.

        Instead, faithfully create the minimum set of storyboard panels needed for someone to immediately understand the recurring visual joke described by the premise.

        Treat the premise as the canonical source of truth.

        Use the actor and set only as reference material for depicting the correct character and environment.

        # Storyboard principles

        Before writing the panels, mentally imagine one typical occurrence of the recurring interaction.

        Then choose only the most informative moments.

        Do not simply divide the interaction into successive moments in time.

        Instead, choose the fewest panels needed for the reader to understand:
        - the setup
        - the central interaction
        - the memorable payoff

        Each panel should reveal one new piece of understanding.

        The final panel should depict the interaction at its most recognizable and memorable—not merely the final moment in time.

        Prefer showing the consequence of the interaction rather than the mechanics that lead to it.

        If removing a panel would not make the mnemonic harder to understand, that panel should not exist.

        # Panel guidelines

        Use only 2–4 panels.

        Each panel should describe one immediately drawable visual scene.

        Keep descriptions concrete and visual.

        Avoid dialogue, narration, artistic descriptions, colours, lighting, camera directions, or visual style.

        Do not introduce new ideas beyond the premise.

        # Output

        ## panels

        Return a JSON array of 2–4 short strings.

        # Input

        <input>
        {"actor":{"nickname":"Ethan"},"location":{"name":"Ship","recognitionHooks":["mast","bow","anchor"],"designRules":["Keep the hull dominant in the composition."]},"locationSet":{"name":"arrival","purpose":"arrival purpose","props":["arrival prop"],"designRules":["arrival design rule"],"canonicalFraming":"arrival canonical framing"},"hook":"hook","premise":"premise"}
        </input>
        =====================
        ",
          "model": "gpt-5.4",
          "reasoningEffort": "low",
          "schema": {
            "name": "pronunciationMnemonicStoryboardPanelsPromptOutputSchema",
            "schema": {
              "additionalProperties": false,
              "properties": {
                "panels": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
              },
              "required": [
                "panels",
              ],
              "title": "pronunciationMnemonicStoryboardPanelsPromptOutputSchema",
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
  });
});

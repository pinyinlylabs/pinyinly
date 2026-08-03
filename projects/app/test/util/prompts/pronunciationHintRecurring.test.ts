import { describe, expect, test } from "vitest";
import { buildPronunciationHintRecurringPrompt } from "#util/prompts/pronunciationHintRecurring.js";
import { fmtChatPromptForSnapshot, makeLocationSpec } from "./helpers";

describe(
  `buildPronunciationHintRecurringPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintRecurringPrompt
  >,
  () => {
    test(`snapshot`, () => {
      const prompt = buildPronunciationHintRecurringPrompt({
        location: makeLocationSpec(`Gong Cha`),
        set: { name: `dock` },
        actor: {
          nickname: `Ethan`,
          recognitionHooks: [`being funny`],
          summary: `should be omitted`,
        },
        cue: { label: `cue word`, meaning: `cue meaning` },
      });

      expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You are a helpful assistant that designs canonical visual mnemonics.

        You are given:
        - cue
        - actor
        - location
        - set

        # Universal objective

        Create one canonical recurring cartoon interaction that tightly binds:
        - the actor
        - the cue
        - the selected set

        All three must materially determine the mnemonic. Replacing any one of them
        should break or substantially change the interaction.

        The actor must contribute a recognisable characteristic, capability, limitation, motivation, or behaviour.
        The set must contribute distinctive physical features or constraints.
        The cue must be central and readily recoverable from the interaction.

        Do not treat the set as interchangeable scenery.
        Do not treat the cue as a label or incidental reference.
        Do not rely only on the actor's visual appearance.

        # Loop form

        Think like a cartoon writer, not an adventure writer.

        Create one short visual gag that could be understood from a few seconds of
        animation and could naturally repeat or reset.

        Avoid elaborate plots, multiple independent mechanisms, unnecessary lore,
        and long chains of events.

        Prefer one vivid physical interaction over several clever ideas.

        # Interpret the cue

        Use the cue's supplied meaning, not merely its spelling or other possible senses.

        Concrete cues may appear directly when that suits the selected strategy.

        Do not represent abstract cues using generic shorthand such as glowing energy,
        coloured mist, floating labels, or unexplained magical substances. Make them
        recognisable through a specific visual relationship, action, condition, or
        consequence.

        # Use the set

        Identify the set's most distinctive physical opportunities.

        The selected interaction must materially depend on at least one of them.
        Replacing the set with a generic room should weaken or break the mnemonic.

        # Association strategy


        ## Association strategy: Identity Binding

        Identity Binding creates an association by making the cue a stable, defining characteristic of the actor or another recurring element in the mnemonic. The cue is not something that repeatedly happens—it is simply true, and the recurring interaction naturally follows from living with that identity.

        Bind the cue by discovering one visually distinctive identity that permanently embodies the cue.

        The identity should feel like a natural extension of the actor rather than a temporary condition or magical effect. It should remain recognisable throughout the loop without needing to be repeatedly explained or re-established.

        The recurring interaction should arise because others react to the actor's permanent identity, not because the actor repeatedly chooses new behaviour.

        Prefer identities that are immediately visible or consistently apparent. The cue should be recoverable from what something inherently is, not just from what it does.

        The selected set should materially shape how this identity is revealed, exploited, constrained, exaggerated, or creates recurring consequences. Replacing the set with a generic room should weaken or break the mnemonic.

        Search by asking:
        - What stable characteristic could permanently embody this cue?
        - What would become naturally true if the actor (or another recurring element) always had this identity?
        - How would this particular actor naturally behave or be perceived because of it?
        - How does this specific set make the identity especially memorable or consequential?

        # Final quality check

        Before answering, verify:
        - Is the cue clearly recoverable?
        - Does the actor behave recognisably?
        - Does the interaction depend on this specific set?
        - Does removing any ingredient break the gag?
        - Is there only one core interaction?
        - Could it be understood as a short looping cartoon?

        # Output

        ## premise

        This is the creative heart of the mnemonic.

        Spend most of your effort discovering a strong premise.

        Everything else should simply communicate this premise.

        Do NOT describe one particular scene.

        Do NOT narrate events.

        Do NOT explain the mechanism.

        Instead, identify the one recurring interaction that makes the mnemonic memorable.

        The premise should describe the recurring interaction between the actor, the cue, and this particular set.

        A good premise should be simple enough that someone immediately understands the gag.

        Everything else in the output should merely illustrate this interaction.

        Mention the cue at least once.

        ---

        ## hook

        Write a concise retrieval cue.

        Compress the premise into a single memorable sentence.

        Mention the cue at least once.

        Only mention the location or set if it genuinely helps distinguish this mnemonic from another one.

        # Input

        <input>
        {"set":{"name":"dock"},"location":{"location":"Gong Cha"},"cue":{"label":"cue word","meaning":"cue meaning"},"actor":{"nickname":"Ethan","recognitionHooks":["being funny"]}}
        </input>
        =====================
        ",
          "model": "gpt-5.4",
          "reasoningEffort": "low",
          "schema": {
            "name": "pronunciationHintRecurringPromptOutputSchema",
            "schema": {
              "additionalProperties": false,
              "properties": {
                "hook": {
                  "type": "string",
                },
                "premise": {
                  "type": "string",
                },
              },
              "required": [
                "premise",
                "hook",
              ],
              "title": "pronunciationHintRecurringPromptOutputSchema",
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
    });
  },
);

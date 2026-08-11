import type { ChatPrompt } from "@/server/lib/ai";
import {
  locationAndLocationSetFromInput,
  renderPromptTemplate,
} from "@/util/prompts/shared";
import { z } from "zod";
import {
  actorSpecSchema,
  locationSetKeySchema,
  locationSpecSchema,
} from "@/data/model";
import omit from "lodash/omit";

export const pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema =
  z.enum([
    `identityBinding`,
    `environmentRule`,
    `objectBinding`,
    `behaviourConsequence`,
  ]);

export const pronunciationMnemonicRecurringPromptCueSchema = z.object({
  label: z.string(),
  meaning: z.string().optional(),
});

export const pronunciationMnemonicRecurringPromptInputSchema = z.object({
  locationSpec: locationSpecSchema,
  locationSetKey: locationSetKeySchema,
  cue: pronunciationMnemonicRecurringPromptCueSchema,
  actorSpec: actorSpecSchema,
  associationStrategy:
    pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema.optional(),
});

export type PronunciationMnemonicRecurringPromptInput = z.infer<
  typeof pronunciationMnemonicRecurringPromptInputSchema
>;

export const pronunciationMnemonicRecurringPromptOutputSchema = z
  .object({
    premise: z.string(),
    hook: z.string(),
  })
  .strict()
  .meta({ title: `pronunciationMnemonicRecurringPromptOutputSchema` });

export function buildPronunciationMnemonicRecurringPrompt(
  input: PronunciationMnemonicRecurringPromptInput,
): ChatPrompt<typeof pronunciationMnemonicRecurringPromptOutputSchema> {
  const systemTemplate = `
You are a helpful assistant that designs canonical visual mnemonics.

You are given:
- cue
- actor
- location
- location set

# Universal objective

Create one canonical recurring cartoon interaction that tightly binds:
- the actor
- the cue
- the location set

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

{{ associationStrategy }}

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

Mention the cue, location name, set name, and actor, at least once.

---

## Terminology

When referencing the location and set, use the exact names provided in the 
input. Do not invent new names. For example location set name is "basement",
refer to it as "basement" rather than "cellar" or "dungeon".

# Input

<input>
{{ input }}
</input>
`;

  return {
    schema: pronunciationMnemonicRecurringPromptOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    messages: [
      {
        role: `system`,
        content: renderPromptTemplate(systemTemplate, {
          associationStrategy:
            associationStrategies[
              input.associationStrategy ?? `identityBinding`
            ],
          input: JSON.stringify({
            ...locationAndLocationSetFromInput(input),
            cue: input.cue,
            actor: omit(input.actorSpec, [`summary`, `bodyLanguage`]),
          }),
        }),
      },
    ],
  };
}

const associationStrategies = {
  identityBinding: `
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
- How does this specific set make the identity especially memorable or consequential?`,
  environmentRule: `
## Association strategy: Environment Rule

Environment Rule creates an association by making the cue a recurring rule of the selected set. The actor does not primarily create the cue—the world already behaves this way, and the actor should develop a characteristic recurring way of exploiting, avoiding, provoking, or working around the environmental property.

Bind the cue by discovering one simple rule that consistently changes how this particular set behaves.

The rule should naturally involve the set's defining structures, materials, objects, or physical affordances. It should feel like an exaggerated property of this location rather than an unrelated magical effect.

The actor's established identity should determine how they repeatedly respond to, take advantage of, struggle against, or accidentally trigger this environmental rule.

The recurring interaction should emerge naturally from the actor repeatedly encountering the same world rule. The environment should feel consistent and predictable, not random.

Prefer discovering surprising behaviours in the set's existing features before inventing entirely new mechanisms.

Search by asking:
- What simple rule could this cue impose on this particular set?
- Which existing feature of the set would naturally express that rule?
- How would this particular actor repeatedly interact with or react to that rule?
- Why would this recurring interaction only happen in this set?`,
  objectBinding: `
## Association strategy: Object Binding

Object Binding creates an association by making a memorable physical object the centre of the recurring interaction. The cue should be immediately recoverable through the actor's repeated interaction with that object.

Discover a concrete object that naturally embodies, enables, represents, or carries the cue.

The actor's established identity should determine how they repeatedly interact with the object.

The selected set must then physically shape, constrain, reveal, conceal, transform, contain, or otherwise influence that interaction. The object should not behave the same way in a generic location.

The object should be indispensable to the mnemonic, not a decoration or prop held briefly by the actor. It should drive the recurring loop.

Prefer physical interactions that are immediately understandable without explanation.

Search by asking:
- What memorable object naturally represents or enables this cue?
- How would this particular actor repeatedly interact with that object?
- What feature of this set makes that interaction unique?
- Why couldn't this same object interaction happen just as well somewhere else?`,
  behaviourConsequence: `
## Association strategy: Behaviour–Consequence

Behaviour–Consequence strategy creates an association by making the cue repeatedly change how the actor behaves, while the set consistently responds to that behaviour.

Bind the cue through a recurring behaviour or decision by the actor.

The cue should change how the actor thinks, feels, expects, chooses, or acts.
The actor's established personality should shape the particular form that
behaviour takes.

The selected set must then physically respond to, enable, frustrate, expose,
reward, punish, or reset that behaviour. This response should create the
recurring loop.

Prefer remembering abstract cues through a concrete consequence of behaviour
rather than turning them into objects or generic magical effects.

Search by asking:
- What behaviour would this cue cause?
- How would this particular actor express that behaviour distinctively?
- What feature of this set would repeatedly react to it?
- How does that reaction reset or sustain the loop?`,
};

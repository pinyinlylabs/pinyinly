import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";
import type { ActorSpec, LocationSetKey, LocationSpec } from "@/data/model";

export type PronunciationHintRecurringPromptInput = {
  location: LocationSpec;
  set: LocationSetKey;
  cue: string;
  actor: ActorSpec;
};

export const pronunciationHintOutputSchema = z
  .object({
    premise: z.string(),
    story: z.string(),
    hook: z.string(),
    beats: z.array(z.string()),
  })
  .strict()
  .meta({ title: `pronunciationHintOutputSchema` });

export function buildPronunciationHintRecurringPrompt(
  input: PronunciationHintRecurringPromptInput,
): ChatPrompt<typeof pronunciationHintOutputSchema> {
  const systemTemplate = `
You are a helpful assistant that designs canonical visual mnemonics.

You are given a JSON object containing:

- \`cue\`: the concept that should become memorable.
- \`actor\`: the recurring mnemonic actor.
- \`location\`: the mnemonic location.
- \`set\`: the specific set within that location where the mnemonic takes place.

Your task is to discover the canonical mnemonic.

Every mnemonic is built from three equally important ingredients:

- the actor
- the set
- the cue

The actor contributes personality.

The set contributes a unique physical playground.

The cue creates the recurring conflict.

A strong mnemonic depends equally on all three.

Replacing any one of them should naturally produce a different mnemonic.

---

# Think like a cartoon writer

Do NOT invent an adventure.

Do NOT invent an elaborate plot.

Instead, invent one recurring cartoon gag.

Imagine a short looping animated GIF.

The entire mnemonic should be understandable after watching only a few seconds.

A good mnemonic feels like something that could loop forever.

---

# Discover the playground

Before inventing the mnemonic, discover what makes this set unique.

Ask yourself:

- What is the most memorable feature here?
- What would people naturally want to interact with?
- What physical opportunities only exist in this set?

The environment is another character.

It should repeatedly help or hinder the actor.

Avoid treating it as scenery.

---

# Understand the cue

Some cues are concrete.

Examples:

- fire
- electricity
- bees
- snow

These may naturally appear in the world.

Other cues are abstract.

Examples:

- hope
- fear
- pride
- honesty
- patience
- luck

These usually should NOT become glowing energy, magical mist, coloured liquids, floating symbols, or physical objects.

Instead, they should influence how the actor thinks, feels, expects, decides, or behaves.

The environment should then reward or punish that behaviour in a recurring loop.

Whenever possible, remember abstract ideas through their consequences rather than by making them physically appear.

---

# Discover the rule

Spend most of your effort discovering ONE simple recurring rule.

This rule is the mnemonic.

Everything else merely illustrates it.

A good rule can usually be explained in one short sentence.

Do not begin by thinking about events.

Begin by asking:

- What always happens?
- Why does it always happen?
- What behaviour keeps repeating?
- What makes this actor behave differently because of the cue?
- How does this particular set repeatedly reinforce that behaviour?

The recurring rule should emerge naturally from the interaction between:

- the actor's personality, habits, strengths, weaknesses, and obsessions
- the cue
- the opportunities created by this set

If your explanation requires several sequential events, multiple mechanisms, or lots of environmental details, the rule is probably too complicated.

Simplify it.

---

# The cue

The cue should explain WHY the recurring rule exists.

The cue is not simply something that appears.

It should change the actor's behaviour or create the recurring conflict in a memorable way.

Whenever possible, build the mnemonic around one of the actor's defining characteristics rather than simply their appearance or abilities.

---

# The set

The set determines HOW the recurring rule plays out.

The same actor and cue placed into another set should naturally produce a different cartoon.

The environment should repeatedly cause, interrupt, reward, punish, or reset the actor.

Use the defining features of the set as the mechanism that makes the loop work.

---

# Keep it simple

Avoid explaining mechanisms.

Avoid unnecessary lore.

Avoid realistic justification.

Avoid multiple independent ideas.

If removing something makes the mnemonic simpler without making it weaker, remove it.

Prefer one unforgettable gag over five clever ideas.


---

## premise

This is the creative heart of the mnemonic.

Spend most of your effort discovering a strong premise.

Everything else should simply communicate this premise.

Do NOT describe one particular scene.

Do NOT narrate events.

Do NOT explain the mechanism.

Instead, identify the one recurring rule that makes the mnemonic memorable.

The premise should describe the recurring interaction between the actor, the cue, and this particular set.

A good premise should be simple enough that someone immediately understands the gag.

Everything else in the output should merely illustrate this rule.

---

## story

The story illustrates the premise.

Its purpose is to transform the abstract recurring rule into one concrete iteration of the loop.

Naturally answer practical questions such as:

- What is the actor doing?
- Which feature of the set participates?
- How does the loop reset?

Do not invent additional ideas beyond the premise.

The story should simply demonstrate the recurring rule once.

Use 2–4 short sentences.

---

## hook

Write a concise retrieval cue.

Compress the premise into a single memorable sentence.

Mention the cue exactly once, wrapped in \`==...==\`.

Only mention the location or set if it genuinely helps distinguish this mnemonic from another one.

---

## beats

The beats exist only to illustrate the story.

Describe only the minimum sequence of actions needed for someone to immediately understand the recurring rule.

Each beat should fit naturally into a single comic panel.

Use only 2–4 beats.

Every beat should clearly support the same central gag.

Avoid decorative details, explanations, artistic descriptions, colours, lighting, camera directions, or unnecessary worldbuilding.

<input>
{{ input }}
</input>
`;

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        input: JSON.stringify(input, null, 2),
      }),
    },
  ];

  return {
    messages,
    schema: pronunciationHintOutputSchema,
    model: `gpt-5.5`,
    reasoningEffort: `medium`,
  };
}

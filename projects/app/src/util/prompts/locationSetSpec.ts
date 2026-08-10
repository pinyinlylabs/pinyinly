import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { locationSetSpecSchema } from "@/data/model";
import type { LocationSetKey, LocationSpec } from "@/data/model";
import { z } from "zod";
import omit from "lodash/omit";

const locationSetSpecDetailSchema = locationSetSpecSchema
  .omit({
    set: true,
  })
  .required({
    purpose: true,
  })
  .extend({
    props: z.array(z.string()),
    designRules: z.array(z.string()),
    canonicalFraming: z.string(),
  })
  .strict()
  .meta({ title: `locationSetSpecDetailSchema` });

export type LocationSetSpecDetailSchemaType = z.infer<
  typeof locationSetSpecDetailSchema
>;

export const buildLocationSetSpecPrompt = (input: {
  locationSpec: LocationSpec;
  setKey: LocationSetKey;
}): ChatPrompt<typeof locationSetSpecDetailSchema> => {
  const systemTemplate = `
You are an expert production designer creating the canonical specification for a recurring set within a fictional location.

The supplied location specification defines the identity of the location.

Your task is not to redesign the location.

Your task is to define one canonical recurring set that naturally belongs within it.

This specification will be used by artists and image-generation models to create hundreds of illustrations over many years.

Future illustrations should feel like different visits to the same set.

Whenever originality and recognisability disagree, choose recognisability.

Whenever realism and recognisability disagree, choose recognisability.

Do not invent lore, history, proper nouns, named landmarks, or backstory.

Prefer timeless, widely recognised interpretations over clever or unusual ones.

{{ goalSection }}

## Design rules

Write concise recurring visual rules that preserve the identity of this set.

Every rule must describe something directly observable in an illustration.

Prefer visual outcomes over implementation details or abstract intentions.

Prefer large recurring ideas over small decorative details.

Every rule should introduce one new visual idea.

Merge redundant rules.

Avoid unnecessary specificity.

The rules should reinforce both the identity of the supplied location and the identity of this particular set.

## Props

Props are the recurring visual vocabulary available within the set.

A prop may be:

- a movable object
- a fixed architectural feature
- a mechanism
- a fixture
- a terrain feature
- an environmental element
- a decorative object with strong mnemonic value

Choose props that make the set easier to recognise, imagine, and use in memorable scenes.

Prefer objects or features that an actor could notice, touch, carry, climb, activate, break, avoid, hide behind, search through, or otherwise interact with.

Props should be concrete and visually distinct.

Prefer iconic, widely associated elements over generic clutter.

Good props reinforce the identity of this particular set rather than merely the overall location.

Do not list vague qualities such as darkness, danger, grandeur, mystery, atmosphere, or age as props.

Do not list interchangeable background clutter unless it meaningfully supports recognition.

Props are optional recurring ingredients, not a checklist. An illustration may use only the subset most useful for a particular scene.

Avoid making every prop mandatory in every illustration.

## Canonical framing

Describe the canonical view of this set.

State:

- where the viewer stands
- what they look toward
- what dominates the composition
- which location recognition hooks should remain visible when naturally possible
- which set-specific props should remain visible when they strengthen recognition

The framing should make the set immediately recognisable.

Avoid viewpoints that make the set resemble another set within the same location.

## Set specification

For the set:

- write a short purpose phrase that explains how this set is used in this location
- write concise observable design rules
- list 5-10 iconic props
- define a canonical framing

Before finalising, silently check:

- the set is the most natural realisation for the supplied location
- it clearly belongs to the supplied location
- it is visually distinct from the other canonical sets
- every rule is observable
- every rule adds a distinct visual idea
- redundant rules have been merged
- props are concrete, visually useful, and associated with the set
- props provide useful material for memorable scenes without becoming mandatory clutter
- another artist could recreate essentially the same set from this specification

Generate the canonical set specification for the supplied location.

<input>
{{ input }}
</input>
`.trim();

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        input: JSON.stringify({
          locationSpec: omit(input.locationSpec, [`sets`]),
        }),
        goalSection: goalSectionByKey[input.setKey],
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    schema: locationSetSpecDetailSchema,
  };
};

const goalSectionByKey: Record<LocationSetKey, string> = {
  entrance: `
## Goal

Design the canonical entrance for the supplied location.

The entrance is the threshold between outside and inside.

Choose the place visitors would naturally recognise as arriving.

Prefer gates, foyers, docks, cave mouths, temple entrances, lobby doors, hangar doors...

It should immediately establish the identity of the location.
`,
  inside: `
## Goal

Design the canonical inside of the supplied location.

The inside is the location's primary interior destination.

Choose the interior space that people would most naturally picture when they imagine being inside this location.

This should usually be the location's defining room, chamber, hall, arena, floor, sanctuary, workshop, gallery, cave, or other principal interior space.

Imagine showing someone a single illustration of the location's interior.

The inside should be the image they would expect to see.

Choose the destination rather than a circulation space.

Avoid entrances, staircases, basements, bathrooms, hidden rooms, corridors, or other transitional or secondary spaces unless they genuinely define the location.

The inside should immediately communicate the identity of the location and provide the richest setting for memorable scenes.
`,
  basement: `
## Goal

Design the canonical basement for the supplied location.

The basement is the location's primary lower destination.

Choose the lower space people would most naturally expect to exist beneath or below this location.

Prefer recognisable lower spaces such as:

- cellar
- storage room
- crypt
- dungeon
- service space
- utility level
- cave
- lower deck
- underground chamber

The basement should feel like a destination rather than a corridor.

Avoid making it resemble the staircase or hidden closet.
`,
  bathroom: `
## Goal

Design the canonical bathroom for the supplied location.

The bathroom should feel like the washroom people would naturally imagine belonging within this location.

Interpret "bathroom" broadly according to the location. It may be a washroom, bathhouse, lavatory, privy, washing chamber, changing room, purification room, or another recognisable place for washing or sanitation.

Choose whichever is the simplest and most recognisable fit for the supplied location.

Because bathrooms share many common fixtures across different locations, make a deliberate effort to give this bathroom a distinctive identity.

The bathroom should contain one memorable defining idea that naturally grows out of the location itself.

Prefer ideas that are slightly unexpected, delightfully fitting, or mildly exaggerated rather than completely ordinary.

The defining idea should make someone naturally think, "Of course this location's bathroom would be like that."

Do not merely recreate a generic modern bathroom using the location's materials.

Instead, reinterpret familiar bathroom functions in ways that naturally belong within the supplied location.

The room should have its own distinct character, shaped by how the location is used, maintained, inhabited, or remembered.

It may be pristine, neglected, luxurious, improvised, ceremonial, industrial, rustic, ancient, restored, or another character that naturally fits the location.

The room should feel lived in rather than staged.

Even when empty, it should suggest an everyday activity, recurring habit, or small ongoing story that makes it feel memorable.

A visitor should immediately be able to imagine the kinds of people who use this bathroom and how they use it.

The bathroom should feel like a destination rather than a utility room.

Avoid making it resemble the Back Room or Basement.

A visitor should be able to describe this bathroom in one memorable sentence after seeing it once.
`,
  backRoom: `
## Goal

Design the canonical back room for the supplied location.

The back room is a secondary space tucked away behind or beyond the location's main public areas.

Choose the behind-the-scenes room that people would most naturally expect to exist within this location.

This may be a storage room, staff room, office, workshop, preparation room, equipment room, control room, maintenance room, utility room, archive, supply room, or another recognisable support space appropriate for the location.

Choose whichever is the simplest and most recognisable fit for the supplied location.

The back room should feel like a destination rather than a corridor or passage.

It should clearly belong to the location while remaining visually distinct from the Inside, Basement, Staircase, Entrance, and Bathroom.

The back room should feel more private, functional, or specialised than the main interior, as though visitors would rarely enter it.

Avoid making it merely a smaller version of the main room.

The back room should provide interesting props, equipment, or workspaces that create memorable scene opportunities while remaining recognisably part of the same location.
`,
  stairway: `
## Goal

Design the canonical stairway for the supplied location.

The stairway is the primary upward route.

It should clearly communicate vertical movement.

Prefer recognisable stairs, ramps, catwalks, ladders, elevators, escalators...

It should connect naturally toward the upper parts of the location without becoming the destination itself.
`,
  staircase: `
## Goal

Design the canonical staircase for the supplied location.

The staircase is the primary upward route.

It should clearly communicate vertical movement.

Prefer recognisable stairs, ramps, catwalks, ladders, elevators, escalators...

It should connect naturally toward the upper parts of the location without becoming the destination itself.
`,
  hiddenCloset: `
## Goal

Design the canonical hidden closet.

It should be a small concealed space.

Prefer hidden cupboards, maintenance closets, broom cupboards, concealed alcoves, secret storage rooms...

It should feel cramped, tucked away and easily overlooked.
`,
  /** @deprecated */
  arrival: `
## Goal ("Arrival")

Where visitors first enter or reach the location itself.

Choose a recognisable threshold, entrance area, gate, doorway, platform, dock, or immediately adjoining space.

Do not choose a distant approach route when a stronger entrance space exists.
  `,
  /** @deprecated */
  heart: `
## Goal ("Heart")

The highlight of visiting the location.

Imagine giving a first-time visitor a tour.

If you could show them only one destination before they had to leave, where would you take them?

Choose the destination visitors are most excited to reach and most enjoy remembering.

Do not choose a circulation hub merely because it connects the rest of the environment or provides the best overview.

Choose the destination, not the hub.
  `,
  /** @deprecated */
  below: `
## Goal ("Below")

The canonical lower part of the location.

Choose a distinct lower destination rather than merely another corridor, stairway, or transitional route.

Prefer a memorable room, chamber, level, enclosed area, hidden space, or environmental feature that clearly differs from the Ascent.
  `,
  /** @deprecated */
  ascent: `
## Goal ("Ascent")

The canonical route upward within the location.

Prefer staircases, ramps, catwalks, ladders, elevators, escalators, or other persistent architectural features that connect the lower parts of the location to its highest destination.

Do not choose an exterior approach unless the ascent itself is one of the location's defining and most recognisable features.

The Ascent should read primarily as movement upward, while the Below should read as a destination.
  `,
  /** @deprecated */
  summit: `
## Goal ("Summit")

The highest significant destination and the natural reward for completing the ascent.
  `,
};

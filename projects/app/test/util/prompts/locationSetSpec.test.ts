import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot, makeLocationSpec } from "./helpers";
import { buildLocationSetSpecPrompt } from "#util/prompts/locationSetSpec.js";

describe(`buildLocationSetSpecPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildLocationSetSpecPrompt({
      locationSpec: makeLocationSpec(`Pirate ship`),
      setKey: `bathroom`,
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "messages": "
      =====================
       SYSTEM MESSAGE
      ---------------------
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

      ## Output

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
      {"locationSpec":{"location":"Pirate ship"}}
      </input>
      =====================
      ",
        "model": "gpt-5.4",
        "reasoningEffort": "low",
        "schema": {
          "name": "locationSetSpecDetailSchema",
          "schema": {
            "additionalProperties": false,
            "properties": {
              "canonicalFraming": {
                "type": "string",
              },
              "designRules": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
              "name": {
                "type": "string",
              },
              "props": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
            },
            "required": [
              "name",
              "props",
              "designRules",
              "canonicalFraming",
            ],
            "title": "locationSetSpecDetailSchema",
            "type": "object",
          },
          "type": "json_schema",
        },
      }
    `);
  });
});

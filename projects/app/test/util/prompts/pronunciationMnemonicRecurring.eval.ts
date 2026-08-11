import { describeEval } from "vitest-evals";
import { buildPronunciationMnemonicRecurringPrompt } from "#util/prompts/pronunciationMnemonicRecurring.js";
import { createResponsePromptHarness } from "./eval";
import type { ActorSpec, LocationSpec } from "#data/model.js";
import { getLocationSetName } from "#data/userSettings.js";
import { regexpForMention } from "./helpers.ts";
import { expect } from "vitest";

const foxActorSpec: ActorSpec = {
  nickname: `Sly Fox`,
  species: `Fox`,
  gender: `male`,
  identity: `Fox`,
  identityAnchor: `Sly trickster fox.`,
  coreTraits: [`clever`, `sneaky`, `playful`, `opportunistic`, `smug`],
  obsession: `Proving that they are the cleverest creature around.`,
  signatureAbility: `Outsmarting others with sneaky tricks, fast thinking, and clever shortcuts.`,
  storyRole: `Creates mischief and moves the story forward by tricking, sneaking, or cleverly escaping.`,
  always: [
    `looks for the easiest, smartest way to get what they want`,
    `sneaks instead of charging straight in`,
    `wears a smug grin when a plan is working`,
    `tests others to see if they can be fooled`,
  ],
  never: [
    `uses brute force as a first solution`,
    `plays fair when a clever trick would work`,
    `acts clumsy on purpose for long`,
    `admits they were outsmarted easily`,
  ],
  likes: [
    `easy food`,
    `shortcuts`,
    `secrets`,
    `winning by wit`,
    `sneaking into places`,
  ],
  dislikes: [
    `traps`,
    `being embarrassed`,
    `loud blundering behavior`,
    `being called ordinary`,
  ],
  defaultMood: `alert and smug`,
  signatureExpression: `A sly sideways grin with narrowed eyes.`,
  weakness: `Overconfidence—they love clever tricks so much that they often underestimate simple problems or fall into their own schemes.`,
};
const engineRoomLocationSpec: LocationSpec = {
  location: `Engine room`,
  designRules: [
    `The space is a tall industrial chamber organized around one dominant central engine or turbine.`,
    `Open steel catwalks ring the machinery on several levels and make the room read vertically.`,
    `Dense pipes, ducts, and valve wheels cover the walls, ceiling, and machine housings.`,
    `Most walking surfaces are metal grating so lower machinery and shafts remain visible through the floor.`,
    `Stairs and ladders are narrow, steep, and exposed rather than hidden inside walls.`,
    `Surfaces are dark metal with heat staining, oil, soot, and heavy wear.`,
    `Small control panels, analog gauges, and warning lights cluster near railings and service points.`,
    `Lighting comes from harsh industrial fixtures and machine glow, leaving deep shadowed recesses.`,
  ],
  recognitionHooks: [
    `Towering central engine`,
    `Multilevel catwalks`,
    `Pipes and valve wheels`,
    `Grated floors over depth`,
    `Warning lights and steam`,
  ],
  sets: {
    bathroom: {
      purpose: `A hard-used engine-room washroom where crew scrub off oil, soot, and heat before returning to the catwalks.`,
      canonicalFraming: `View from the washroom entrance or from one end of the room, looking diagonally across the long wash trough toward the shower manifold wall. The communal pipe-fed fixtures should dominate the composition, with the trench drain and grated floor leading the eye through the space. When naturally possible, keep a glimpse of the engine room connection visible through an open hatch, window, or railing beyond, so pipes, warning lights, steam, or a hint of catwalk depth confirm the location. Include the gauges, valves, lockers, and bolted bench when they strengthen recognition.`,
      designRules: [
        `The bathroom is an industrial washroom directly attached to the engine room, with exposed pipes, steel walls, and grated flooring instead of domestic finishes.`,
        `Its defining feature is a long communal wash trough and shower line built from engine-room pipework, making hygiene fixtures look like a repurposed part of the machinery.`,
        `At least one wall is crowded with valves, gauges, and pipe branches feeding the sinks or showers, so washing visibly depends on the same systems as the engine room.`,
        `Runoff collects in a trench drain or grated gutter, often with a little steam or dampness, making the room feel wet, hot, and in constant use.`,
        `Changing and cleanup are handled with bolted metal benches, exposed lockers or hooks, and hanging towels or work gear rather than private cabinetry.`,
        `Lighting is harsh and industrial, reflecting off wet dark metal and leaving corners sooty or shadowed rather than clean and bright.`,
        `Surfaces show heavy use: oil smears near hand height, rust streaks, mineral deposits around taps, and worn metal where boots and hands repeatedly scrape.`,
      ],
      props: [
        `overhead pipe-fed shower manifold with pull chains`,
        `long grated wash trough with multiple heavy metal taps`,
        `wall of exposed lockers and hanging work towels`,
        `slatted changing bench bolted to the floor`,
        `floor drain trench with steaming runoff`,
        `small cloudy mirror riveted between pipes`,
        `soap dispensers or scrub brushes clipped to the trough`,
        `red emergency eye-wash or deluge lever`,
        `analog pressure gauges mounted above the wash fixtures`,
      ],
    },
  },
};

const promptCases: Parameters<
  typeof buildPronunciationMnemonicRecurringPrompt
>[0][] = [
  {
    locationSpec: engineRoomLocationSpec,
    locationSetKey: `bathroom`,
    actorSpec: foxActorSpec,
    cue: { label: `portion` },
  },
];

describeEval(
  `buildPronunciationMnemonicRecurringPrompt eval`,
  {
    harness: createResponsePromptHarness(
      buildPronunciationMnemonicRecurringPrompt,
    ),
  },
  (it) => {
    it.for(promptCases)(
      `$locationSpec.location + $locationSetKey + $cue.label`,
      async (spec, { run }) => {
        const result = await run(spec);

        const locationName = spec.locationSpec.location;
        expect
          .soft(
            result.output.hook,
            `hook should mention location ${locationName}`,
          )
          .toMatch(regexpForMention(locationName));

        const locationSetName = getLocationSetName(spec.locationSetKey);
        expect
          .soft(
            result.output.hook,
            `hook should mention location set ${locationSetName}`,
          )
          .toMatch(regexpForMention(locationSetName));

        const actorName = spec.actorSpec.nickname;
        expect
          .soft(result.output.hook, `hook should mention actor ${actorName}`)
          .toMatch(regexpForMention(actorName));
      },
    );
  },
);

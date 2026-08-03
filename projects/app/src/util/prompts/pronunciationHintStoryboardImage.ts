import { renderPromptTemplate } from "@/util/prompts/shared";
import { tradingCardSystemTemplate } from "@/util/prompts/imageStyles";
import type { ImagePrompt } from "@/server/lib/gemini";
import type {
  ActorSpec,
  AssetId,
  LocationSetSpec,
  LocationSpec,
  PronunciationHintMnemonicSpec,
} from "@/data/model";

export function buildPronunciationHintStoryboardImagePrompt(input: {
  actor: ActorSpec;
  actorModelSheet: AssetId;
  location: LocationSpec;
  locationSet: LocationSetSpec;
  locationSetImage: AssetId;
  mnemonicSpec: Required<PronunciationHintMnemonicSpec>;
}): ImagePrompt {
  const userTemplate = `
You are an animation storyboard artist creating a mnemonic scene.

You will be given:

- actor reference image(s)
- location reference image(s)
- a mnemonic scene with a premise, story, hook, and ordered beats

Create exactly one finished image that tells the complete scene as a sequence of illustrated panels.

## Sequence

Use the beats as story guidance, not as a rigid panel list.

Choose the number, arrangement, and relative size of panels that best communicates the scene. You may combine related beats, expand an important moment, or include a useful reaction.

Keep the story’s order, cause and effect, and central mnemonic association clear.

## Full-Bleed Panel Layout

The final output must be full bleed: the illustrated panels must extend all the way to every outer edge of the image.

The panels must tessellate the entire rectangular canvas, collectively covering 100% of it.

There must be:

- zero outer margin
- zero white border
- zero page background
- zero blank gutter
- zero padding around the panel arrangement

Do not place smaller panels inside a larger canvas.

Do not show any background behind or around the panels.

Crop the final image exactly to the outside edges of the panel arrangement.

Adjacent panels must touch directly. They may be divided by a thin black separator line, but not by empty space. A separator must be a painted black line, not a white or transparent gap.

Every pixel of the final image must be either:

1. illustrated scene artwork, or
2. a thin black line separating adjacent panels.

The artwork must touch the top, bottom, left, and right edges of the output image.

## No Text

Do not include any text anywhere in the image.

No titles, headings, captions, narration, labels, speech bubbles, dialogue, frame numbers, sound effects, or production notes.

The written scene is directing information only. Tell the story entirely through imagery, action, expression, composition, and visual cause and effect.

## Actor Consistency

Treat the actor references as the exact canonical design.

Preserve the actor’s anatomy, silhouette, proportions, colours, textures, clothing, appendages, and distinctive features throughout every panel.

Do not redesign, humanise, anthropomorphise, or add features that are absent from the references.

In particular, do not invent eyes, a mouth, a face, limbs, clothing, or accessories. If the reference actor lacks a feature, it must remain absent.

Make the actor expressive using only its existing design—for example through posture, tilt, movement, squash and stretch, silhouette, interaction, and camera framing.

## Location Consistency

Treat the location references as the canonical environment.

Preserve its architecture, materials, landmarks, atmosphere, and recognition hooks. Every panel should clearly take place in the same established location, even when shown from different camera angles.

## Visual Direction

Think like a story artist for a high-quality animated film.

Use expressive staging, clear poses, cinematic camera choices, visual humour, and strong readability. Vary shot size and viewpoint when it helps the sequence.

Make the cue’s mnemonic mechanism the visual focus. Avoid decorative detail that obscures the important action.

## Output

Return exactly one image containing the complete panel sequence.

The canvas should contain only edge-to-edge artwork and, where needed, thin black separators.

<input>
{{ input }}
</input>
`;

  const systemInstruction = renderPromptTemplate(tradingCardSystemTemplate, {});

  return {
    model: `gemini-3.1-flash-lite-image`,
    aspectRatio: `5:4`,
    resolution: `1K`,
    systemInstruction,
    messages: [
      {
        role: `user`,
        kind: `text`,
        content: renderPromptTemplate(userTemplate, {
          input: JSON.stringify({
            actor: input.actor,
            location: {
              location: input.location.location,
              set: input.locationSet,
            },
            scene: input.mnemonicSpec,
          }),
        }),
      },
      {
        role: `user`,
        kind: `text`,
        content: `Here's the actor's model sheet:`,
      },
      { role: `user`, kind: `asset`, assetId: input.actorModelSheet },
      {
        role: `user`,
        kind: `text`,
        content: `Here's a sketch of the location:`,
      },
      { role: `user`, kind: `asset`, assetId: input.locationSetImage },
    ],
    thinkingLevel: `high`,
  };
}

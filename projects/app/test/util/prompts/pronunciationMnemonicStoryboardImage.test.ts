import { describe, expect, test } from "vitest";
import { buildPronunciationMnemonicStoryboardImagePrompt } from "#util/prompts/pronunciationMnemonicStoryboardImage.js";
import {
  makeActorSpec,
  fmtImagePromptForSnapshot,
  makeLocationSpecWithDetail,
} from "./helpers";
import type { AssetId } from "#data/model.js";

describe(`buildPronunciationMnemonicStoryboardImagePrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildPronunciationMnemonicStoryboardImagePrompt({
      locationSpec: makeLocationSpecWithDetail(`location`),
      locationSetKey: `arrival`,
      actorModelSheet: `sha256/xxx` as AssetId,
      locationSetImage: `sha256/yyy` as AssetId,
      actorSpec: makeActorSpec(`Ethan`),
      mnemonicSpec: {
        hook: `hook`,
        premise: `premise`,
        beats: [`beat1`, `beat2`],
      },
    });

    expect(fmtImagePromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "aspectRatio": "5:4",
        "messages": "
      =====================
       USER MESSAGE
      ---------------------
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
      {"location":{"name":"location","recognitionHooks":["mast","bow","anchor"],"designRules":["Keep the hull dominant in the composition."]},"locationSet":{"name":"arrival","purpose":"arrival purpose","props":["arrival prop"],"designRules":["arrival design rule"],"canonicalFraming":"arrival canonical framing"},"actor":{"nickname":"Ethan"},"scene":{"hook":"hook","premise":"premise","beats":["beat1","beat2"]}}
      </input>
      =====================



      =====================
       USER MESSAGE
      ---------------------
      Here's the actor's model sheet:
      =====================



      =====================
       USER MESSAGE
      ---------------------
      [ASSET: sha256/xxx]
      =====================



      =====================
       USER MESSAGE
      ---------------------
      Here's a sketch of the location:
      =====================



      =====================
       USER MESSAGE
      ---------------------
      [ASSET: sha256/yyy]
      =====================
      ",
        "model": "gemini-3.1-flash-lite-image",
        "resolution": "1K",
        "systemInstruction": "Style:

      - Trading card illustration style.
      - Clean, stylized illustration.
      - Timeless environment art.
      - One dominant focal point.
      - Strong silhouette and confident shapes.
      - Natural but slightly simplified color.
      - Restrained detail.
      - Real atmospheric depth without visual clutter.
      - Lighting should establish mood and direct attention to the focal point.
      - Background elements should support recognition without competing for attention.

      Avoid:

      - Photographic realism.
      - People unless they are inseparable from the location's identity.
      - Generic stock-art compositions.
      - Wide panoramic views.",
        "thinkingLevel": "high",
      }
    `);
  });
});

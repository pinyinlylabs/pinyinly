import { buildActorIdentityImagePrompt } from "#util/prompts/actorIdentityImage.ts";
import { describe, expect, test } from "vitest";
import { fmtImagePromptForSnapshot } from "./helpers";
import type { AssetId } from "#data/model.js";

describe(
  `buildActorIdentityImagePrompt` satisfies HasNameOf<
    typeof buildActorIdentityImagePrompt
  >,
  () => {
    test(`snapshot`, () => {
      const prompt = buildActorIdentityImagePrompt({
        modelSheet: `xxx` as AssetId,
      });

      expect(fmtImagePromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "aspectRatio": "1:1",
          "messages": "
        =====================
         USER MESSAGE
        ---------------------
        [ASSET: xxx]
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Create a new standalone profile portrait of the actor shown in the supplied actor model sheet.

        This is an **identity-matching task**, not a creative design task.

        The supplied actor model sheet is **not** the desired output. It is a design reference whose only purpose is to establish the actor's canonical appearance. The multiple drawings, poses, and viewing angles all depict the same actor.

        Your first task is to identify the single canonical actor represented by the actor model sheet.

        Ignore the actor model sheet's layout, page design, framing, spacing, arrangement, number of drawings, and composition. Do not preserve or imitate any of these aspects.

        Your second task is to create an entirely **new image** containing **exactly one drawing of exactly one instance of that actor**.

        Do **not** recreate, edit, crop, trace, or modify the actor model sheet itself.

        The following outputs are incorrect:

        - reproducing the actor model sheet
        - creating a turnaround sheet
        - creating a collage or montage
        - showing multiple poses or expressions
        - showing multiple copies of the actor
        - placing miniature versions of the actor anywhere in the image
        - editing or cropping the supplied actor model sheet

        Instead, create a completely new composition showing a single portrait of the actor.

        Copy the actor's appearance faithfully from the actor model sheet. Preserve the exact proportions, anatomy, silhouette, markings, hairstyle, clothing, accessories, facial features, expression, body language, and every other identifying characteristic.

        The actor's colours are part of their identity and must be copied faithfully. Match the hue, saturation, brightness, colour placement, skin tone, hair, fur, clothing, eyes, markings, outlines, and every other visible colour as closely as possible. Treat any change to the colour palette as an error. If uncertain, prefer matching the actor model sheet exactly rather than inventing or improving the colours.

        Compose the portrait from approximately the chest or waist upward. The actor should fill most of the frame and face generally toward the viewer with a slight 3/4 angle, making eye contact where appropriate.

        Choose a relaxed, neutral pose that reflects the actor's default personality rather than depicting a story or action scene. Use the actor's canonical expression and body language.

        Match the line work, colouring method, shading, rendering quality, and artistic style of the actor model sheet while creating a completely new composition.

        Use a plain solid background. Do not include scenery, props, text, labels, borders, logos, decorative graphics, shadows, framing devices, or any additional visual elements.

        The finished image should resemble the official recurring profile portrait of the actor. It must be immediately recognisable at small sizes and must contain exactly one instance of the actor.
        =====================
        ",
          "model": "gemini-3.1-flash-lite-image",
          "resolution": "1K",
          "thinkingLevel": "minimal",
        }
      `);
    });
  },
);

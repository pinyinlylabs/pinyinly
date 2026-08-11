import { buildActorModelSheetImagePrompt } from "#util/prompts/actorModelSheetImage.ts";
import { describe, expect, test } from "vitest";
import { fmtImagePromptForSnapshot, makeActorSpec } from "./helpers";

describe(
  `buildActorModelSheetImagePrompt` satisfies HasNameOf<
    typeof buildActorModelSheetImagePrompt
  >,
  () => {
    test(`snapshot`, () => {
      const prompt = buildActorModelSheetImagePrompt({
        actorSpec: makeActorSpec(`Yeti`),
      });

      expect(fmtImagePromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "aspectRatio": "1:1",
          "messages": "
        =====================
         USER MESSAGE
        ---------------------
        Create a single canonical character reference sheet for this character.

        The entire deliverable must be a single image containing multiple drawings of exactly the same character. Do not produce multiple separate images or alternative character designs.

        The purpose of this sheet is to act as the canonical visual reference for future illustrations of this character. Every drawing should reinforce the same identity so future artwork remains visually consistent.

        Show the character from the essential reference angles needed to establish their design, including a front view, a 3/4 front view, a side view, and a back view. Include 4 additional drawings that demonstrate the character's natural body language and signature looks.

        Maintain identical proportions, silhouette, colours, markings, anatomy, clothing, and distinctive features across every drawing. Every view must clearly depict the same individual. Do not redesign, reinterpret, exaggerate, or simplify the character between drawings.

        Present everything on a solid background with no scenery, props, captions, labels, titles, measurements, arrows, logos, signatures, speech bubbles, symbols, watermarks, borders, or graphic design elements. Do not include any text whatsoever.

        Arrange the drawings efficiently so each one is as large and interpretable as possible while remaining easy to compare between views. Fill the canvas efficiently and avoid unnecessary empty space.

        The finished image should resemble a professional animator's imaginary character reference sheet whose purpose is to establish the character's canonical design for all future artwork.

        <input>
        {
          "actor": {
            "nickname": "Yeti"
          }
        }
        </input>
        =====================



        =====================
         USER MESSAGE
        ---------------------
        [ASSET: sha256/xPxit0gONs2W-yd-I82cUfQy1mZ1IyVxFUksrPZvTSY]
        =====================



        =====================
         USER MESSAGE
        ---------------------
        This is image is another character/scene from the animation, so match the artistic style of this. Use the style from this image, but base the content from the spec provided at the start. Colorize the final image.
        =====================
        ",
          "model": "gemini-3.1-flash-image",
          "resolution": "1K",
          "thinkingLevel": "high",
        }
      `);
    });
  },
);

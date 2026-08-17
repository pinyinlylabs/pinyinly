import { renderPromptTemplate } from "@/util/prompts/shared";
import type { ImagePrompt } from "@/server/lib/gemini";
import type { ActorSpec, AssetId } from "@/data/model";

export function buildActorModelSheetImagePrompt(input: {
  actorSpec: ActorSpec;
}): ImagePrompt {
  const userTemplate = `
Create a single canonical character reference sheet for this character.

The entire deliverable must be a single image containing multiple drawings of exactly the same character. Do not produce multiple separate images or alternative character designs.

The purpose of this sheet is to act as the canonical visual reference for future illustrations of this character. Every drawing should reinforce the same identity so future artwork remains visually consistent.

Show the character from the essential reference angles needed to establish their design, including a front view, a 3/4 front view, a side view, and a back view. Include 4 additional drawings that demonstrate the character's natural body language and signature looks.

Maintain identical proportions, silhouette, colours, markings, anatomy, clothing, and distinctive features across every drawing. Every view must clearly depict the same individual. Do not redesign, reinterpret, exaggerate, or simplify the character between drawings.

Present everything on a solid background with no scenery, props, captions, labels, titles, measurements, arrows, logos, signatures, speech bubbles, symbols, watermarks, borders, or graphic design elements. Do not include any text whatsoever.

Arrange the drawings efficiently so each one is as large and interpretable as possible while remaining easy to compare between views. Fill the canvas efficiently and avoid unnecessary empty space.

The finished image should resemble a professional animator's imaginary character reference sheet whose purpose is to establish the character's canonical design for all future artwork.

<input>
{{ input }}
</input>
`;

  const variables = {
    input: JSON.stringify({ actor: input.actorSpec }, null, 2),
  };

  const userPrompt = renderPromptTemplate(userTemplate, variables);

  return {
    // Using flash-image instead of flash-lite-image seems to produce more
    // character expression/detail/realism, and since this is the model sheet
    // that will guide all future artwork, we want it to be as high quality as
    // possible. flash-image also does a better job at not putting text labels
    // into the image.
    model: `gemini-3.1-flash-image`,
    aspectRatio: `1:1`,
    resolution: `1K`,
    thinkingLevel: `high`,
    messages: [
      { role: `user`, kind: `text`, content: userPrompt },
      {
        role: `user`,
        kind: `asset`,
        // Make sure this is a grayscale image, so that the model doesn't bias
        // the color palette of the final image based on the reference image.
        assetId:
          `sha256/xPxit0gONs2W-yd-I82cUfQy1mZ1IyVxFUksrPZvTSY` as AssetId,
      },
      {
        role: `user`,
        kind: `text`,
        content: `This is image is another character/scene from the animation, so match the artistic style of this. Use the style from this image, but base the content from the spec provided at the start. Colorize the final image.`,
      },
    ],
  };
}

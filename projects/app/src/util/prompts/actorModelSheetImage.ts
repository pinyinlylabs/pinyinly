import { renderPromptTemplate } from "@/util/prompts/shared";
import type { ImagePrompt } from "@/server/lib/gemini";
import type { ActorSpec } from "@/data/model";

export function buildActorModelSheetImagePrompt(input: {
  actorSpec: ActorSpec;
}): ImagePrompt {
  const userTemplate = `
Create a single canonical character reference sheet for this character.

The entire deliverable must be a single image containing multiple drawings of exactly the same character. Do not produce multiple separate images or alternative character designs.

The purpose of this sheet is to act as the canonical visual reference for future AI-generated illustrations of this character. Every drawing should reinforce the same identity so future artwork remains visually consistent.

Show the character from the essential reference angles needed to establish their design, including a front view, a 3/4 front view, a side view, and a back view. Include one or two additional drawings that demonstrate the character's natural body language and signature facial expression.

Maintain identical proportions, silhouette, colours, markings, anatomy, clothing, and distinctive features across every drawing. Every view must clearly depict the same individual. Do not redesign, reinterpret, exaggerate, or simplify the character between drawings.

Preserve the supplied design faithfully. Do not invent facial features, accessories, clothing details, textures, markings, or decorations that are not explicitly present in the reference or description.

Render the character using clean line art with simple flat colours only. Avoid gradients, dramatic lighting, shadows, painterly rendering, realistic fur rendering, heavy textures, atmospheric effects, or cinematic styling. The goal is to define the character's design rather than produce a finished illustration.

Present everything on a plain white background with no scenery, props, captions, labels, titles, measurements, arrows, logos, signatures, speech bubbles, symbols, watermarks, borders, or graphic design elements. Do not include any text whatsoever.

Arrange the drawings efficiently so each one is as large and readable as possible while remaining easy to compare between views. Fill the canvas efficiently and avoid unnecessary empty space.

The finished image should resemble an official animation studio character reference sheet whose purpose is to establish the character's canonical design for all future artwork.

<input>
{{ input }}
</input>
`;

  const variables = {
    input: JSON.stringify({ actor: input.actorSpec }, null, 2),
  };

  const userPrompt = renderPromptTemplate(userTemplate, variables);

  return {
    model: `gemini-3.1-flash-image`,
    aspectRatio: `1:1`,
    resolution: `1K`,
    messages: [{ role: `user`, kind: `text`, content: userPrompt }],
  };
}

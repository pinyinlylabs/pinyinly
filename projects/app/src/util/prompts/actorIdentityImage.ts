import { renderPromptTemplate } from "@/util/prompts/shared";
import type { ImagePrompt } from "@/server/lib/gemini";
import type { AssetId } from "@/data/model";

export function buildActorIdentityImagePrompt(input: {
  modelSheet: AssetId;
}): ImagePrompt {
  const userTemplate = `
Create the canonical profile portrait for this character using the supplied character reference sheet as the authoritative source of truth.

The purpose of this image is to serve as the character's permanent identity portrait throughout the application. It should instantly communicate who the character is, even when displayed at small sizes.

Preserve the character's design exactly as shown in the reference sheet. Do not redesign, reinterpret, simplify, stylize, or invent any new features. Maintain the same proportions, colours, markings, anatomy, expression, hairstyle, clothing, and distinctive features.

Compose the portrait from roughly the waist or chest upward. The character should face generally toward the viewer with a slight 3/4 angle, making eye contact where appropriate. Choose a natural, relaxed pose that reflects the character's default personality without becoming an action scene.

The character should wear their canonical signature expression and body language from the reference sheet. The portrait should feel recognisable, and iconic.

The profile portrait should only include a single character, and one instance of it. Do not copy the entire reference sheet, or include multiple drawings of the character. Do not include any other characters, story actions, or narrative elements.

Use a solid background with no scenery, props, text, borders, logos, shadows, graphic elements, or decorative effects.

Render using the same style established by the character reference sheet.

The finished image should resemble the official profile portrait of the character and be suitable for use as a recurring avatar throughout the application.
`;

  const userPrompt = renderPromptTemplate(userTemplate, {});

  return {
    model: `gemini-3.1-flash-image`,
    aspectRatio: `1:1`,
    resolution: `1K`,
    messages: [
      { role: `user`, kind: `text`, content: userPrompt },
      {
        role: `user`,
        kind: `asset`,
        assetId: input.modelSheet,
      },
      {
        role: `user`,
        kind: `text`,
        content: `That's the reference sheet.`,
      },
    ],
  };
}

import { z } from "zod";
import { locationSpecSchema } from "@/util/prompts/location";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { animatorMemorySketchSystemTemplate } from "@/util/prompts/imageStyles";
import type { ImagePrompt } from "@/server/lib/gemini";
import { locationSetRoleSchema } from "@/data/model";

export const locationSetIdentityImagePromptInputSchema = z
  .object({
    input: z
      .object({
        locationSpec: locationSpecSchema,
        targetSet: locationSetRoleSchema,
      })
      .strict(),
  })
  .strict();

export type LocationSetIdentityImagePromptInputType = z.infer<
  typeof locationSetIdentityImagePromptInputSchema
>;

export function buildLocationSetIdentityImagePrompt(
  entry: LocationSetIdentityImagePromptInputType,
): ImagePrompt {
  const userTemplate = `
Create an image for one set from the supplied location specification.

Use the full location specification for global visual consistency.

Use only the selected targetSet for the scene content and canonical framing.

Do not blend in the framing, viewpoint, or defining setup of any other set.

Instructions:

- Preserve the location-wide recognition hooks and design rules where they are naturally visible.
- Follow the selected set's name, design rules, and canonical framing.
- Respect its avoidFraming rules.
- Do not invent a different set.
- Do not add characters or story actions.
- Do not reinterpret the selected set as another floor, room, or viewpoint.
- Let the system-level image style instructions control the rendering style.

<input>
{{ input }}
</input>
`;

  const variables = {
    input: JSON.stringify(entry.input, null, 2),
  };

  const userPrompt = renderPromptTemplate(userTemplate, variables);
  const systemInstruction = renderPromptTemplate(
    animatorMemorySketchSystemTemplate,
    variables,
  );

  return {
    model: `gemini-3.1-flash-lite-image`,
    aspectRatio: `5:4`,
    resolution: `1K`,
    systemInstruction,
    messages: [{ role: `user`, kind: `text`, content: userPrompt }],
  };
}

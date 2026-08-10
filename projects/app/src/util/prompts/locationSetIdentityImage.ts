import { renderPromptTemplate } from "@/util/prompts/shared";
import { animatorMemorySketchSystemTemplate } from "@/util/prompts/imageStyles";
import type { ImagePrompt } from "@/server/lib/gemini";
import type { LocationSetKey, LocationSpec } from "@/data/model";
import { invariant } from "@pinyinly/lib/invariant";
import omit from "lodash/omit";
import { getLocationSetKeyDisplayName } from "@/data/userSettings";

export function buildLocationSetIdentityImagePrompt(input: {
  locationSpec: LocationSpec;
  targetSet: LocationSetKey;
}): ImagePrompt {
  const userTemplate = `
Create an image for one set from the supplied location specification.

Use the full location specification for global visual consistency.

Use only the selected targetSet for the scene content and canonical framing.

Do not blend in the framing, viewpoint, or defining setup of any other set.

Instructions:

- Preserve the location-wide recognition hooks and design rules where they are naturally visible.
- Follow the selected set's name, purpose, design rules, and canonical framing.
- Respect its avoidFraming rules.
- Do not invent a different set.
- Do not add characters or story actions.
- Do not reinterpret the selected set as another floor, room, or viewpoint.
- Let the system-level image style instructions control the rendering style.

<input>
{{ input }}
</input>
`;

  const location = omit(input.locationSpec, [`sets`]);
  const locationSetSpec = input.locationSpec.sets?.[input.targetSet];
  invariant(
    locationSetSpec,
    `Location set "%s" not found in location spec.`,
    input.targetSet,
  );

  const variables = {
    input: JSON.stringify({
      location,
      locationSet: {
        name: getLocationSetKeyDisplayName(input.targetSet),
        ...omit(locationSetSpec, [`set`]),
      },
    }),
  };

  const userPrompt = renderPromptTemplate(userTemplate, variables);
  const systemInstruction = renderPromptTemplate(
    animatorMemorySketchSystemTemplate,
    {},
  );

  return {
    model: `gemini-3.1-flash-lite-image`,
    aspectRatio: `5:4`,
    resolution: `1K`,
    systemInstruction,
    messages: [{ role: `user`, kind: `text`, content: userPrompt }],
    thinkingLevel: `high`,
  };
}

import { tradingCardLocationPortraitSystemTemplate } from "@/util/prompts/imageStyles";
import { renderPromptTemplate } from "@/util/prompts/shared";
import type { ImagePrompt } from "@/server/lib/gemini";
import type { AssetId, LocationSpec } from "@/data/model";

export function buildLocationIdentityImagePrompt(entry: {
  input: {
    locationSpec: LocationSpec;
  };
}): ImagePrompt {
  const userTemplate = `
You are given a complete mnemonic location specification.

Your task is to create the canonical portrait of this location.

This image serves the same purpose as a person's profile photo or a trading card illustration, except for a place.

Whenever a learner sees this portrait, they should instantly think:

"Ah, that's the {{ locationName }}."

The portrait will be displayed as a square thumbnail throughout the application. It should remain recognizable when scaled down, but it is not a tiny icon or logo. It should feel like the definitive visual identity of the location.

Use the entire location specification as context, especially:

- the location name;
- recognition hooks;
- location-wide design rules;
- the proposed emblem concept, if present.

The individual sets are provided only as supporting context. Do not depict one particular set or viewpoint.

Artistic goal:

Capture the essence of the location, not a documentary view of it.

The portrait should evoke the place the same way a memorable trading card, game location, or storybook illustration evokes a world.

Someone familiar with the location should immediately recognize it from this portrait alone.

Composition:

- Choose a single, iconic composition that best represents the location.
- Do not try to show every important feature.
- Identify the strongest visual identity of the location and build the portrait around that.
- The composition should have one clear focal point.
- Background elements should reinforce the location without competing for attention.

Design principles:

- Represent the overall location rather than one particular set or mnemonic story.
- Prioritize recognizability over realism.
- Simplify unnecessary detail while preserving the character of the place.
- Include only elements that strengthen recognition.
- Every visible element should justify its presence.
- Avoid visual clutter.
- Avoid generic stock-art compositions.
- Avoid tiny details that disappear at thumbnail size.
- Avoid people unless they are an inseparable part of the location's identity.

Recognition test:

- Would someone familiar with this location recognize it immediately?
- Is there a stronger, simpler composition?
- Is there anything that can be removed without reducing recognition?
- Does this feel like the portrait of a place rather than an illustration of a scene?

The goal is not to document the location.

The goal is to create the single image that people will forever associate with this location.

<input>
{{ input }}
</input>
`;

  const variables = {
    locationName: entry.input.locationSpec.location,
    input: JSON.stringify(entry.input, null, 2),
  };

  const userPrompt = renderPromptTemplate(userTemplate, variables);
  const systemInstruction = renderPromptTemplate(
    tradingCardLocationPortraitSystemTemplate,
    variables,
  );

  return {
    model: `gemini-3.1-flash-lite-image`,
    aspectRatio: `1:1`,
    resolution: `1K`,
    systemInstruction,
    messages: [
      {
        role: `user`,
        kind: `asset`,
        assetId:
          `sha256/gWfpeVUB_w_w6j5uoF79d2kKhIx40r3KrOjCrU1NV-k` as AssetId,
      },
      {
        role: `user`,
        kind: `text`,
        content: `Copy the style of the previous image.`,
      },
      { role: `user`, kind: `text`, content: userPrompt },
    ],
  };
}

export const animatorMemorySketchSystemTemplate = `
You are drawing a memory, not an illustration.

The goal is to create the simplest possible image that fixes the identity of a place in memory.

Style:

- Loose animator location sketch.
- Clean black ink pen line drawing.
- Plain white paper background (#FFFFFF).
- No color.
- No solid fill.
- No pencil.
- No graphite.
- No shading.
- No water color.
- No thick marker pen.
- No paint.
- No marker.
- No digital rendering effects.
- No gradients.
- No gray values.
- No shadows.
- No crosshatching.
- No texture rendering.

Draw with confident, economical lines.

Describe form using outlines and only the minimum interior detail needed for recognition.

Leave large areas of the page completely white.

Simplify aggressively.

Prefer iconic shapes over realistic detail.

Every line should help answer: what place is this?

Avoid decorative detail that does not strengthen recognition.

The drawing should feel deliberately unfinished so the viewer completes the scene mentally.

It should resemble an animator's exploratory location sketch from a sketchbook, not finished concept art.

The viewer should recognize the place at a quick glance and be able to reconstruct it later from memory.
`.trim();

export const tradingCardLocationPortraitSystemTemplate = `
You are creating the canonical portrait of a place, not a documentary scene.

The image should feel like a polished trading card illustration or encyclopedia plate for a memorable fictional location.

Style:

- Clean, stylized illustration.
- Timeless environment art.
- Square composition that remains recognizable at thumbnail size.
- One dominant focal point.
- Strong silhouette and confident shapes.
- Natural but slightly simplified color.
- Restrained detail.
- Real atmospheric depth without visual clutter.
- Lighting should establish mood and direct attention to the focal point.
- Background elements should support recognition without competing for attention.

Avoid:

- Photographic realism.
- Text, labels, logos, symbols, or decorative borders.
- People unless they are inseparable from the location's identity.
- Generic stock-art compositions.
- Tiny details that disappear at thumbnail size.
- Wide panoramic views.
`.trim();

export const tradingCardSystemTemplate = `
Style:

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
- Wide panoramic views.
`.trim();

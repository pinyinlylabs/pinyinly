---
description:
  "Use when adding, replacing, subsetting, registering, or documenting app fonts. Covers font roles,
  fallback order, provenance records, and glyph coverage."
applyTo: "projects/app/src/assets/fonts/**,projects/app/src/client/ui/SplashScreen.tsx,projects/app/src/global.css"
---

# App fonts

The runtime `--font-sans` fallback order is defined in `projects/app/src/global.css`. The app
registers bundled faces in `projects/app/src/client/ui/SplashScreen.tsx`.

| Font                | Use                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| National Park       | First choice for the app sans-serif stack.                                                                             |
| MiSans, MiSans L3   | Additional fallback faces in the app stack.                                                                            |
| LXGW WenKai GB      | Handwritten Chinese fallback, using GB (Guóbiāo) character conventions rather than the Traditional Chinese TC variant. |
| Pinyinly Components | Project-specific component glyphs.                                                                                     |
| Noto Sans SC        | Used by font-coverage tests; not in the runtime font stack.                                                            |

Glyph coverage varies across platforms and font families, so the app bundles subsets from several
source fonts instead of relying on platform fonts or bundling each entire font. The `has font glyph`
test verifies every wiki character exists in at least one source font and its corresponding subset.
At runtime, the registered faces form the `--font-sans` fallback chain. Project-specific component
glyphs not supplied by the other fonts come from Pinyinly Components.

Keep each source font and its `.subset.ttf` file together. The `has font glyph` test reports the
`fonttools subset` command needed when a subset is missing glyphs.

Every vendored font directory must also contain a valid `pyly-vendor.json` provenance record. The
app validates these records with `projects/app/test/assets/vendor.test.ts`.

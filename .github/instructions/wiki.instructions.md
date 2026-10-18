---
applyTo: "projects/app/**"
---

# Wiki content structure

Wiki content lives in `src/client/wiki/`, in one directory for each character or word:

- `src/client/wiki/[hanzi]/meaning.mdx` - A human-readable explanation of the character or word.
- `src/client/wiki/[hanzi]/character.json` - Structured character data, including stroke graphics
  for single-character entries.

`meaning.mdx` is the explanatory wiki article, not the source of structured dictionary glosses or
other learning data. The app renders it as the wiki's “AI explanation” content and reuses it in the
new-word learning flow. Write it for learners: explain the relevant meanings and usage, and include
useful examples or grammar notes where appropriate. Use Markdown headings and formatting to make
longer explanations easy to scan; there is no required set of headings or frontmatter.

Examples: [`一/meaning.mdx`](../../projects/app/src/client/wiki/一/meaning.mdx) and
[`一会儿/meaning.mdx`](../../projects/app/src/client/wiki/一会儿/meaning.mdx).

Character `character.json` files may define an optional `exampleSentence` on each
`curriculumMeanings` entry. It contains `hanzi`, `pinyin`, and `translation`, and is shown with the
matching character meaning on the wiki page.

When modifying or adding wiki content:

1. Create or edit the appropriate `meaning.mdx` in the directory for that character or word.
2. Write valid Markdown/MDX; these files are compiled for display by the app.
3. Keep structured character or dictionary data in its corresponding data files, not in prose.

## Character SVG data

Each single-character wiki directory may also contain a `character.json` file. Its `svg` object
stores stroke graphics:

- `svg.strokes` is either a numeric stroke count or an array of SVG path `d` strings, one outline
  path per stroke in stroke order. These paths describe the stroke shapes, not their centerlines.
- `svg.medians` is optional. When present, it is an array of SVG path `d` strings in corresponding
  stroke order: `medians[i]` is the centerline for `strokes[i]`. Median paths use normal SVG path
  syntax (for example, commands such as `M` and `L`), not a serialized list of `x,y` points.

For a concrete example, see
[`一/character.json`](../../projects/app/src/client/wiki/一/character.json). The generator that
imports and transforms character stroke graphics is
[`generateWikiCharacterStrokes.ts`](../../projects/app/bin/generateWikiCharacterStrokes.ts).

## Generated `public/raw` wiki data

`projects/app/public/raw/wiki/` and `projects/app/public/raw/svgs/` are generated per-entry JSON
data used by the web app at runtime. They are derived from the wiki source files:

- `public/raw/wiki/[hanzi].json` contains the compiled Markdown AST in `mdast` when an article
  exists and, where present, character `curriculumMeanings` and `curriculumMeaningExamples` from
  `src/client/wiki/[hanzi]/character.json`. The payload also exists for entries with curriculum
  meanings but no MDX article.
- `public/raw/svgs/[hanzi].json` contains the `svg` stroke data from
  `src/client/wiki/[hanzi]/character.json` for entries with stroke path arrays.

Do not use these generated directories to discover how wiki content is authored, and do not edit
their JSON directly. They contain many repetitive, generated files and scanning them wastes time and
context. Read or change the corresponding `src/client/wiki/[hanzi]/meaning.mdx` or `character.json`
source instead; the app tests regenerate/check the compiled outputs. Keep SVGs separate from the
wiki payload because other app features load them independently.

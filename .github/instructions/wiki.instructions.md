---
applyTo: "projects/app/**"
---

# Wiki content structure

The wiki content is stored in MDX files within the `src/client/wiki/` directory. The structure
follows this pattern:

- `src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx` - Contains the meaning/definition of a word
  - Where `{hanzi}` is the Chinese character or word
  - And `{meaningKey}` is the English identifier that corresponds to the concept from HanziWord in
    the docs

Example:

- `src/client/wiki/一/~one/meaning.mdx` - Contains the definition for "一" when it means "one"

When modifying or adding wiki content:

1. Create or edit the appropriate .mdx file in the correct directory structure
2. Ensure the content is formatted in Markdown with appropriate styling
3. **ALWAYS run `moon run :prettier` after editing MDX files** to ensure proper formatting
4. The wiki content will be automatically loaded by the application

**Important:** MDX files have specific prettier formatting rules (100 character line width, prose
wrapping). Running prettier is essential to prevent CI build failures.

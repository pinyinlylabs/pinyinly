---
applyTo: "projects/app/**"
---

# Wiki content structure

The wiki content is stored in MDX files within the `src/client/wiki/` directory. The structure
follows this pattern:

- `src/client/wiki/[hanzi]/meaning.mdx` - Contains the meaning/definition of a word
  - Where `[hanzi]` is the Chinese character or word

Example:

- `src/client/wiki/一/meaning.mdx` - Contains the definition for "一"

When modifying or adding wiki content:

1. Create or edit the appropriate .mdx file in the correct directory structure
2. Ensure the content is formatted in Markdown with appropriate styling
3. The wiki content will be automatically loaded by the application

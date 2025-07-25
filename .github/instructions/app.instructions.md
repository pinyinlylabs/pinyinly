---
applyTo: "projects/app/**"
---

The following commands should be used to test the code:

- Tests: `moon run app:test`
- Lint: `moon run app:lint` (and `moon run app:lint -- --fix` to fix issues)
- Static type checking: `moon run app:typecheck`
- Prettier: `moon run root:prettierCheck`

These can be run from any directory, there's no need to `cd` to a particular directory.

# Tests directory structure

Test files are located in the `tests/` directory. The directory structure mirrors the `src/`
directory. For example a source file at `src/util/date.ts` would have its tests at
`tests/util/date.test.ts`.

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
3. The wiki content will be automatically loaded by the application

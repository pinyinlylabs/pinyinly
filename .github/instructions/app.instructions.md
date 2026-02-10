---
applyTo: "projects/app/**"
---

The following commands should be used to test the code:

- Typechecking using TypeScript: `moon run app:typecheck`

- Generate PG DB migration: `moon run app:dbGenerate`

- Tests use vitest, so any vitest arguments can be passed after `--`:
  - Run all tests: `moon run app:test`
  - Run file tests: `moon run app:test -- <filename>`
  - Update snapshots: `moon run app:test -- -u`

- Lint uses oxlint and eslint:
  - Run all lint (and fix): `moon run app:lint`
  - Run file lint: `moon run app:eslint -- <filename>` or `moon run app:oxlint -- <filename>`

- Formatting uses oxfmt: `moon run app:fmt`

These can be run from any directory, there's no need to `cd` to a particular directory.

# PostgreSQL DB Migrations

Don't manually create drizzle SQL migration files, instead use the `app:dbGenerate` command which
will automatically generate a migration file based on the current state of the drizzle schema.

# Tests directory structure

Test files are located in the `tests/` directory. The directory structure mirrors the `src/`
directory. For example a source file at `src/util/date.ts` would have its tests at
`tests/util/date.test.ts`.

# Wiki content structure

The wiki content is stored in MDX files within the `src/client/wiki/` directory. There is a
directory for each HanziWord, inside of which is a `meaning.mdx` file and `character.json` for
single-character hanzi.

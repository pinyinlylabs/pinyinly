# Pinyinly AI Agent Instructions

> This document summarizes essential project knowledge, architecture, and conventions for AI coding
> agents working in the Pinyinly monorepo. Focus on actionable, project-specific guidance.

## Architecture & Major Components

- **Monorepo** managed with [moonrepo](https://moonrepo.dev/), using workspaces for `app`, `lib`,
  `expo-audio-sprites`, `emails`, and more.
- **App** (`projects/app/`): Expo, with TypeScript throughout. Key subdirs:
  - `src/`: Application source code
  - `src/client/wiki/`: MDX-based wiki content, organized as
    `src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx`
  - `bin/`: Build and data scripts
  - `drizzle/`: SQL migrations for Drizzle ORM
- **Audio Sprites Metro Plugin** (`projects/expo-audio-sprites/`): Rule-based audio sprite
  generator, with Babel plugin and manifest-driven config.
- **Emails** (`projects/emails/`): React Email templates, previewable via local dev server.
- **ESLint Rules** (`projects/eslint-rules/`): Custom lint rules for code consistency.

## Developer Workflows

- **Typechecking:** `moon run <project>:typecheck`
- **Testing:** `moon run <project>:test [-- <args>]` (uses Vitest)
- **Linting:** `moon run <project>:lint [-- <args>]`
- **Prettier:** `moon run <project>:prettier` / `moon run <project>:prettierCheck`
- **Build Bill of Materials:** `moon run app:buildBillOfMaterials`
- **Emails Dev:** `moon run dev` in `projects/emails/` (see README)
- **No need to cd:** All moon commands can be run from any directory.

## Critical: Code Formatting Before Commits

**ALWAYS run `moon run :prettier` before committing any changes.** This is especially important
when:

- Editing or creating MDX files (wiki content)
- Making any changes to Markdown files
- Modifying any source code files

**Failure to run prettier will cause CI build failures.** The command `moon run :prettier` formats
all files across all projects globally.

## Project-Specific Patterns & Conventions

- **TypeScript Discriminated Unions:** Always use `kind` as the discriminator property (not `type`).
  Discriminator types are suffixed with `Kind`.
- **No useCallback/useMemo:** Avoid these in React code; rely on React Compiler optimizations.
- **Skill Graph:** Learning skills are nodes in a directed graph, supporting dynamic, personalized
  learning paths.
- **Word Representation:** Each Hanzi word is mapped to a set of distinct meanings, each with a
  stable `meaning-key` (see `word-representation.instructions.md`).
- **Skill Kinds:** See `skill-kinds.instructions.md` for all supported skill types and Hanzi ID
  format.
- **Wiki Content:** Add/modify MDX files in `src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx`.
  Content is auto-loaded.
- **Tests:** Mirror `src/` structure in `test/` (e.g., `src/util/date.ts` →
  `test/util/date.test.ts`).

## Audio Sprite Rules (expo-audio-sprites)

- **Rule-based assignment:** Use regex and template strings in `manifest.json` to group audio files
  into sprites.
- **Babel Plugin:** Transforms `require()` calls for audio files to sprite objects at build time.
- **API:** See `expo-audio-sprites/README.md` and `RULES_FEATURE.md` for rule syntax and usage.

## Design Decisions

- **Multiple Meanings:** Words with distinct meanings are split into separate skills.
- **Mistake History:** Mistakes are tracked independently from skill ratings for flexibility and
  accuracy.
- **SRS Algorithm:** Uses graph-based, trickle-down spaced repetition (see
  `srs-algorithm.instructions.md`).

## Integration & External Dependencies

- **Drizzle ORM:** Used for database migrations in `projects/app/drizzle/`.
- **TRPC, React Query, Sentry, Expo, etc.:** See `package.json` for full dependency list.

## References

- See `.github/instructions/*.md` for detailed conventions, curriculum, SRS, and more.
- For contribution/setup, see `CONTRIBUTING.md`.

---

**Tip:** When in doubt, search `.github/instructions/` for project-specific rules before assuming
defaults.

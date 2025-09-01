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

## CRITICAL: pre-commit checks

Before committing code, always manually run `moon ci`. Only open a PR after this passes.

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

## References

- See `.github/instructions/*.md` for detailed conventions, curriculum, SRS, and more.
- For contribution/setup, see `CONTRIBUTING.md`.

---

**Tip:** When in doubt, search `.github/instructions/` for project-specific rules before assuming
defaults.

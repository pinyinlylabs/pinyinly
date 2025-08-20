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

## Code Formatting & Commits

**IMPORTANT:** To prevent CI failures due to prettier formatting issues, **ALWAYS** use the
automated formatting script when committing changes:

```bash
./scripts/format-and-commit.sh "Your commit message here"
```

This script automatically:

- Formats all changed files with prettier
- Stages the formatted changes
- Commits with your message

**Alternative:** You can also manually format before committing:

```bash
# Format specific projects that have changes
moon run app:prettier
moon run lib:prettier
# ... format other projects as needed
git add .
git commit -m "Your message"
```

The repository also has git hooks configured to auto-format on commit, but using the script above is
more reliable for AI agents.

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

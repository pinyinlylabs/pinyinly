---
applyTo: "projects/app/**"
---

The following commands should be used to test the code:

- Tests: `moon run app:test`
- Lint: `moon run app:lint` (and `moon run app:lint -- --fix` to fix issues)
- Static type checking: `moon run app:typecheck`
- Prettier: `moon run root:prettierCheck`

# Tests directory structure

Test files are located in the `tests/` directory. The directory structure
mirrors the `src/` directory. For example a source file at `src/util/date.ts`
would have its tests at `tests/util/date.test.ts`.

---
applyTo: "projects/eslint-rules/**"
---

The following commands should be used to test the code:

- Typechecking using TypeScript: `moon run eslint-rules:typecheck`

- Tests use vitest, so any vitest arguments can be passed after `--`:
  - Run all tests: `moon run eslint-rules:test`
  - Run file tests: `moon run eslint-rules:test -- <filename>`
  - Update snapshots: `moon run eslint-rules:test -- -u`

- Lint uses eslint, so any eslint arguments can be passed after `--`:
  - Run all lint: `moon run eslint-rules:lint`
  - Run file lint: `moon run eslint-rules:lint -- <filename>`
  - Auto-fix lint: `moon run eslint-rules:lint -- --fix`

- Prettier: `moon run eslint-rules:prettierCheck`
  - Fix prettier: `moon run eslint-rules:prettier`

These can be run from any directory, there's no need to `cd` to a particular directory.

---
applyTo: "projects/eslint-rules/**"
---

The following commands should be used to test the code:

- Typechecking using TypeScript: `moon run eslint-rules:typecheck`

- Tests use vitest, so any vitest arguments can be passed after `--`:
  - Run all tests: `moon run eslint-rules:test`
  - Run file tests: `moon run eslint-rules:test -- <filename>`
  - Update snapshots: `moon run eslint-rules:test -- -u`

- Lint uses eslint and oxlint:
  - Run all lint (and fix): `moon run eslint-rules:lint`
  - Run file lint: `moon run eslint-rules:eslint -- <filename>` or
    `moon run eslint-rules:oxlint -- <filename>`

- Formatting uses oxfmt: `moon run eslint-rules:fmt`

These can be run from any directory, there's no need to `cd` to a particular directory.

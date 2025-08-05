---
applyTo: "projects/eslint-rules/**"
---

The following commands should be used to test the code:

- Tests: `moon run eslint-rules:test [-- path/to/test-file.test.ts]`
- Lint: `moon run eslint-rules:lint [-- [--fix] path/to/test-file.test.ts]` (e.g.
  `moon run eslint-rules:lint -- --fix` to fix issues)
- Prettier: `moon run eslint-rules:prettierCheck`

These can be run from any directory, there's no need to `cd` to a particular directory.

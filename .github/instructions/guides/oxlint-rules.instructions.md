---
applyTo: "projects/oxlint-rules/**"
---

The following commands should be used to test the code:

- Typechecking using TypeScript: `moon run oxlint-rules:typecheck`

- Tests use vitest, so any vitest arguments can be passed after `--`:
  - Run all tests: `moon run oxlint-rules:test`
  - Run file tests: `moon run oxlint-rules:test -- <filename>`
  - Update snapshots: `moon run oxlint-rules:test -- -u`

- Lint uses oxlint (this package has no ESLint dependency):
  - Run all lint (and fix): `moon run oxlint-rules:lint`
  - Run file lint: `moon run oxlint-rules:oxlint -- <filename>`

- Formatting uses oxfmt: `moon run oxlint-rules:fmt`

These can be run from any directory, there's no need to `cd` to a particular directory.

Rules are written as native oxlint JS plugins using `@oxlint/plugins`
(`createOnce`/`before`/`after`, wrapped in `eslintCompatPlugin`), not ESLint plugins. See
https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html.

Important: `context.options` is only populated once a file starts linting, not when
`createOnce(context)` itself runs. Any options-derived state must be computed inside the `before()`
hook and stored in a `let` declared in `createOnce`'s outer scope.

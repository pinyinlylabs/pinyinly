---
applyTo: "projects/expo-audio-sprites/**"
---

The following commands should be used to test the code:

- Tests use vitest, so any vitest arguments can be passed after `--`:

  - Run all tests: `moon run expo-audio-sprites:test`
  - Run file tests: `moon run expo-audio-sprites:test -- <filename>`
  - Update snapshots: `moon run expo-audio-sprites:test -- -u`

- Lint uses eslint, so any eslint arguments can be passed after `--`:

  - Run all lint: `moon run expo-audio-sprites:lint`
  - Run file lint: `moon run expo-audio-sprites:lint -- <filename>`
  - Auto-fix lint: `moon run expo-audio-sprites:lint -- --fix`

- Prettier: `moon run expo-audio-sprites:prettierCheck`

  - Fix prettier: `moon run expo-audio-sprites:prettier`

These can be run from any directory, there's no need to `cd` to a particular directory.

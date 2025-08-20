# Format and Commit Helper

This script helps ensure that all code is properly formatted before committing, preventing CI
failures due to prettier formatting issues.

## For AI Agents

When making changes to the codebase, use the format-and-commit script:

```bash
./scripts/format-and-commit.sh "Your commit message here"
```

This script will:

1. Automatically format all changed files using prettier
2. Stage the formatted changes
3. Commit with the provided message

## For Developers

The repository is configured with git hooks that automatically format code on commit. When you run
`git commit`, the pre-commit hook will:

1. Format any staged files
2. Re-stage the formatted files
3. Proceed with the commit

## Manual Formatting

You can also manually format code in specific projects:

```bash
# Format a specific project
moon run app:prettier
moon run lib:prettier
moon run eslint-rules:prettier
moon run expo-audio-sprites:prettier
moon run emails:prettier

# Format all projects
yarn format
```

## Checking Formatting

To check if files are properly formatted without changing them:

```bash
moon run app:prettierCheck
moon run lib:prettierCheck
# etc.
```

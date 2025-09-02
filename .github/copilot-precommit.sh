#!/bin/sh
moon run :lint :typecheck :prettier :yarnConstraints :test

RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "moon pre-commit checks failed. Commit aborted."
    exit 1
fi

# Stage everything (because perhaps new files get created).
git add .

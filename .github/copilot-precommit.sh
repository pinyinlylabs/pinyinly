#!/bin/sh
moon run :prettier

RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "moon pre-commit checks failed. Commit aborted."
    exit 1
fi

# Stage everything (because perhaps new files get created).
git add .

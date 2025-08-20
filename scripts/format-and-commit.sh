#!/bin/bash

# Format and commit script for AI agents
# This script ensures code is properly formatted before committing

set -e

echo "🎨 Formatting code with prettier..."

# Get list of changed files that are staged or modified
CHANGED_FILES=$(git diff --name-only HEAD)

# Format files in each project if they have changes
if echo "$CHANGED_FILES" | grep -q "^projects/app/"; then
    echo "📦 Formatting app project..."
    moon run app:prettier
fi

if echo "$CHANGED_FILES" | grep -q "^projects/lib/"; then
    echo "📦 Formatting lib project..."
    moon run lib:prettier
fi

if echo "$CHANGED_FILES" | grep -q "^projects/eslint-rules/"; then
    echo "📦 Formatting eslint-rules project..."
    moon run eslint-rules:prettier
fi

if echo "$CHANGED_FILES" | grep -q "^projects/expo-audio-sprites/"; then
    echo "📦 Formatting expo-audio-sprites project..."
    moon run expo-audio-sprites:prettier
fi

if echo "$CHANGED_FILES" | grep -q "^projects/emails/"; then
    echo "📦 Formatting emails project..."
    moon run emails:prettier
fi

# Format root-level files
if echo "$CHANGED_FILES" | grep -qE "^[^/]+\.(js|ts|json|md|yml|yaml)$"; then
    echo "📦 Formatting root files..."
    moon run prettier
fi

echo "✅ Formatting complete!"

# Stage any newly formatted files
git add .

# Show status
echo "📊 Current git status:"
git status --short

# If there are staged changes, proceed with commit
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit after formatting."
else
    echo "💾 Ready to commit formatted changes."
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <commit-message>"
        echo "Example: $0 \"Fix bug in user authentication\""
        exit 1
    fi
    
    # Commit with the provided message
    git commit -m "$1"
    echo "✅ Changes committed successfully!"
fi
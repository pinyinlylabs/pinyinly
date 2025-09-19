# Wiki MDX Files Audit Results

## Overview

This document summarizes the audit of all wiki meaning MDX files in the Pinyinly project,
identifying files that need elaboration and organizing them into manageable tasks for copilot
agents.

## Audit Summary

- **Total MDX files**: 3,852
- **Minimal files identified**: 3,276 (85%)
- **Well-developed files**: 576 (15%)

## Criteria for "Minimal" Files

A file is considered minimal if it meets ANY of these criteria:

1. **Very short content**: ≤5 lines, ≤30 words, or ≤200 characters
2. **Missing key sections**: Lacks Quick Reference, Visual Breakdown, Character Analysis sections
3. **Only basic definition**: Contains only a simple 1-2 line definition without educational
   structure

## Current State Analysis

### Most Common Issues with Minimal Files:

1. **Single-line definitions** (3,200+ files): Only contain a basic English definition
2. **Missing educational structure**: No Quick Reference tables, visual breakdowns, or mnemonics
3. **No character analysis**: Missing decomposition and component meaning explanations
4. **No usage examples**: Lack practical examples and grammar patterns
5. **No cultural context**: Missing cultural significance and usage notes

### Example of Minimal Content:

```
Directly ahead; before.
```

### Example of Well-Developed Content:

Well-developed files typically include:

- Quick Reference table (pinyin, part of speech, tones)
- Visual Breakdown (component analysis)
- Character Analysis (radical meanings and composition)
- Mnemonic (memory aids)
- Usage Examples (practical sentences)
- Grammar Patterns (structural usage)
- Cultural Context (cultural significance)

## Task Organization

The 3,276 minimal files have been organized into **66 groups of 50 files each** for assignment to
copilot agents.

### Group Files Created:

- `wiki-enhancement-tasks/pr_group_1.md` - `wiki-enhancement-tasks/pr_group_66.md`
- Each group contains 50 files with detailed task requirements
- Each file entry includes current content, statistics, and needed sections

## File Structure

All minimal files follow the pattern:

```
projects/app/src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx
```

Where:

- `{hanzi}` is the Chinese character or word
- `{meaningKey}` is the English identifier for the specific meaning

## Priority Categories

### High Priority (Groups 1-20): Single-line definitions

- Files with only 1-2 lines of basic content
- Critical for basic user experience
- Examples: 面前/~inFrontOf, 顿/~pause, 今后/~henceforth

### Medium Priority (Groups 21-45): Short definitions

- Files with 3-10 lines but missing structure
- Have some content but need proper formatting
- Examples: Basic definitions with minimal elaboration

### Lower Priority (Groups 46-66): Partially developed

- Files with some sections but missing key components
- Need completion rather than full rewrite
- Examples: Files with Quick Reference but missing analysis

## Next Steps

1. **Assign groups to copilot agents**: Each agent takes 1-2 groups (50-100 files)
2. **Follow enhancement template**: Use well-developed files as templates
3. **Quality consistency**: Ensure all enhanced files follow the established pattern
4. **Review and validation**: Verify enhanced content maintains educational quality

## Enhancement Template

Each enhanced file should include:

```markdown
1. [Brief definition]

## Quick Reference

| Aspect         | Info        |
| -------------- | ----------- |
| Pinyin         | [pinyin]    |
| Core meaning   | [meaning]   |
| Part of speech | [pos]       |
| Tone           | [tone info] |

## Visual Breakdown

[Component analysis]

## Character Analysis

[Detailed breakdown of each character]

## Mnemonic

[Memory aid]

## Usage Examples

[Practical examples]

## Grammar Patterns

[Structural usage]

## Cultural Context

[Cultural significance]
```

## Quality Standards

Enhanced files should:

- Be educational and informative
- Include accurate linguistic information
- Provide practical usage examples
- Maintain consistent formatting
- Include cultural context where relevant
- Use clear, learner-friendly language

---

**Note**: This audit identifies the scope of work needed to bring all wiki files to a consistent,
high-quality educational standard.

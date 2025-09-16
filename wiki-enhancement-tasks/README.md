# Wiki Enhancement Tasks

This directory contains the organized tasks for enhancing minimal wiki MDX files identified in the
audit.

## Files in this Directory

### Task Groups (for Copilot Agents)

- `pr_group_1.md` through `pr_group_66.md` - 66 groups of 50 files each
- Each group is designed as a complete task for a copilot agent
- Total: 3,276 minimal files organized for enhancement

### Analysis Files

- `minimal_files.txt` - Complete list of all minimal files with statistics
- `all_files_analysis.txt` - Detailed analysis of all 3,852 wiki files

## How to Use These Tasks

### For Project Managers

1. Assign each PR group file to a copilot agent
2. Each group represents approximately 1-2 hours of work
3. Use the PR descriptions from each group file when creating GitHub issues

### For Copilot Agents

1. Take one `pr_group_X.md` file as your assignment
2. Each file contains 50 wiki entries to enhance
3. Follow the enhancement template provided in each task
4. Reference well-developed files for consistency

### Example Assignment Process

```bash
# Assign Group 1 to Agent A
gh issue create --title "Wiki Enhancement Group 1" --body-file pr_group_1.md

# Assign Group 2 to Agent B
gh issue create --title "Wiki Enhancement Group 2" --body-file pr_group_2.md
```

## Task Priority

### High Priority (Groups 1-20)

- Single-line definitions
- Most critical for user experience
- Should be completed first

### Medium Priority (Groups 21-45)

- Short definitions with minimal structure
- Important for consistency

### Lower Priority (Groups 46-66)

- Partially developed files
- Enhancement rather than complete rewriting

## Quality Guidelines

Each enhanced file should follow the established pattern:

1. **Quick Reference Table** - Pinyin, meaning, part of speech, tones
2. **Visual Breakdown** - Component analysis
3. **Character Analysis** - Detailed character breakdown
4. **Mnemonic** - Memory aids for learning
5. **Usage Examples** - Practical sentences
6. **Grammar Patterns** - Structural usage rules
7. **Cultural Context** - Cultural significance

## Example Reference Files

Well-developed files to use as templates:

- `看法/~view/meaning.mdx` - Opinion/viewpoint (70+ lines)
- `歌声/~singingVoice/meaning.mdx` - Singing voice (77+ lines)
- `不对/~incorrect/meaning.mdx` - Wrong/incorrect (105+ lines)

## File Locations

All files are located in:

```
projects/app/src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx
```

## Completion Tracking

- [ ] Groups 1-10 (High Priority Phase 1)
- [ ] Groups 11-20 (High Priority Phase 2)
- [ ] Groups 21-35 (Medium Priority Phase 1)
- [ ] Groups 36-50 (Medium Priority Phase 2)
- [ ] Groups 51-66 (Lower Priority)

Total progress: 0/66 groups completed (0/3,276 files enhanced)

---

**Important**: Each enhanced file should maintain educational quality while following the
established format. Reference existing well-developed files for consistency and style.

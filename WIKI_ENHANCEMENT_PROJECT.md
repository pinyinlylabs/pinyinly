# Wiki Enhancement Project

## Project Overview

This project addresses the comprehensive enhancement of 3,276 minimal wiki MDX files (85% of all
wiki files) in the Pinyinly application. These files currently contain only basic definitions and
need to be expanded into full educational content.

## Project Structure

```
├── WIKI_AUDIT_RESULTS.md              # Detailed audit findings
├── WIKI_ENHANCEMENT_PROJECT.md         # This file - project overview
└── wiki-enhancement-tasks/
    ├── README.md                       # Task organization guide
    ├── COPILOT_INSTRUCTIONS.md         # Detailed instructions for agents
    ├── pr_group_1.md                   # Task group 1 (50 files)
    ├── pr_group_2.md                   # Task group 2 (50 files)
    ├── ...                            # Groups 3-65 (50 files each)
    ├── pr_group_66.md                  # Task group 66 (26 files)
    ├── minimal_files.txt               # Complete list of minimal files
    └── all_files_analysis.txt          # Detailed analysis of all files
```

## Quick Stats

- **Total wiki files**: 3,852
- **Files needing enhancement**: 3,276 (85%)
- **Well-developed files**: 576 (15%)
- **Task groups created**: 66
- **Files per group**: 50 (except group 66 with 26)

## Task Assignment Strategy

### Option 1: Individual Assignment (Recommended)

- Assign each `pr_group_X.md` to a single copilot agent
- Each group = ~50 files = ~2-3 hours of work
- 66 separate issues/assignments needed

### Option 2: Batch Assignment

- Assign 2-3 groups per agent for larger tasks
- Faster overall completion with fewer agents
- ~33 assignments needed for 2 groups each

### Option 3: Priority-Based Assignment

- **Phase 1**: Groups 1-20 (highest priority - single line definitions)
- **Phase 2**: Groups 21-45 (medium priority - short definitions)
- **Phase 3**: Groups 46-66 (lower priority - partially developed)

## Creating GitHub Issues

### For Project Managers:

Create issues using the PR group files as templates:

```bash
# Create all 66 issues at once
for i in {1..66}; do
  gh issue create \
    --title "Wiki Enhancement Group $i" \
    --body-file "wiki-enhancement-tasks/pr_group_$i.md" \
    --label "enhancement,wiki,copilot-task"
done
```

Or create priority-based batches:

```bash
# High priority first (groups 1-20)
for i in {1..20}; do
  gh issue create \
    --title "Wiki Enhancement Group $i (HIGH PRIORITY)" \
    --body-file "wiki-enhancement-tasks/pr_group_$i.md" \
    --label "enhancement,wiki,copilot-task,priority-high"
done
```

### For Copilot Agents:

1. **Get assignment**: Take one `pr_group_X.md` file
2. **Read instructions**: Study `wiki-enhancement-tasks/COPILOT_INSTRUCTIONS.md`
3. **Review example**: Examine the enhanced `面前/~inFrontOf/meaning.mdx`
4. **Enhance files**: Follow the established pattern exactly
5. **Test changes**: Run `moon run app:lint` and `moon run app:typecheck`
6. **Submit work**: Commit and push your changes

## Quality Example

The file `projects/app/src/client/wiki/面前/~inFrontOf/meaning.mdx` has been enhanced as a reference
example, showing:

### Before (minimal):

```
Directly ahead; before.
```

### After (enhanced):

- 60+ lines of educational content
- Complete structure with all required sections
- Character analysis and mnemonics
- Practical usage examples
- Cultural context

## Progress Tracking

Track completion by priority:

### High Priority (Groups 1-20): 1,000 files

- [ ] Groups 1-10: Most critical single-line definitions
- [ ] Groups 11-20: Additional high-priority files

### Medium Priority (Groups 21-45): 1,250 files

- [ ] Groups 21-35: Short definitions needing structure
- [ ] Groups 36-45: Additional medium-priority files

### Lower Priority (Groups 46-66): 1,026 files

- [ ] Groups 46-60: Partially developed files
- [ ] Groups 61-66: Final enhancement phase

**Current Status**: 1/3,276 files enhanced (0.03%) **Example Complete**:
`面前/~inFrontOf/meaning.mdx` ✅

## Expected Timeline

- **Per agent per group**: 2-3 hours (50 files)
- **If 10 agents working**: ~2 weeks for high priority
- **If 20 agents working**: ~1 week for high priority
- **Full project completion**: 2-6 weeks depending on resources

## Quality Assurance

Each enhanced file must include:

1. ✅ Expanded definition
2. ✅ Quick Reference table
3. ✅ Visual Breakdown section
4. ✅ Character Analysis section(s)
5. ✅ Mnemonic section
6. ✅ Usage Examples section
7. ✅ Grammar Patterns section
8. ✅ Cultural Context section

## Testing

Before considering the project complete:

```bash
cd /home/runner/work/pinyinly/pinyinly
moon run app:lint     # Must pass
moon run app:typecheck # Must pass
```

## Success Metrics

- **85% → 0%** reduction in minimal files
- **Consistent structure** across all wiki files
- **Educational value** enhanced for all entries
- **User learning experience** dramatically improved
- **Content completeness** bringing all files to professional standard

---

This project will transform the Pinyinly wiki from having mostly minimal definitions to having
comprehensive, educational content that truly helps users learn Chinese effectively.

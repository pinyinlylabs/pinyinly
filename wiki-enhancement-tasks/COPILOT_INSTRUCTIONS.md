# Instructions for Copilot Agents - Wiki Enhancement Tasks

## Your Task

You will be assigned one PR group file (e.g., `pr_group_1.md`) containing 50 minimal wiki files to
enhance. Your job is to transform basic definitions into comprehensive educational content.

## Before You Start

1. **Read this file completely** to understand the requirements
2. **Examine the example** enhancement in `projects/app/src/client/wiki/面前/~inFrontOf/meaning.mdx`
3. **Reference well-developed files** for consistency and style
4. **Follow the established pattern** exactly

## Enhancement Requirements

Each file MUST include these sections in this order:

### 1. Brief Definition (Line 1)

- Expand the existing definition to be more comprehensive
- Keep it to 1-2 sentences maximum

### 2. Quick Reference Section

```markdown
## Quick Reference

| Aspect         | Info                   |
| -------------- | ---------------------- |
| Pinyin         | [pinyin with tones]    |
| Core meaning   | [concise meaning]      |
| Part of speech | [grammatical category] |
| Tone           | [tone description]     |
```

### 3. Visual Breakdown Section

```markdown
## Visual Breakdown

[Description] combines **[component 1] + [component 2]** to represent [concept].

| Component   | Meaning   | Contribution to [hanzi] |
| ----------- | --------- | ----------------------- |
| **[char1]** | [meaning] | [how it contributes]    |
| **[char2]** | [meaning] | [how it contributes]    |
```

### 4. Character Analysis Section(s)

```markdown
## Character Analysis: [character]

[Character] depicts/shows **[visual/conceptual description]**:

- [Detail 1 about the character]
- [Detail 2 about components]
- [Detail 3 about meaning evolution]
- [Detail 4 about semantic contribution]
```

### 5. Mnemonic Section

```markdown
## Mnemonic

Think of [hanzi] as **"[memorable phrase]"**:

- [Component 1] ([meaning]) [shows/represents] [concept]
- [Component 2] ([meaning]) [shows/represents] [concept]
- [Visual or conceptual memory aid]
- [Concrete example or scenario to remember]
```

### 6. Usage Examples Section

```markdown
## Usage Examples

- **[hanzi in context]** ([pinyin]) - "[English translation]"
- **[hanzi in context]** ([pinyin]) - "[English translation]"
- **[hanzi in context]** ([pinyin]) - "[English translation]"
- **[hanzi in context]** ([pinyin]) - "[English translation]"
- **[hanzi in context]** ([pinyin]) - "[English translation]"
```

### 7. Grammar Patterns Section

```markdown
## Grammar Patterns

[Description of how the word functions grammatically]:

- **[Pattern 1]**: [Description] - "[Example]"
- **[Pattern 2]**: [Description] - "[Example]"
- **[Pattern 3]**: [Description] - "[Example]"
```

### 8. Cultural Context Section

```markdown
## Cultural Context

[Hanzi] reflects [cultural concept]:

- **[Aspect 1]**: [Description of cultural significance]
- **[Aspect 2]**: [Description of usage context]
- **[Aspect 3]**: [Description of social implications]
- **[Aspect 4]**: [Additional cultural note]
```

## Quality Standards

### Content Requirements:

- **Accurate**: All linguistic information must be correct
- **Educational**: Focus on helping learners understand and remember
- **Consistent**: Follow the exact format of well-developed files
- **Complete**: Include all required sections
- **Clear**: Use learner-friendly language

### Style Guidelines:

- Use **bold** for Chinese characters and key terms
- Include pinyin in parentheses for all Chinese examples
- Keep sections focused and concise
- Use bullet points and tables for easy scanning
- Provide practical, realistic examples

### Length Guidelines:

- Aim for 60-80 lines per file (similar to the example)
- Each section should be substantial but not overwhelming
- Balance completeness with readability

## Example Reference

Study the enhanced file `projects/app/src/client/wiki/面前/~inFrontOf/meaning.mdx` which
demonstrates:

- Proper formatting and structure
- Appropriate content depth
- Educational mnemonic creation
- Practical usage examples
- Cultural context integration

## Testing Your Work

After enhancing files, test that your changes work:

```bash
cd /home/runner/work/pinyinly/pinyinly
moon run app:lint
moon run app:typecheck
```

## Common Mistakes to Avoid

1. **Inconsistent formatting** - Follow the exact markdown structure
2. **Missing sections** - All 8 sections are required
3. **Shallow content** - Each section needs substantial, helpful content
4. **Inaccurate pinyin** - Verify tones and pronunciation
5. **Poor mnemonics** - Create memorable, logical memory aids
6. **Generic examples** - Use realistic, practical usage examples
7. **Missing cultural context** - Include relevant cultural information

## File Locations

All files are in:

```
projects/app/src/client/wiki/{hanzi}/~{meaningKey}/meaning.mdx
```

Use the exact path provided in your PR group file.

## Completion

When finished:

1. Verify all files are properly enhanced
2. Test that linting and type checking pass
3. Commit your changes
4. Report completion with file count and any issues encountered

---

**Remember**: You are creating educational content that helps people learn Chinese effectively.
Focus on accuracy, clarity, and usefulness for language learners.

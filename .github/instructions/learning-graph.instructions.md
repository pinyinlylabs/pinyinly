---
applyTo: "projects/app/**"
---

# Pinyinly Skill Dependency Graph

Skills in Pinyinly are organized in a **directed weighted graph**, ensuring users learn components before full words.

## Example Structure

```
  女 (nǚ) → 好 (hǎo) → 你好 (nǐhǎo)
  子 (zǐ) → 好 (hǎo)
```

## Dynamic Adjustments

- Users focusing on **reading** will see different dependencies than those focusing on **speaking**.
- Listening skills can be **temporarily disabled** if the user is in a noisy environment.

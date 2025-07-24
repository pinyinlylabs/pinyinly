---
applyTo: "projects/app/**"
---

# Pinyinly Design Decisions

This file logs major design decisions and the reasoning behind them.

## Decision: Handling Multiple Meanings

**Problem:** Some words have multiple distinct meanings (e.g., 遍 as a measure word vs. location).

**Solution:** Split words into **separate skills by meaning**, rather than forcing a single gloss.

## Decision: Trickle-Down SRS Reinforcement

**Problem:** Traditional SRS systems make users review words that have already been reinforced indirectly.

**Solution:** Use a **graph-based reinforcement model**, delaying skills that were practiced indirectly.

## Decision: Pinyin Encoding

**Problem:** Deciding how to encode pinyin for multiple words.

**Solution:** Use a space-separated string for encoding pinyin. This approach balances simplicity and readability. Spaces can be easily removed when rendering to the user.

**Reasoning:**

- **Simplicity**: A space-separated string is straightforward to implement and understand.
- **Readability**: It is easier to read and parse compared to a concatenated string.
- **Flexibility**: While pinyin is not officially supposed to have spaces, they can be easily removed when displaying to the user.
- **Maintainability**: This method allows for easy manipulation and processing of individual pinyin words.

## Decision: Mistake History

**Problem:** Mistakes are valuable for learning, but they are not always specific to a single skill. For example, selecting the wrong pinyin for a gloss is relevant to all skills that include the gloss, as well as all skills that include the pinyin. Capturing mistakes only in `skillRating` creates several issues:

- **Space Inefficiency**: A `skillRating` would need to be created for every skill in the dictionary that matches the gloss or pinyin, even if these skills haven't been introduced yet.
- **Dictionary Changes**: If new dictionary items are added or existing ones are modified (e.g., adding a pinyin reading to an existing item), historical mistakes would not be reflected in the newly added or modified skills.

**Solution:** Record mistakes as a separate entity from `skillRating`. Mistakes are stored independently and can reference multiple skills or dictionary items as needed. This approach ensures:

- **Efficiency**: Mistakes are stored once, without duplicating data across multiple `skillRating` entries.
- **Flexibility**: Mistakes can be dynamically applied to new or modified dictionary items, ensuring historical errors remain relevant.
- **Accuracy**: Mistakes can be associated with broader contexts, such as glosses or pinyin, rather than being tied to a single skill.

**Future Consideration:** Mistakes may still be included in `skillRating` for specific skills, but this would be supplementary and not the primary mechanism for tracking errors.

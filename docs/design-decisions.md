# haohaohow Design Decisions

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

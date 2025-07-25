---
applyTo: "projects/app/**"
---

# Word Representation in Pinyinly

## Handling Multiple Meanings in Hanzi

### Why Hanzi Can Have Multiple Meanings

In Mandarin Chinese, a single Hanzi character or word can have multiple distinct meanings depending
on context. These meanings can arise due to:

- **Polysemy**: The same character evolving to have different but related meanings over time.
- **Grammatical Role Changes**: A word functioning as a verb in one case and a noun in another.
- **Compound Influence**: A character meaning something on its own vs. within a compound word.

To accurately represent this in Pinyinly, each Hanzi word is associated with a **set of distinct
meanings** rather than a single definition.

---

### Defining the Smallest Set of Meanings

Each Hanzi word is assigned the **minimum number of meanings necessary** to cover its commonly used
definitions. To ensure clarity and usability:

- **Meanings must be reasonably distinct**: If two meanings are too similar, they should be grouped
  into a single meaning.
- **Meanings should capture significant differences**: If a word has meanings that differ in
  function or core concept, they should be separate.
- **Meanings should be learnable**: Uncommon or archaic distinctions should generally not create
  separate meanings unless necessary.

#### **Example: 好 (hǎo)**

| meaning-key  | Meaning                | Example          |
| ------------ | ---------------------- | ---------------- |
| **positive** | "good, nice, friendly" | 这个东西很好。   |
| **like**     | "to like, to enjoy"    | 我好吃辣的食物。 |

- The **adjective sense** ("good, nice") and the **verb sense** ("to like") are distinct enough to
  be separate meanings.
- Variations like "great" and "pleasant" are similar enough to be grouped under **positive**.

---

### Using a meaning-key

To ensure consistency and allow structured learning, each meaning is assigned a **stable,
human-readable meaning-key**.

#### **Why Use a meaning-key?**

- **Stability**: If glosses change (e.g., "nice" becomes "pleasant"), the meaning-key remains
  consistent.
- **Uniqueness**: Prevents ambiguity when referring to meanings programmatically.
- **Graph Structure**: Helps define clear skill dependencies in the learning graph.

#### **Format of a meaning-key**

- **Short, descriptive**
- **Camel-case, no punctuation**: Must only contain english alphabetical characters.
- **Represents the core meaning**
- **Does not depend on user-customizable glosses**

#### **Example: 行 (xíng / háng)**

| meaning-key | Meaning          | Example        |
| ----------- | ---------------- | -------------- |
| **walk**    | "to walk, to go" | 他能行。       |
| **row**     | "line, row"      | 这家银行在哪？ |

- **meaning-key**s clearly separate the verb **xíng (to walk)** from the noun **háng (row, line)**.
- If a user customizes their gloss, the meaning-key **remains unchanged** for consistency.

## Disambiguating Hanzi with a meaning-key

A meaning-key is a short english string that serves to disambiguate multiple meanings of a hanzi
word. For example 好 can be used to mean both "good" as well as "like". A student would typically
start by learning it means "good", and then later learn it can mean "like", so in the curriculum
whenever a hanzi word is referenced it needs to be disambiguated with a meaning-key.

A meaning-key must be unique within the scope of a hanzi, you can think of it as a composite primary
key `{hanzi}:{meaningKey}`. Here's how they're used to disambiguate `好`.

- `好:good` — good; nice; friendly
- `好:like` — to like; to enjoy

## HanziWord String Format

`HanziWord` values is always kept in a string format rather than parsed into an object. This
approach is chosen for several reasons:

- **Convenience**: Strings can be easily used as keys in `Map` objects.
- **Comparison by Identity**: Strings can be compared by identity, making equality checks
  straightforward.
- **Memory Efficiency**: Strings are more memory-efficient compared to objects.

## Data Structure

```json
{
  "hanzi": "好",
  "meanings": [
    {
      "meaningKey": "positive",
      "gloss": ["good", "nice", "friendly"],
      "pinyin": ["hǎo"],
      "example": "这个东西很好。",
      "partOfSpeech": "adjective",
      "definition": "Describes something that is good, nice, or friendly."
    },
    {
      "meaningKey": "like",
      "gloss": ["to like", "to enjoy"],
      "pinyin": ["hǎo"],
      "example": "我好吃辣的食物。",
      "partOfSpeech": "verb",
      "definition": "Indicates the action of liking or enjoying something."
    }
  ]
}
```

## Valid Parts of Speech

Here is a list of all valid parts of speech that can be used in the `partOfSpeech` property:

- **noun**: 名词
- **verb**: 动词
- **adjective**: 形容词
- **adverb**: 副词
- **pronoun**: 代词
- **preposition**: 介词
- **conjunction**: 连词
- **interjection**: 感叹词
- **measureWord**: 量词
- **particle**: 助词

## Why Group Pinyin by Meaning?

- **Some characters have multiple pronunciations depending on meaning.**
- **Grouping Pinyin with glosses ensures accurate learning.**
- **Pinyin is space-separated**: This convention is used for simplicity and readability. Spaces can
  be easily removed when rendering to the user. For example the pinyin for 别的 is written as "bié
  de" instead of "bié de".

### Example: 行 (xíng / háng)

```json
{
  "hanzi": "行",
  "meanings": [
    {
      "meaningKey": "walk",
      "gloss": ["to walk, to go"],
      "pinyin": ["xíng"],
      "example": "他能行。",
      "partOfSpeech": "verb",
      "definition": "Indicates the action of walking or going."
    },
    {
      "meaningKey": "row",
      "gloss": ["line, row"],
      "pinyin": ["háng"],
      "example": "这家银行在哪？",
      "partOfSpeech": "noun",
      "definition": "Refers to a line or row of something."
    }
  ]
}
```

### Example: 个 (gè)

```json
{
  "hanzi": "个",
  "meanings": [
    {
      "meaningKey": "measureWord",
      "gloss": ["measure word for general use"],
      "pinyin": ["gè"],
      "example": "一个苹果。",
      "partOfSpeech": "measureWord",
      "definition": "A general measure word used for counting."
    }
  ]
}
```

### Example: 吧 (ba)

```json
{
  "hanzi": "吧",
  "meanings": [
    {
      "meaningKey": "particle",
      "gloss": ["suggest"],
      "pinyin": ["ba"],
      "example": "我们走吧。",
      "partOfSpeech": "particle",
      "definition": "A particle used to make suggestions."
    }
  ]
}
```

### Example: 𠂊 (hands)

```json
{
  "hanzi": "𠂊",
  "meanings": [
    {
      "meaningKey": "hands",
      "gloss": ["hands radical"],
      "example": "",
      "partOfSpeech": "radical",
      "definition": "A radical representing hands, not used independently."
    }
  ]
}
```

## Summary

- **Each meaning gets a stable `meaningKey`** (not just the gloss).
- **Hanzi skill dependencies reference `{skillType}:{hanzi}:{meaningKey}`** to avoid ambiguity.
- **Glosses and pinyin are grouped within meanings for accuracy.**
- **Part of speech is included** to provide additional context and aid in learning.
- **Pinyin is space-separated** to balance simplicity and readability.
- **Definitions are included** to provide a clear understanding of each meaning.
- **Pinyin is optional** for Hanzi that do not have a pronunciation.

This ensures a **flexible but structured** way to handle words with multiple meanings while keeping
skill dependencies precise and maintainable.

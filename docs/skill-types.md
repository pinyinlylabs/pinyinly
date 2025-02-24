# Skill Types in haohaohow

This document describes the different types of skills available in haohaohow.

## Skill Types

- **RadicalToEnglish (`re`)**: Translate a radical to English.
- **EnglishToRadical (`er`)**: Translate English to a radical.
- **RadicalToPinyin (`rp`)**: Translate a radical to Pinyin.
- **PinyinToRadical (`pr`)**: Translate Pinyin to a radical.
- **HanziWordToEnglish (`he`)**: Translate a Hanzi word to English.
- **HanziWordToPinyinInitial (`hpi`)**: Translate a Hanzi word to its Pinyin initial.
- **HanziWordToPinyinFinal (`hpf`)**: Translate a Hanzi word to its Pinyin final.
- **HanziWordToPinyinTone (`hpt`)**: Translate a Hanzi word to its Pinyin tone.
- **EnglishToHanzi (`eh`)**: Translate English to Hanzi.
- **PinyinToHanzi (`ph`)**: Translate Pinyin to Hanzi.
- **ImageToHanzi (`ih`)**: Translate an image to Hanzi.
- **PinyinInitialAssociation (`pia`)**: Associate a Pinyin initial with a character/actor/entity.
- **PinyinFinalAssociation (`pfa`)**: Associate a Pinyin final with a character/actor/entity.

## How Hanzi IDs Are Defined

Since characters can have multiple meanings, **each meaning must have a stable identifier** that remains consistent even if glosses change.

### **Hanzi ID Format:**

```
{hanzi}:{meaningKey}
```

- **`hanzi`** → The Chinese character(s)
- **`meaningKey`** → A stable, internal identifier for the meaning

### **Examples:**

| Hanzi | Meaning Key  | Full Hanzi ID |
| ----- | ------------ | ------------- |
| 好    | **positive** | `好:positive` |
| 好    | **like**     | `好:like`     |
| 行    | **walk**     | `行:walk`     |
| 行    | **row**      | `行:row`      |
| 爱好  | **hobby**    | `爱好:hobby`  |
| 爱好  | **like**     | `爱好:like`   |

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import hanzi from "hanzi";

import { useInternetQuery, useLocalQuery } from "#client/hooks.ts";
import type {
  HanziChar,
  HanziText,
  HanziWord,
  PinyinText,
} from "#data/model.ts";
import type {
  HanziWordMeaning,
  HanziWordWithMeaning,
} from "#dictionary/dictionary.ts";
import {
  allHanziCharacters,
  allHsk1HanziWords,
  buildHanziWord,
  dictionarySchema,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadHanziDecomposition,
  lookupHanzi,
  lookupHanziWord,
  meaningKeyFromHanziWord,
  parseIds,
  partOfSpeechSchema,
  walkIdsNode,
  wordListSchema,
} from "#dictionary/dictionary.ts";
import "#types/hanzi.d.ts";
import {
  arrayFilterUniqueWithKey,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "#util/collections.ts";
import { jsonStringifyIndentOneLevel } from "#util/json.ts";
import { invariant } from "@haohaohow/lib/invariant";
import { Alert, MultiSelect, Select } from "@inkjs/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import makeDebug from "debug";

import { Box, render, Text, useFocus, useInput } from "ink";
import Link from "ink-link";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import chunk from "lodash/chunk.js";
import isEqual from "lodash/isEqual.js";
import path from "node:path";
import type { ReactNode } from "react";
import {
  Children,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DeepReadonly } from "ts-essentials";
import yargs from "yargs";
import { z } from "zod";
import { makeDbCache } from "./util/cache.js";
import {
  dongChineseData,
  getDongChineseGloss,
  getDongChineseMeaningKey,
  getDongChinesePinyin,
} from "./util/dongChinese.js";
import { readFileWithSchema, writeUtf8FileIfChanged } from "./util/fs.js";
import { makeSimpleAiClient } from "./util/openai.js";

const debug = makeDebug(`hhh`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

// Load data that we'll later use multiple times.
hanzi.start();
const decompositions = await loadHanziDecomposition();
const dbCache = makeDbCache(import.meta.filename, `openai_chat_cache`, debug);
const archiveCache = makeDbCache(
  import.meta.filename,
  `archive_messages`,
  debug,
);
const openai = makeSimpleAiClient(dbCache);

const wordListFileNames = [
  `hsk1HanziWords`,
  `hsk2HanziWords`,
  `hsk3HanziWords`,
  `radicalsHanziWords`,
];

// All root words as well as all the components of each word.
const allWords = new Set<string>();

// Recursively decompose each hanzi and gather together all the components that
// aren't already in the list.
function decomp(char: string) {
  if (allWords.has(char)) {
    return;
  }

  allWords.add(char);
  const ids = decompositions.get(char);
  if (ids != null) {
    const idsNode = parseIds(ids);
    for (const leaf of walkIdsNode(idsNode)) {
      if (leaf.type === `LeafCharacter` && leaf.character !== char) {
        decomp(leaf.character);
      }
    }
  }
}
// Load all the root words we want to include in the dictionary, this will later
// expanded to include all the components of each word.
for (const hanzi of await allHanziCharacters()) {
  decomp(hanzi);
}

interface HanziWordCheckResult {
  hanziWord: HanziWord;
  isGood: boolean;
  reason?: string;
}

interface HanziWordCheckProgress {
  resultBatch: HanziWordCheckResult[];
  itemsDone: number;
  itemsTotal: number;
}

async function checkHsk1HanziWords(
  onProgress: (progress: HanziWordCheckProgress) => void,
  signal?: AbortSignal,
) {
  const hsk1HanziWords = await allHsk1HanziWords();
  const results: HanziWordCheckResult[] = [];

  onProgress({
    resultBatch: [],
    itemsDone: 0,
    itemsTotal: hsk1HanziWords.length,
  });

  for (const wordList of chunk(hsk1HanziWords, 10)) {
    if (signal?.aborted === true) {
      break;
    }

    const lookupById = new Map<
      string,
      { hanziWord: HanziWord; meaning: DeepReadonly<HanziWordMeaning> }
    >();

    const inflated: {
      hanziWord: HanziWord;
      meaning: DeepReadonly<HanziWordMeaning>;
      id: string;
    }[] = [];
    let i = 0;
    for (const hanziWord of wordList) {
      const id = `738274${i++}`;
      const meaning = await lookupHanziWord(hanziWord);
      invariant(meaning != null, `Missing hanzi word for ${hanziWord}`);
      inflated.push({ hanziWord, id, meaning });
      lookupById.set(id, { hanziWord, meaning });
    }

    const json = await openai(
      [`curriculum.md`, `word-representation.md`, `skill-types.md`],
      `
Can you check my word list for HSK1 and make sure it's correct. I need to know if the gloss I have for each word is correct.

There's too many to give you to check at once, so I'll give them to you in batches. Here's the first batch:

${JSON.stringify(
  inflated
    .map(({ hanziWord, meaning, id }) => {
      return `
- Hanzi: ${hanziFromHanziWord(hanziWord)}
  Gloss: ${JSON.stringify(meaning.gloss)}
  ID: ${id}
`;
    })
    .join(`\n`),
)}
  `,
      z.object({
        results: z.array(
          z.object({
            id: z.string(),
            isCorrect: z.boolean(),
            reason: z
              .string({
                description: `When the meaning isn't correct, explanation for why.`,
              })
              .optional(),
          }),
        ),
      }),
    );

    const resultBatch: HanziWordCheckResult[] = json.results.map((x) => {
      const res = lookupById.get(x.id);
      invariant(res != null, `Missing lookup for id=${x.id}`);
      return {
        hanziWord: res.hanziWord,
        isGood: x.isCorrect,
        reason: x.reason,
      };
    });

    results.push(...resultBatch);

    onProgress({
      resultBatch,
      itemsDone: results.length,
      itemsTotal: hsk1HanziWords.length,
    });
  }
}

const CheckHsk1HanziWordsApp = ({ onCancel }: { onCancel: () => void }) => {
  const [progressItemsDone, setProgressItemsDone] = useState<number>();
  const [progressItemsTotal, setProgressItemsTotal] = useState<number>();
  const [results, setResults] = useState<HanziWordCheckResult[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    void checkHsk1HanziWords((progress) => {
      setProgressItemsDone(progress.itemsDone);
      setProgressItemsTotal(progress.itemsTotal);
      setResults((results) => [...results, ...progress.resultBatch]);
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const isDone =
    progressItemsDone != null && progressItemsDone === progressItemsTotal;

  const lowConfidenceItems = results
    .filter((r) => !r.isGood)
    .filter((r) => archiveCache.get(r.reason) == null);

  const { isFocused } = useFocus({ autoFocus: true });

  const [focusItem, setFocusItem] = useState<HanziWordCheckResult | null>(null);

  return (
    <Box flexDirection="column" gap={1} marginTop={1}>
      {focusItem == null ? (
        <>
          <Text>
            Status:{` `}
            {isDone ? (
              <Text color="green">Done</Text>
            ) : (
              <>
                <Text color="green">
                  <Spinner />
                </Text>
                {` `}
                Fetching data…{` `}
                <Text dimColor>
                  ({progressItemsDone} / {progressItemsTotal})
                </Text>
              </>
            )}
          </Text>

          {lowConfidenceItems.length > 0 ? (
            <>
              <Text color="yellow">
                Low confidence items:{` `}
                <Text dimColor>{lowConfidenceItems.length}</Text>
              </Text>
              <Select
                visibleOptionCount={10}
                options={lowConfidenceItems.map((d) => ({
                  label: `${d.hanziWord} ${d.reason ?? ``}`,
                  value: d.hanziWord,
                }))}
                onChange={(hanziWord) => {
                  const item = lowConfidenceItems.find(
                    (x) => x.hanziWord === hanziWord,
                  );
                  if (item != null) {
                    setFocusItem(item);
                  }
                }}
              />
            </>
          ) : null}
          <Shortcut
            disabled={!isFocused}
            letter="esc"
            label="Back"
            action={() => {
              onCancel();
            }}
          />
        </>
      ) : null}

      {focusItem == null ? null : (
        <Box flexDirection="column" gap={1}>
          <Text>
            <Text bold>Item:</Text> {focusItem.hanziWord}
          </Text>

          <Box width={90} flexDirection="column">
            <Alert variant="warning">
              <Text>{focusItem.reason}</Text>
            </Alert>
            <Box marginLeft={5}>
              <Shortcut
                disabled={!isFocused}
                letter="a"
                label="Archive message"
                action={() => {
                  archiveCache.set(focusItem.reason, true);
                  setFocusItem(null);
                }}
              />
            </Box>
          </Box>

          <HanziEditor
            onCloseAction={() => {
              setFocusItem(null);
            }}
            wordListFileBaseName="hsk1HanziWords"
            hanzi={hanziFromHanziWord(focusItem.hanziWord)}
            key={focusItem.hanziWord}
          />
        </Box>
      )}
    </Box>
  );
};

const AfterDelay = ({
  delay,
  action,
}: {
  delay: number;
  action: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(action, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [action, delay]);

  return null;
};

const HanziEditor = ({
  hanzi,
  wordListFileBaseName,
  onCloseAction,
}: {
  hanzi: string;
  wordListFileBaseName: string;
  onCloseAction: () => void;
}) => {
  const [query, setQuery] = useState(``);

  const dict = useDictionary().data;
  const wordListHanziWords = useHanziWordList(wordListFileBaseName).data;
  const allHanziWords = useMemo(
    () =>
      dict == null
        ? null
        : new Map([...dict].filter(([k]) => hanziFromHanziWord(k) === hanzi)),
    [dict, hanzi],
  );

  const [location, setLocation] = useState<
    | { type: `list` }
    | { type: `create` }
    | { type: `createQuerying` }
    | {
        type: `queryPickResult`;
        results: { meaningKey: string; meaning: HanziWordMeaning }[];
      }
    | { type: `saved` }
    | { type: `editList` }
    | { type: `edit`; hanziWord: HanziWord }
    | null
  >({ type: `list` });

  const [newHanziWordList, setNewHanziWordList] = useState<HanziWord[]>();

  const options = useMemo(
    () =>
      [...(allHanziWords?.entries() ?? [])].map(([hanziWord, meaning]) => ({
        label: `${hanziWord} ${meaning.partOfSpeech} ${meaning.gloss.map((x) => `"${x}"`).join(`   `)} -- ${meaning.definition}`,
        value: hanziWord,
      })),
    [allHanziWords],
  );

  const onChangeAction = useCallback((value: string[]): void => {
    setNewHanziWordList(value as HanziWord[]);
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      {allHanziWords == null || wordListHanziWords == null ? (
        <Box gap={1}>
          <Spinner />
          <Text>Loading data…</Text>
        </Box>
      ) : location?.type === `saved` ? (
        <Box gap={1}>
          <Text color="green">Saved</Text>
          <AfterDelay
            delay={500}
            action={() => {
              setLocation({ type: `list` });
            }}
          />
        </Box>
      ) : location?.type === `edit` ? (
        <HanziWordEditor
          hanziWord={location.hanziWord}
          onCancel={() => {
            setLocation({ type: `editList` });
          }}
          onSave={() => {
            setLocation({ type: `saved` });
          }}
        />
      ) : location?.type === `editList` ? (
        <>
          <Text bold>Pick an item to edit:</Text>

          <Select
            options={options}
            onChange={(value) => {
              setLocation({ type: `edit`, hanziWord: value as HanziWord });
            }}
          />

          <Shortcuts>
            <Shortcut
              letter="esc"
              label="Back"
              action={() => {
                setLocation({ type: `list` });
              }}
            />
          </Shortcuts>
        </>
      ) : location?.type === `list` ? (
        <>
          <Text>
            <Text bold>
              {wordListFileBaseName}.asset.json entries for {hanzi}
            </Text>
            {` `}
            <Text dimColor>
              (<GoogleTranslateLink hanzi={hanzi} />)
            </Text>
          </Text>

          <MultiSelect
            defaultValue={wordListHanziWords}
            options={options}
            onChange={onChangeAction}
          />

          <Shortcuts>
            <Shortcut
              letter="a"
              label="Add"
              action={() => {
                setLocation({ type: `create` });
              }}
            />
            <Shortcut
              letter="e"
              label="Edit"
              action={() => {
                setLocation({ type: `editList` });
              }}
            />
            <Shortcut
              letter="esc"
              label="Back"
              action={() => {
                onCloseAction();
              }}
            />
          </Shortcuts>
        </>
      ) : location?.type === `queryPickResult` ? (
        <>
          <Text>
            <Text bold>
              {hanzi} &quot;{query}&quot;
            </Text>
            {` `}
            candidates:
          </Text>

          <Select2
            gap={1}
            items={location.results}
            visibleOptionCount={3}
            renderItem={(item) => (
              <DictionaryHanziWordEntry
                hanziWord={buildHanziWord(hanzi, item.meaningKey)}
                meaning={item.meaning}
              />
            )}
            onChange={(value) => {
              void (async () => {
                const hanziWord = buildHanziWord(hanzi, value.meaningKey);
                await upsertHanziWordMeaning(hanziWord, value.meaning);
                setLocation({ type: `saved` });
              })();
            }}
          />
        </>
      ) : location?.type === `createQuerying` ? (
        <Box gap={1}>
          <Spinner />
          <Text>
            Fetching meanings for {hanzi} &quot;{query}&quot;…
          </Text>
        </Box>
      ) : location?.type === `create` ? (
        <>
          <Text bold>Create a new hanzi meaning</Text>
          <Box>
            <Text dimColor>Gloss</Text>
            <TextInput
              value={query}
              onChange={setQuery}
              onSubmit={() => {
                void (async () => {
                  setLocation({ type: `createQuerying` });

                  const { results } = await openai(
                    [
                      `curriculum.md`,
                      `word-representation.md`,
                      `skill-types.md`,
                    ],
                    `
I want to create a new HanziWord entry for ${hanzi} based on the gloss: ${query}

Can you give me a few options to pick from.`,
                    z.object({
                      results: z.array(
                        z.object({
                          meaningKey: z.string(),
                          meaning: hanziWordMeaningSchema,
                        }),
                      ),
                    }),
                  );

                  setLocation({ type: `queryPickResult`, results });
                })();
              }}
            />
          </Box>

          <Shortcuts>
            <Shortcut
              letter="esc"
              label="Back"
              action={() => {
                setLocation({ type: `list` });
              }}
            />
          </Shortcuts>
        </>
      ) : null}

      {newHanziWordList == null ? null : (
        <Shortcuts>
          <Shortcut
            letter="s"
            label="Save"
            action={() => {
              void (async () => {
                await writeHanziWordList(
                  wordListFileBaseName,
                  newHanziWordList,
                );
                setLocation({ type: `saved` });
              })();
            }}
          />
        </Shortcuts>
      )}
    </Box>
  );
};

const HanziWordEditor = ({
  hanziWord,
  onCancel,
  onSave,
}: {
  hanziWord: HanziWord;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const dict = useDictionary().data;
  const meaning = dict?.get(hanziWord);

  return (
    <>
      <Text bold>Editing {hanziWord}</Text>

      <FormEditor
        form={[
          {
            id: `hanziWord`,
            label: `HanziWord`,
            value: hanziWord,
          },
          ...(meaning == null
            ? []
            : [
                {
                  id: `gloss`,
                  label: `gloss`,
                  value: meaning.gloss.join(`;`),
                },
                {
                  id: `pinyin`,
                  label: `pinyin`,
                  value: meaning.pinyin?.join(`;`) ?? ``,
                },
                {
                  id: `glossHint`,
                  label: `glossHint`,
                  value: meaning.glossHint ?? ``,
                },
                {
                  id: `visualVariants`,
                  label: `Visual variants`,
                  value: meaning.visualVariants?.join(`;`) ?? ``,
                },
                {
                  id: `componentFormOf`,
                  label: `Component form of`,
                  value: meaning.componentFormOf ?? ``,
                },
                {
                  id: `definition`,
                  label: `Definition`,
                  value: meaning.definition,
                },
                {
                  id: `partOfSpeech`,
                  label: `Part of speech`,
                  value: meaning.partOfSpeech,
                },
                {
                  id: `example`,
                  label: `Example`,
                  value: meaning.example ?? ``,
                },
              ]),
        ]}
        onCancel={() => {
          onCancel();
        }}
        onSubmit={(edits) => {
          void (async () => {
            const mutations = [];

            if (edits.has(`example`)) {
              const newExample = edits.get(`example`);
              invariant(newExample != null);

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  example: newExample,
                }),
              );
              edits.delete(`example`);
            }

            if (edits.has(`partOfSpeech`)) {
              const newValue = edits.get(`partOfSpeech`)?.trim();
              invariant(newValue != null);

              const newPartOfSpeech =
                newValue === ``
                  ? undefined
                  : partOfSpeechSchema.parse(newValue);
              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  partOfSpeech: newPartOfSpeech,
                }),
              );
              edits.delete(`partOfSpeech`);
            }

            if (edits.has(`definition`)) {
              const newDefinition = edits.get(`definition`)?.trim();
              invariant(newDefinition != null);

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  definition: newDefinition,
                }),
              );
              edits.delete(`definition`);
            }

            if (edits.has(`gloss`)) {
              const newValue = edits.get(`gloss`);
              invariant(newValue != null);

              const newArray = newValue
                .split(`;`)
                .map((x) => x.trim())
                .filter((x) => x !== ``);
              const newGloss = newArray.length > 0 ? newArray : undefined;

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  gloss: newGloss,
                }),
              );
              edits.delete(`gloss`);
            }

            if (edits.has(`glossHint`)) {
              const newGlossHint = edits.get(`glossHint`);
              invariant(newGlossHint != null);

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  glossHint: newGlossHint,
                }),
              );
              edits.delete(`glossHint`);
            }

            if (edits.has(`componentFormOf`)) {
              const newComponentFormOf = edits.get(`componentFormOf`) as
                | HanziChar
                | undefined;
              invariant(newComponentFormOf != null);

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  componentFormOf: newComponentFormOf,
                }),
              );
              edits.delete(`componentFormOf`);
            }

            if (edits.has(`visualVariants`)) {
              const newValue = edits.get(`visualVariants`);
              invariant(newValue != null);

              const newArray = newValue
                .split(`;`)
                .map((x) => x.trim())
                .filter((x) => x !== ``) as HanziText[];
              const newVisualVariants =
                newArray.length > 0 ? newArray : undefined;

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  visualVariants: newVisualVariants,
                }),
              );
              edits.delete(`visualVariants`);
            }

            if (edits.has(`pinyin`)) {
              const newValue = edits.get(`pinyin`);
              invariant(newValue != null);

              const newPinyin = newValue
                .split(`;`)
                .map((x) => x.trim())
                .filter((x) => x !== ``) as PinyinText[];

              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  pinyin: newPinyin,
                }),
              );
              edits.delete(`pinyin`);
            }

            // If there are changes to the ID do them last so that the other
            // mutations can assume the old ID and don't fall into sequencing
            // problems.
            if (edits.has(`hanziWord`)) {
              const newValue = edits.get(`hanziWord`);
              invariant(newValue != null);

              const newHanziWord = newValue as HanziWord;
              // data integrity checks
              hanziFromHanziWord(newHanziWord);
              meaningKeyFromHanziWord(newHanziWord);
              mutations.push(() => renameHanziWord(hanziWord, newHanziWord));
              edits.delete(`hanziWord`);
            }

            if (edits.size > 0) {
              throw new Error(
                `Unhandled edits: ${[...edits.keys()].join(`, `)}`,
              );
            }

            for (const mutation of mutations) {
              await mutation();
            }

            onSave();
          })();
        }}
      />
    </>
  );
};

const Shortcuts = ({ children }: { children: ReactNode }) => {
  const nonNullChilds = Children.map(children, (child) => child);
  return nonNullChilds == null || nonNullChilds.length === 0 ? null : (
    <Box gap={1}>
      {nonNullChilds.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Text dimColor>•</Text> : null}
          {child}
        </Fragment>
      ))}
    </Box>
  );
};

const Select2 = <T,>({
  items,
  filter,
  gap = 0,
  renderItem,
  onChange,
  visibleOptionCount = 5,
}: {
  items: T[];
  gap?: number;
  filter?: (query: string, item: T) => boolean;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  onChange?: (item: T) => void;
  visibleOptionCount?: number;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollIndexStart, setScrollIndexStart] = useState(0);
  const [query, setQuery] = useState(``);

  const filteredItems = useMemo(
    () =>
      filter == null || query === ``
        ? items
        : items.filter((x) => filter(query, x)),
    [filter, items, query],
  );
  const { isFocused } = useFocus({ autoFocus: true });
  const filteredItemCount = filteredItems.length;

  useInput((_input, key) => {
    if (isFocused) {
      if (key.upArrow) {
        setSelectedIndex((selectedIndex) => Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex((selectedIndex) =>
          Math.min(filteredItemCount - 1, selectedIndex + 1),
        );
      } else if (key.return) {
        const item = filteredItems[selectedIndex];
        invariant(item != null, `Missing item for index ${selectedIndex}`);
        onChange?.(item);
      }
    }
  });

  useEffect(() => {
    if (selectedIndex < scrollIndexStart) {
      setScrollIndexStart(selectedIndex);
    } else if (selectedIndex >= scrollIndexStart + visibleOptionCount) {
      setScrollIndexStart(selectedIndex - visibleOptionCount + 1);
    }
  }, [selectedIndex, scrollIndexStart, visibleOptionCount, filteredItemCount]);

  const scrollIndexEnd = Math.min(
    scrollIndexStart + visibleOptionCount,
    filteredItemCount,
  );

  return (
    <Box flexDirection="column" gap={1}>
      {filter == null ? null : (
        <TextInput
          focus={isFocused}
          value={query}
          onChange={(newValue) => {
            setSelectedIndex(0);
            setQuery(newValue);
          }}
          placeholder={isFocused ? `Type to search` : ` `}
        />
      )}
      <Box flexDirection="column" gap={gap}>
        {filteredItems
          .slice(scrollIndexStart, scrollIndexEnd)
          .map((item, index) => {
            const isSelected =
              isFocused && scrollIndexStart + index === selectedIndex;
            return (
              <Box key={index} gap={1}>
                <Box width={1} flexGrow={0} flexShrink={0}>
                  {isSelected ? <Text bold color="blue">{`❯`}</Text> : null}
                </Box>
                <Box>{renderItem(item, isSelected)}</Box>
              </Box>
            );
          })}
      </Box>
      <Text dimColor>
        Showing {Math.min(scrollIndexStart + 1, filteredItems.length)}-
        {scrollIndexEnd}
        {` `}
        of{` `}
        {filteredItems.length}
      </Text>
    </Box>
  );
};

const UncontrolledTextInput = ({
  defaultValue,
  onChange,
  onSubmit,
  placeholder,
  focus,
}: {
  focus?: boolean;
  defaultValue: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}) => {
  const [query, setQuery] = useState(defaultValue);

  return (
    <TextInput
      focus={focus}
      placeholder={placeholder}
      value={query}
      onChange={(value) => {
        setQuery(value);
        onChange?.(value);
      }}
      onSubmit={() => {
        onSubmit?.(query);
      }}
    />
  );
};

const Button = ({
  label,
  action,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
  action: () => void;
}) => {
  const { isFocused } = useFocus({ isActive: !disabled });

  useInput((_input, k) => {
    if (isFocused && k.return) {
      action();
    }
  });

  return (
    <Text dimColor={!isFocused} color="blueBright" underline={isFocused}>
      {label}
    </Text>
  );
};

const Shortcut = ({
  label,
  letter,
  action,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
  letter: string;
  action: () => void;
}) => {
  useInput((input, k) => {
    if (
      !disabled &&
      ((letter === `esc` && k.escape) ||
        (letter === `enter` && k.return) ||
        (input === letter && k.ctrl))
    ) {
      action();
    }
  });

  return (
    <Text dimColor={disabled}>
      <Text bold={!disabled} underline>
        {[`esc`, `enter`].includes(letter) ? letter : `^${letter}`}
      </Text>
      {` `}
      <Text dimColor>{label}</Text>
    </Text>
  );
};

const DictionaryEditor = ({ onCancel }: { onCancel: () => void }) => {
  const [location, setLocation] = useState<
    | { type: `list` }
    | { type: `view`; hanziWord: HanziWord }
    | { type: `edit`; hanziWord: HanziWord }
    | { type: `merge`; hanziWord: HanziWord; otherHanziWord?: HanziWord }
    | null
  >({ type: `list` });

  switch (location?.type) {
    case `list`: {
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Dictionary editor</Text>

          <Box paddingX={1} borderStyle="round" borderDimColor>
            <DictionaryPicker
              onSubmit={(hanziWords) => {
                const hanziWord = hanziWords[0];
                if (hanziWord != null) {
                  setLocation({ type: `view`, hanziWord });
                }
              }}
            />
          </Box>

          <Shortcuts>
            <Button
              label="Cancel"
              action={() => {
                onCancel();
              }}
            />
          </Shortcuts>
        </Box>
      );
    }
    case `view`: {
      return (
        <Box flexDirection="column" gap={1}>
          <DictionaryHanziWordEntry hanziWord={location.hanziWord} />
          <DongChineseHanziEntry
            hanzi={hanziFromHanziWord(location.hanziWord)}
          />
          <Shortcuts>
            <Button
              label="Edit…"
              action={() => {
                setLocation({ type: `edit`, hanziWord: location.hanziWord });
              }}
            />
            <Button
              label="Merge…"
              action={() => {
                setLocation({ type: `merge`, hanziWord: location.hanziWord });
              }}
            />
            <Button
              label="Back"
              action={() => {
                setLocation({ type: `list` });
              }}
            />
          </Shortcuts>
        </Box>
      );
    }
    case `edit`: {
      return (
        <Box flexDirection="column" gap={1}>
          <HanziWordEditor
            hanziWord={location.hanziWord}
            onSave={() => {
              setLocation({ type: `view`, hanziWord: location.hanziWord });
            }}
            onCancel={() => {
              setLocation({ type: `list` });
            }}
          />
        </Box>
      );
    }
    case `merge`: {
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Merge:</Text>

          <Box borderStyle="round" paddingX={1} borderDimColor>
            <DictionaryHanziWordEntry hanziWord={location.hanziWord} />
          </Box>

          <Text bold>With:</Text>

          <Box borderStyle="round" paddingX={1}>
            {location.otherHanziWord == null ? (
              <DictionaryPicker
                readonly
                visibleOptionCount={2}
                onSubmit={(hanziWords) => {
                  setLocation({
                    type: `merge`,
                    hanziWord: location.hanziWord,
                    otherHanziWord: hanziWords[0],
                  });
                }}
              />
            ) : (
              <DictionaryHanziWordEntry hanziWord={location.otherHanziWord} />
            )}
          </Box>

          {location.otherHanziWord == null ? null : (
            <Box
              borderStyle="round"
              paddingX={1}
              borderColor="yellow"
              flexDirection="column"
            >
              <Text bold>Merge strategy</Text>

              <Select2
                items={[`keepOther`, `deleteOther`] as const}
                renderItem={(item, isSelected) => {
                  invariant(
                    location.otherHanziWord != null,
                    `Missing other word`,
                  );
                  return (
                    <Box>
                      <Text color={isSelected ? `blueBright` : undefined}>
                        {item === `keepOther` ? (
                          <Text>
                            Keep {location.otherHanziWord} and delete{` `}
                            <Text strikethrough>{location.hanziWord}</Text>
                          </Text>
                        ) : (
                          <Text>
                            Keep {location.hanziWord} and delete{` `}
                            <Text strikethrough>{location.otherHanziWord}</Text>
                          </Text>
                        )}
                      </Text>
                    </Box>
                  );
                }}
                onChange={(value) => {
                  void (async () => {
                    const hanziWordToKeep =
                      value === `deleteOther`
                        ? location.hanziWord
                        : location.otherHanziWord;
                    const hanziWordToRemove =
                      value === `deleteOther`
                        ? location.otherHanziWord
                        : location.hanziWord;
                    invariant(
                      hanziWordToKeep != null && hanziWordToRemove != null,
                      `Missing hanzi words`,
                    );

                    await mergeHanziWord(hanziWordToRemove, hanziWordToKeep);

                    setLocation({ type: `view`, hanziWord: hanziWordToKeep });
                  })();
                }}
              />
            </Box>
          )}

          <Shortcuts>
            <Button
              label="Back"
              action={() => {
                setLocation({ type: `list` });
              }}
            />
          </Shortcuts>
        </Box>
      );
    }
    case undefined: {
      return null;
    }
  }
};

const DongChineseHanziEntry = ({ hanzi }: { hanzi: string }) => {
  const dongChinese = useInternetQuery({
    queryKey: [`dongChineseData`],
    queryFn: dongChineseData,
  });

  const lookup = useMemo(
    () => dongChinese.data?.lookupChar(hanzi),
    [dongChinese, hanzi],
  );

  if (dongChinese.isLoading) {
    return (
      <Box gap={1}>
        <Text dimColor>
          <Spinner /> Loading Dong Chinese data…
        </Text>
      </Box>
    );
  }

  if (lookup == null) {
    return (
      <Box gap={1}>
        <Text color="red">No Dong Chinese data for {hanzi}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={0}>
      <Text>
        <Text italic>Dong Chinese</Text>
        {` `}
        {lookup.isVerified === true ? (
          <Text color="green" dimColor>
            (verified)
          </Text>
        ) : (
          <Text dimColor>(not verified)</Text>
        )}
      </Text>
      <Box
        paddingLeft={1}
        flexDirection="column"
        borderLeft
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderStyle="single"
        borderLeftDimColor
      >
        {lookup.gloss == null ? null : (
          <Text>
            <Text dimColor>gloss:</Text> {lookup.gloss}
          </Text>
        )}
        {lookup.pinyinFrequencies == null ? null : (
          <Text>
            <Text dimColor>pinyin:</Text>
            {` `}
            <SemiColonList items={getDongChinesePinyin(lookup) ?? empty} />
          </Text>
        )}
        {lookup.hint == null ? null : (
          <Text>
            <Text dimColor>hint:</Text> {lookup.hint}
          </Text>
        )}
        {lookup.variantOf == null ? null : (
          <Text>
            <Text dimColor>variant of:</Text> {lookup.variantOf}
          </Text>
        )}
        {lookup.simpVariants == null ? null : (
          <Text>
            <Text dimColor>simpVariants:</Text>
            {` `}
            <SemiColonList items={lookup.simpVariants} />
          </Text>
        )}
        {lookup.originalMeaning == null ? null : (
          <Text>
            <Text dimColor>original meaning:</Text> {lookup.originalMeaning}
          </Text>
        )}
        {lookup.images == null ? null : (
          <Text>
            <Text dimColor>images:</Text> {lookup.images.length}
          </Text>
        )}
      </Box>
    </Box>
  );
};

const WordListEditor = ({
  wordListName,
  onCancel,
}: {
  wordListName: string;
  onCancel: () => void;
}) => {
  const [location, setLocation] = useState<
    | { type: `list` }
    | { type: `edit`; hanziWord: HanziWord }
    | { type: `add` }
    | null
  >({ type: `list` });

  switch (location?.type) {
    case `list`: {
      return (
        <Box gap={1} flexDirection="column">
          <WordListHanziPicker
            wordListName={wordListName}
            onSubmit={(hanziWord) => {
              setLocation({ type: `edit`, hanziWord });
            }}
          />

          <Box flexGrow={1} />

          <Shortcuts>
            <Shortcut letter="esc" label="Back" action={onCancel} />
            <Shortcut
              letter="a"
              label="Add"
              action={() => {
                setLocation({ type: `add` });
              }}
            />
          </Shortcuts>
        </Box>
      );
    }
    case `edit`: {
      return (
        <HanziEditor
          hanzi={hanziFromHanziWord(location.hanziWord)}
          wordListFileBaseName={wordListName}
          onCloseAction={() => {
            setLocation({ type: `list` });
          }}
        />
      );
    }
    case `add`: {
      return (
        <DictionaryPicker
          onSubmit={(hanziWords) => {
            void (async () => {
              for (const hanziWord of hanziWords) {
                await upsertHanziWordWordList(hanziWord, wordListName);
              }
              setLocation({ type: `list` });
            })();
          }}
          onCancel={() => {
            setLocation({ type: `list` });
          }}
        />
      );
    }
    case undefined: {
      return null;
    }
  }
};

const WordListHanziPicker = ({
  wordListName,
  onSubmit,
}: {
  wordListName: string;
  onSubmit: (hanziWord: HanziWord) => void;
}) => {
  const wordList = useHanziWordList(wordListName).data;

  return (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Text bold>{wordListName}.asset.json</Text>

      <Select2
        items={wordList ?? []}
        filter={(query, item) => item.includes(query)}
        visibleOptionCount={10}
        renderItem={(hanziWord, isSelected) => (
          <Text color={isSelected ? `blueBright` : undefined}>{hanziWord}</Text>
        )}
        onChange={(hanziWord) => {
          onSubmit(hanziWord);
        }}
      />
    </Box>
  );
};

interface HanziWordCreateNewResult {
  type: `new`;
  sources: (`dongChinese` | `openai`)[];
  isVerified?: boolean;
  hanziWord: HanziWord;
  meaning: HanziWordMeaning;
}

interface HanziWordCreateExistingResult {
  type: `existing`;
  hanziWord: HanziWord;
}

type HanziWordCreateResult =
  | HanziWordCreateNewResult
  | HanziWordCreateExistingResult;

interface GenerateHanziWordQuery {
  hanzi: string;
  description?: string | null;
  existingItems?: DeepReadonly<HanziWordWithMeaning[]>;
}

async function queryOpenAi(query: unknown) {
  const { suggestions } = await openai(
    [`curriculum.md`, `word-representation.md`, `skill-types.md`],
    `
I have a hanzi I want to add to a word list, can fill in the rest of the data for me?

${JSON.stringify(query)}
`,
    z.object({
      suggestions: z.array(
        z.object({
          type: z.literal(`new`),
          hanzi: z.string(),
          meaning: hanziWordMeaningSchema,
          meaningKey: z.string(),
        }),
      ),
    }),
  );

  return suggestions;
}

async function generateHanziWordResults(
  query: GenerateHanziWordQuery,
): Promise<HanziWordCreateResult[]> {
  const res: HanziWordCreateResult[] = [];

  // Give existing dictionary options
  if (query.existingItems != null) {
    for (const [hanziWord] of query.existingItems) {
      res.push({ type: `existing`, hanziWord });
    }
  }

  for (const x of await queryOpenAi(query)) {
    res.push({
      type: `new`,
      sources: [`openai`],
      hanziWord: buildHanziWord(query.hanzi, x.meaningKey),
      meaning: x.meaning,
    });
  }

  // Check dong chinese
  {
    const dongChinese = await dongChineseData();
    const lookup = dongChinese.lookupChar(query.hanzi);

    if (lookup != null) {
      const meaningKey = getDongChineseMeaningKey(lookup);
      const gloss = getDongChineseGloss(lookup);

      if (meaningKey != null && gloss != null) {
        // const gloss = cleanGloss(lookup.gloss);
        const hanziWord = buildHanziWord(query.hanzi, meaningKey);

        res.push({
          type: `new`,
          sources: [`dongChinese`],
          isVerified: lookup.isVerified,
          hanziWord,
          meaning: {
            gloss,
            pinyin: getDongChinesePinyin(lookup),
            definition: lookup.hint ?? `<no def>`,
            partOfSpeech: `unknown`,
          },
        });

        // Add a mixed version with OpenAI
        for (const openAiResult of await queryOpenAi({
          hanzi: query.hanzi,
          gloss: lookup.gloss,
          hint: lookup.hint,
        })) {
          res.splice(0, 0, {
            type: `new`,
            sources: [`dongChinese`, `openai`],
            isVerified: lookup.isVerified,
            hanziWord,
            meaning: {
              gloss,
              pinyin: getDongChinesePinyin(lookup),
              definition: openAiResult.meaning.definition,
              partOfSpeech: openAiResult.meaning.partOfSpeech,
              example: openAiResult.meaning.example,
            },
          });
        }
      }
    }
  }

  return res;
}

const DictionaryPicker = ({
  readonly = false,
  onSubmit,
  onCancel,
  visibleOptionCount = 3,
}: {
  readonly?: boolean;
  onSubmit: (hanziWords: HanziWord[]) => void;
  visibleOptionCount?: number;
  onCancel?: () => void;
}) => {
  const dict = useDictionary().data;

  const items = useMemo(
    () =>
      [...(dict ?? [])].sort(
        mergeSortComparators(
          sortComparatorNumber(
            ([hanziWord]) => hanziFromHanziWord(hanziWord).length,
          ),
          sortComparatorString(([hanziWord]) => hanziFromHanziWord(hanziWord)),
          sortComparatorString(([hanziWord]) =>
            meaningKeyFromHanziWord(hanziWord),
          ),
        ),
      ),
    [dict],
  );

  const [location, setLocation] = useState<
    | { type: `list` }
    | { type: `bulkCreateInput` }
    | {
        type: `bulkCreateTriage`;
        queue: GenerateHanziWordQuery[];
        result: HanziWord[];
      }
    | {
        type: `bulkCreateQuerying`;
        abortController: AbortController;
        results: HanziWordCreateResult[];
        remainingItems: number;
      }
    | null
  >({ type: `list` });

  let item;

  return location?.type === `list` ? (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Box flexGrow={1} flexShrink={1} flexDirection="column">
        <Select2
          gap={1}
          filter={hanziWordQueryFilter}
          items={items}
          renderItem={([hanziWord, meaning]) => (
            <DictionaryHanziWordEntry hanziWord={hanziWord} meaning={meaning} />
          )}
          onChange={([hanziWord]) => {
            onSubmit([hanziWord]);
          }}
          visibleOptionCount={visibleOptionCount}
        />
      </Box>

      <Shortcuts>
        {onCancel == null ? null : <Button label="Cancel" action={onCancel} />}
        {readonly ? null : (
          <Button
            label="Add"
            action={() => {
              setLocation({ type: `bulkCreateInput` });
            }}
          />
        )}
      </Shortcuts>
    </Box>
  ) : location?.type === `bulkCreateInput` ? (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Text bold>Bulk create:</Text>
      <MultiLinePasteInput
        label="One or more lines of <hanzi>[: <description>]"
        onSubmit={(lines) => {
          void (async () => {
            const queries: GenerateHanziWordQuery[] = [];

            linesLoop: for (const line of lines) {
              if (line.trim() === ``) {
                continue;
              }

              const [hanzi, rest] = line.split(`:`);
              invariant(hanzi != null, `Missing hanzi for ${line}`);

              // Normalize an empty/missing description to 'null'
              const description =
                rest == null || rest.trim() === `` ? null : rest.trim();

              const existingItems = await lookupHanzi(hanzi);
              queries.push({ hanzi, description, existingItems });
            }

            setLocation({
              type: `bulkCreateTriage`,
              queue: queries,
              result: [],
            });
          })();
        }}
      />

      <Shortcuts>
        <Shortcut
          letter="esc"
          label="Back"
          action={() => {
            setLocation({ type: `list` });
          }}
        />
      </Shortcuts>
    </Box>
  ) : location?.type === `bulkCreateTriage` ? (
    <Box flexDirection="column" gap={1}>
      <Text bold>Triage input:</Text>

      {(item = location.queue[0]) == null ? (
        <>
          <Alert variant="success">All done!</Alert>
          <AfterDelay
            delay={1000}
            action={() => {
              onSubmit(location.result);
            }}
          />
        </>
      ) : (
        <>
          <Alert variant="info">
            <Text>
              {item.hanzi}
              {item.description}
              {` `}
              <Text dimColor>({location.queue.length - 1} remaining)</Text>
            </Text>
          </Alert>

          <Text bold>Pick an option:</Text>
          <GenerateHanziWordOptions
            query={item}
            onSubmit={(result) => {
              void (async () => {
                const newResults = [...location.result];
                if (result.type === `new`) {
                  await upsertHanziWordMeaning(
                    result.hanziWord,
                    result.meaning,
                  );
                  newResults.push(result.hanziWord);
                } else {
                  newResults.push(result.hanziWord);
                }

                setLocation({
                  type: `bulkCreateTriage`,
                  queue: location.queue.slice(1),
                  result: newResults,
                });
              })();
            }}
          />
        </>
      )}

      <Shortcuts>
        {onCancel == null ? null : (
          <Button
            label="Cancel"
            action={() => {
              onCancel();
            }}
          />
        )}
        <Button
          label="Save"
          action={() => {
            onSubmit(location.result);
          }}
        />
      </Shortcuts>
    </Box>
  ) : null;
};

const GenerateHanziWordOptions = ({
  query,
  onSubmit,
}: {
  query: GenerateHanziWordQuery;
  onSubmit: (result: HanziWordCreateResult) => void;
}) => {
  const [location, setLocation] = useState<
    | { type: `querying` }
    | { type: `picker`; results: HanziWordCreateResult[] }
    | null
  >({ type: `querying` });

  useEffect(() => {
    void (async () => {
      setLocation({ type: `querying` });
      const results = await generateHanziWordResults(query);
      setLocation({ type: `picker`, results });
    })();
  }, [query]);

  return location?.type === `querying` ? (
    <Box flexDirection="column" gap={1}>
      <Alert variant="info">
        <Spinner /> Querying for {query.hanzi}
        {query.description == null ? `` : ` ` + query.description}…
      </Alert>
    </Box>
  ) : location?.type === `picker` ? (
    <Select2
      items={location.results}
      renderItem={(item) => (
        <Box>
          <DictionaryHanziWordEntry
            hanziWord={item.hanziWord}
            meaning={item.type === `new` ? item.meaning : undefined}
            flags={
              item.type === `new` ? (
                <>
                  {item.sources.includes(`openai`) ? (
                    <Text bold backgroundColor="white" color="black">
                      {` `}OpenAI{` `}
                    </Text>
                  ) : null}
                  {item.sources.includes(`dongChinese`) ? (
                    <Text bold backgroundColor="red" color="white">
                      {` `}DongChinese{` `}
                    </Text>
                  ) : null}

                  {item.isVerified === true ? (
                    <Text bold backgroundColor="green">
                      {` `}verified{` `}
                    </Text>
                  ) : null}
                  <Text bold backgroundColor="yellow">
                    {` `}
                    {item.type}
                    {` `}
                  </Text>
                </>
              ) : null
            }
          />
        </Box>
      )}
      onChange={(value) => {
        onSubmit(value);
      }}
    />
  ) : null;
};

const MultiLinePasteInput = ({
  label,
  onSubmit,
}: {
  label: string;
  onSubmit: (value: string[]) => void;
}) => {
  const [text, setText] = useState<string>();

  const lines = useMemo(
    () => text?.split(/\n\r|\r/g).map((x) => x.trim()),
    [text],
  );

  useInput((input, key) => {
    if (key.delete || key.backspace) {
      setText(undefined);
    } else if (key.return && lines != null) {
      onSubmit(lines);
    } else if (input.length > 0) {
      setText((text) => (text ?? ``) + input);
    }
  });

  const maxLines = 10;

  return (
    <Box flexDirection="column">
      <Text bold>{label}:</Text>
      <Box borderStyle="round" padding={1} flexDirection="column">
        {lines == null ? (
          <Text dimColor>Paste {`⌘+v`} from clipboard</Text>
        ) : (
          <>
            {lines.slice(0, maxLines).map((x, i) => (
              <Text key={i}>{x}</Text>
            ))}
            {lines.length > maxLines ? (
              <Text dimColor>… {lines.length - maxLines} lines hidden</Text>
            ) : null}
          </>
        )}
      </Box>
      <Text dimColor>Press delete or backspace to clear</Text>
    </Box>
  );
};

const queryClient = new QueryClient();

const App = () => {
  const [location, setLocation] = useState<
    | { type: `checkHsk1HanziWords` }
    | { type: `wordListEditor`; wordListName: string }
    | { type: `dictionaryEditor` }
    | null
  >();

  return (
    <QueryClientProvider client={queryClient}>
      {location?.type === `checkHsk1HanziWords` ? (
        <CheckHsk1HanziWordsApp
          onCancel={() => {
            setLocation(undefined);
          }}
        />
      ) : location?.type === `wordListEditor` ? (
        <WordListEditor
          wordListName={location.wordListName}
          onCancel={() => {
            setLocation(undefined);
          }}
        />
      ) : location?.type === `dictionaryEditor` ? (
        <DictionaryEditor
          onCancel={() => {
            setLocation(undefined);
          }}
        />
      ) : (
        <Select
          options={[
            {
              value: `dictionaryEditor`,
              label: `Edit dictionary`,
            },
            { value: `checkHsk1HanziWords`, label: `Check HSK1 hanzi words` },
            {
              value: `hsk1WordList`,
              label: `HSK1 word list`,
            },
            {
              value: `hsk2WordList`,
              label: `HSK2 word list`,
            },
            {
              value: `hsk3WordList`,
              label: `HSK3 word list`,
            },
            {
              value: `editRadicalsWordList`,
              label: `Edit radicals word list`,
            },
          ]}
          onChange={(value) => {
            switch (value) {
              case `checkHsk1HanziWords`: {
                setLocation({ type: `checkHsk1HanziWords` });

                break;
              }
              case `hsk1WordList`: {
                setLocation({
                  type: `wordListEditor`,
                  wordListName: `hsk1HanziWords`,
                });

                break;
              }
              case `hsk2WordList`: {
                setLocation({
                  type: `wordListEditor`,
                  wordListName: `hsk2HanziWords`,
                });

                break;
              }
              case `hsk3WordList`: {
                setLocation({
                  type: `wordListEditor`,
                  wordListName: `hsk3HanziWords`,
                });

                break;
              }
              case `editRadicalsWordList`: {
                setLocation({
                  type: `wordListEditor`,
                  wordListName: `radicalsHanziWords`,
                });

                break;
              }
              case `dictionaryEditor`: {
                setLocation({
                  type: `dictionaryEditor`,
                });

                break;
              }
              // No default
            }
          }}
        />
      )}
    </QueryClientProvider>
  );
};

render(<App />);

function hanziWordQueryFilter(
  query: string,
  [hanziWord, meaning]: DeepReadonly<HanziWordWithMeaning>,
) {
  return (
    hanziWord.includes(query) ||
    meaning.gloss.some((x) => x.includes(query)) ||
    (meaning.visualVariants?.some((x) => x.includes(query)) ?? false) ||
    (meaning.pinyin?.some((x) => x.includes(query)) ?? false)
  );
}

function useDictionary() {
  return useLocalQuery({
    queryKey: [`loadDictionary`],
    queryFn: async () => {
      return await readDictionary();
    },
  });
}

const DictionaryHanziWordEntry = ({
  hanziWord,
  meaning,
  flags,
}: {
  hanziWord: HanziWord;
  meaning?: HanziWordMeaning;
  flags?: ReactNode;
}) => {
  const res = useDictionary();

  meaning ??= res.data?.get(hanziWord);

  const hsk1WordList = useHanziWordList(`hsk1HanziWords`).data;
  const hsk2WordList = useHanziWordList(`hsk2HanziWords`).data;
  const hsk3WordList = useHanziWordList(`hsk3HanziWords`).data;
  const radicalsWordList = useHanziWordList(`radicalsHanziWords`).data;

  const flagElement = useMemo(() => {
    const nonNullChilds = Children.map(flags, (child) => child);
    return nonNullChilds == null || nonNullChilds.length === 0 ? null : (
      <Box gap={1}>
        {nonNullChilds.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <Text>{` `}</Text> : null}
            {child}
          </Fragment>
        ))}
      </Box>
    );
  }, [flags]);

  const refs = useMemo(() => {
    const refs: string[] = [];
    for (const [wordListName, wordList] of [
      [`hsk1`, hsk1WordList],
      [`hsk2`, hsk2WordList],
      [`hsk3`, hsk3WordList],
      [`radicals`, radicalsWordList],
    ] as const) {
      if (wordList?.includes(hanziWord) === true) {
        refs.push(wordListName);
      }
    }
    return refs;
  }, [hanziWord, hsk1WordList, hsk2WordList, hsk3WordList, radicalsWordList]);

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between">
        <Text>
          <Text color="cyan">{hanziWord}</Text>
          {refs.length > 0 ? <Text dimColor> ({refs.join(`, `)})</Text> : ``}
        </Text>
        {flagElement}
      </Box>
      {meaning == null ? null : (
        <Box
          paddingLeft={1}
          flexDirection="column"
          borderLeft
          borderTop={false}
          borderRight={false}
          borderBottom={false}
          borderStyle="single"
          borderLeftDimColor
        >
          <Text>
            <Text bold dimColor>
              gloss:
            </Text>
            {` `}
            <SemiColonList items={meaning.gloss} />
          </Text>

          {meaning.pinyin == null ? null : (
            <Text>
              <Text bold dimColor>
                pinyin:
              </Text>
              {` `}
              <SemiColonList items={meaning.pinyin} />
            </Text>
          )}
          <Text>
            <Text bold dimColor>
              definition:
            </Text>
            {` `}
            {meaning.definition}
          </Text>
          <Text>
            <Text bold dimColor>
              part of speech:
            </Text>
            {` `}
            <Text italic>{meaning.partOfSpeech}</Text>
          </Text>
          <Text>
            <Text bold dimColor>
              example:
            </Text>
            {` `}
            {meaning.example}
          </Text>
          {meaning.visualVariants == null ? null : (
            <Text>
              <Text bold dimColor>
                visual variants:
              </Text>
              {` `}
              <SemiColonList items={meaning.visualVariants} />
            </Text>
          )}
          {meaning.componentFormOf == null ? null : (
            <Text>
              <Text bold dimColor>
                component form of:
              </Text>
              {` `}
              {meaning.componentFormOf}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

const SemiColonList = ({ items }: { items: readonly string[] }) => (
  <>
    {items.map((x, i) => (
      <Text key={i}>
        {i > 0 ? <Text dimColor>; </Text> : null}
        {x}
      </Text>
    ))}
  </>
);

const dictionaryPath = path.join(import.meta.dirname, `../src/dictionary/`);

const dictionaryFilePath = path.join(dictionaryPath, `dictionary.asset.json`);

const readDictionary = () =>
  readFileWithSchema(dictionaryFilePath, dictionarySchema, new Map());

async function renameHanziWord(
  oldHanziWord: HanziWord,
  newHanziWord: HanziWord,
) {
  const dict = await readDictionary();

  const meaning = dict.get(oldHanziWord);
  invariant(meaning != null, `missing meaning for ${oldHanziWord}`);

  invariant(!dict.has(newHanziWord), `the new meaning-key already exists`);

  dict.set(newHanziWord, meaning);
  dict.delete(oldHanziWord);
  await writeDictionary(dict);

  for (const wordListFileName of wordListFileNames) {
    const hanziWordList = await readHanziWordList(wordListFileName);
    const newHanziWordList = hanziWordList.map((x) =>
      x === oldHanziWord ? newHanziWord : x,
    );
    if (!isEqual(hanziWordList, newHanziWordList)) {
      await writeHanziWordList(wordListFileName, newHanziWordList);
    }
  }
}

async function mergeHanziWord(
  hanziWordToRemove: HanziWord,
  hanziWordToKeep: HanziWord,
) {
  const dict = await readDictionary();

  invariant(dict.has(hanziWordToRemove), `the old meaning-key does not exist`);
  invariant(dict.has(hanziWordToKeep), `the new meaning-key does not exist`);

  dict.delete(hanziWordToRemove);

  await writeDictionary(dict);

  // Update all word lists
  for (const wordListFileName of wordListFileNames) {
    const data = await readHanziWordList(wordListFileName);
    const filtered = data
      .map((x) => (x === hanziWordToRemove ? hanziWordToKeep : x))
      .filter(arrayFilterUniqueWithKey((x) => x));
    await writeHanziWordList(wordListFileName, filtered);
  }
}

async function upsertHanziWordMeaning(
  hanziWord: HanziWord,
  patch: Partial<HanziWordMeaning>,
) {
  const dict = await readDictionary();

  if (patch.pinyin?.length === 0) {
    patch.pinyin = undefined;
  }

  if (patch.definition?.trim().length === 0) {
    patch.definition = undefined;
  }

  if (patch.example?.trim().length === 0) {
    patch.example = undefined;
  }

  if (patch.glossHint?.trim().length === 0) {
    patch.glossHint = undefined;
  }

  if (patch.visualVariants?.length === 0) {
    patch.visualVariants = undefined;
  }

  if (patch.componentFormOf?.trim().length === 0) {
    patch.componentFormOf = undefined;
  }

  const meaning = dict.get(hanziWord);
  if (meaning == null) {
    const res = hanziWordMeaningSchema.safeParse(patch);
    if (res.success) {
      dict.set(hanziWord, res.data);
    } else {
      throw new Error(
        `Could not create a new meaning for ${hanziWord} (patch is incomplete)`,
      );
    }
  } else {
    const newMeaning = { ...meaning, ...patch };
    // Validate the data before saving.
    hanziWordMeaningSchema.parse(newMeaning);
    dict.set(hanziWord, newMeaning);
  }

  await writeDictionary(dict);
}

async function writeDictionary(data: Map<HanziWord, HanziWordMeaning>) {
  await writeUtf8FileIfChanged(
    dictionaryFilePath,
    jsonStringifyIndentOneLevel(
      [...data.entries()].sort(sortComparatorString((x) => x[0])),
    ),
  );
  await queryClient.invalidateQueries({ queryKey: [`loadDictionary`] });
}

async function upsertHanziWordWordList(
  hanziWord: HanziWord,
  wordListFileName: string,
) {
  const data = await readHanziWordList(wordListFileName);

  if (!data.includes(hanziWord)) {
    data.push(hanziWord);
    await writeHanziWordList(wordListFileName, data);
    await queryClient.invalidateQueries({
      queryKey: [`loadHanziWordList`, wordListFileName],
    });
  }
}

function useHanziWordList(wordListFileName: string) {
  return useLocalQuery({
    queryKey: [`loadHanziWordList`, wordListFileName],
    queryFn: async () => {
      return await readHanziWordList(wordListFileName);
    },
  });
}

async function readHanziWordList(name: string) {
  return await readFileWithSchema(
    path.join(dictionaryPath, `${name}.asset.json`),
    wordListSchema,
    [],
  );
}

async function writeHanziWordList(wordListFileName: string, data: HanziWord[]) {
  await writeUtf8FileIfChanged(
    path.join(dictionaryPath, `${wordListFileName}.asset.json`),
    jsonStringifyIndentOneLevel(data.sort()),
  );
}

const GoogleTranslateLink = ({ hanzi }: { hanzi: string }) => (
  <Link
    url={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(hanzi)}&op=translate`}
  >
    Google Translate
  </Link>
);

interface FormField {
  id: string;
  label: string;
  value: string;
}

type FormEdits = Map</* fieldId */ string, /* newValue */ string>;

const FormEditor = ({
  form,
  onSubmit,
  onCancel,
}: {
  form: Form;
  onCancel: () => void;
  onSubmit: (edits: FormEdits) => void;
}) => {
  const [edits, setEdits] = useState<FormEdits>(new Map());

  const [location, setLocation] = useState<
    { type: `view` } | { type: `edit`; fieldId: string }
  >({ type: `view` });

  if (location.type === `edit`) {
    return (
      <FormFieldEditor
        form={form}
        fieldId={location.fieldId}
        edits={edits}
        onSubmit={(newValue) => {
          setEdits((edits) =>
            // Remove the edit if the value is the same as the original, otherwise update it.
            newValue === form.find((f) => f.id === location.fieldId)?.value
              ? new Map(
                  [...edits].filter(([fieldId]) => fieldId != location.fieldId),
                )
              : new Map([...edits, [location.fieldId, newValue]]),
          );
          setLocation({ type: `view` });
        }}
        onCancel={() => {
          setLocation({ type: `view` });
        }}
      />
    );
  }
  return (
    <FormViewMode
      form={form}
      edits={edits}
      onSave={() => {
        onSubmit(edits);
      }}
      onCancel={onCancel}
      onEditField={(id) => {
        setLocation({ type: `edit`, fieldId: id });
      }}
    />
  );
};

function applyFormEdits(form: Form, edits: FormEdits): Map<string, string> {
  const data = new Map<string, string>(
    form.map((field) => [field.id, field.value]),
  );
  for (const [id, newValue] of edits) {
    data.set(id, newValue);
  }
  return data;
}

const FormViewMode = ({
  form,
  edits,
  onEditField,
  onSave,
  onCancel,
}: {
  onEditField: (id: string) => void;
  form: Form;
  edits: FormEdits;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const [focusedFieldId, setFocusedFieldId] = useState<string>();

  const draftData = useMemo(() => applyFormEdits(form, edits), [edits, form]);

  useInput((_input, key) => {
    if (key.upArrow) {
      setFocusedFieldId((id) => {
        const index = form.findIndex((x) => x.id === id);
        return form[Math.max(0, index - 1)]?.id ?? id;
      });
    } else if (key.downArrow) {
      setFocusedFieldId((id) => {
        const index = form.findIndex((x) => x.id === id);
        return form[Math.min(form.length - 1, index + 1)]?.id ?? id;
      });
    } else if (key.return && focusedFieldId != null) {
      onEditField(focusedFieldId);
    }
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {form.map((field) => {
          const isFocused = field.id === focusedFieldId;
          const isDirty = edits.has(field.id);
          return (
            <Box
              key={field.id}
              borderColor={isFocused ? `blue` : undefined}
              borderStyle="round"
              marginLeft={1}
              paddingX={1}
              gap={1}
            >
              <Text bold>{field.label}:</Text>
              <Text color={isDirty ? `yellow` : undefined}>
                {draftData.get(field.id)}
              </Text>

              {isFocused ? (
                <>
                  <Box flexGrow={1}></Box>
                  <Text dimColor>Press enter to edit</Text>
                </>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Shortcuts>
        {edits.size > 0 ? (
          <Shortcut letter="s" label="Save" action={onSave} />
        ) : null}
        <Shortcut letter="esc" label="Cancel" action={onCancel} />
      </Shortcuts>
    </Box>
  );
};

type Form = FormField[];

const FormFieldEditor = ({
  form,
  fieldId,
  edits,
  onSubmit,
  onCancel,
}: {
  form: Form;
  fieldId: string;
  edits: FormEdits;
  onSubmit: (newValue: string) => void;
  onCancel: () => void;
}) => {
  const field = form.find((f) => f.id === fieldId);
  invariant(field != null, `Missing field for ${fieldId}`);

  const formWithEdits = applyFormEdits(form, edits);

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{field.label}:</Text>
      <Box borderStyle={`round`}>
        <UncontrolledTextInput
          defaultValue={formWithEdits.get(field.id) ?? field.value}
          onSubmit={(newValue) => {
            onSubmit(newValue);
          }}
        />
      </Box>
      <Box marginTop={2}>
        <Text>Press enter to save, or ESC to cancel</Text>
      </Box>
    </Box>
  );
};

const empty = [] as const;

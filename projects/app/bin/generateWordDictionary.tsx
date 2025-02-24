// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import hanzi from "hanzi";

import { HanziWord } from "#data/model.ts";
import {
  allHanziCharacters,
  allHsk1HanziWords,
  buildHanziWord,
  dictionarySchema,
  hanziFromHanziWord,
  HanziWordMeaning,
  hanziWordMeaningSchema,
  loadHanziDecomposition,
  lookupHanzi,
  lookupHanziWord,
  manualWordsSchema,
  meaningKeyFromHanziWord,
  parseIds,
  walkIdsNode,
  wordListSchema,
} from "#dictionary/dictionary.ts";
import "#typings/hanzi.d.ts";
import {
  arrayFilterUniqueWithKey,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "#util/collections.ts";
import { jsonStringifyIndentOneLevel } from "#util/json.ts";
import { invariant } from "@haohaohow/lib/invariant";
import { Alert, MultiSelect, Select } from "@inkjs/ui";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import makeDebug from "debug";
import { Box, render, Text, useFocus, useInput } from "ink";
import Link from "ink-link";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import chunk from "lodash/chunk.js";
import isEqual from "lodash/isEqual.js";
import { join } from "node:path";
import React, {
  Children,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DeepReadonly } from "ts-essentials";
import yargs from "yargs";
import { z } from "zod";
import { makeDbCache } from "./util/cache.js";
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

      {focusItem != null ? (
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
      ) : null}
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

      {newHanziWordList != null ? (
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
      ) : null}
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
                  id: `visualVariants`,
                  label: `Visual variants`,
                  value: meaning.visualVariants?.join(`;`) ?? ``,
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
              const newValue = edits.get(`example`);
              invariant(newValue != null);

              const newExample = newValue.trim() === `` ? undefined : newValue;
              mutations.push(() =>
                upsertHanziWordMeaning(hanziWord, {
                  example: newExample,
                }),
              );
              edits.delete(`example`);
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

            if (edits.has(`visualVariants`)) {
              const newValue = edits.get(`visualVariants`);
              invariant(newValue != null);

              const newArray = newValue
                .split(`;`)
                .map((x) => x.trim())
                .filter((x) => x !== ``);
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

              const newArray = newValue
                .split(`;`)
                .map((x) => x.trim())
                .filter((x) => x !== ``);
              const newPinyin = newArray.length > 0 ? newArray : undefined;

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
        Showing {scrollIndexStart + 1}-{scrollIndexEnd}
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
    if (!disabled) {
      if (
        (letter === `esc` && k.escape) ||
        (letter === `enter` && k.return) ||
        (input === letter && k.ctrl)
      ) {
        action();
      }
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

  if (location?.type === `list`) {
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
  } else if (location?.type === `view`) {
    return (
      <Box flexDirection="column" gap={1}>
        <DictionaryHanziWordEntry hanziWord={location.hanziWord} />
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
  } else if (location?.type === `edit`) {
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
  } else if (location?.type === `merge`) {
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

  if (location?.type === `list`) {
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
  } else if (location?.type === `edit`) {
    return (
      <HanziEditor
        hanzi={hanziFromHanziWord(location.hanziWord)}
        wordListFileBaseName={wordListName}
        onCloseAction={() => {
          setLocation({ type: `list` });
        }}
      />
    );
  } else if (location?.type === `add`) {
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

interface HanziWordBulkInputNew {
  type: `new`;
  query: GenerateHanziWordQuery;
}

interface HanziWordBulkInputExisting {
  type: `existing`;
  hanziWord: HanziWord;
}

type HanziWordBulkInput = HanziWordBulkInputNew | HanziWordBulkInputExisting;

interface HanziWordCreateNewResult {
  type: `new`;
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
  description?: string;
  existingItems?: DeepReadonly<[HanziWord, HanziWordMeaning][]>;
}

async function generateHanziWordResults(
  query: GenerateHanziWordQuery,
): Promise<HanziWordCreateResult[]> {
  const existingChoices = query.existingItems
    ?.toSorted(sortComparatorString(([k]) => k))
    .map(
      ([hanziWord, meaning], i) => [`7a2fe4${i}`, hanziWord, meaning] as const,
    );

  const { suggestions: results } = await openai(
    [`curriculum.md`, `word-representation.md`, `skill-types.md`],
    `
I have a hanzi I want to add to a word list:

${JSON.stringify(query)}

${
  existingChoices == null
    ? `There aren't any existing dictionary entries for this hanzi, so I'll need to create a new one.`
    : `
There are already some existing entries in the dictionary for this hanzi, but I need to decide if one of them is suitable, or if I need to create a new entry because it should have a different meaning.

Here are the existing items:

${existingChoices
  .map(
    ([id, hanzi, meaning]) => `
- Hanzi: ${hanzi}
  Gloss: ${meaning.gloss.join(`;`)}
  Definition: ${meaning.definition}
  referenceId: ${id}`,
  )
  .join(``)}
`
}
`,
    z.object({
      suggestions: z.array(
        z.discriminatedUnion(`type`, [
          z.object({
            type: z.literal(`new`),
            meaning: hanziWordMeaningSchema,
            meaningKey: z.string(),
          }),
          z.object({
            type: z.literal(`existing`),
            referenceId: z.string(),
          }),
        ]),
      ),
    }),
  );

  const res: HanziWordCreateResult[] = results.map((x) => {
    if (x.type === `existing`) {
      const existing = existingChoices?.find(([id]) => id === x.referenceId);
      invariant(existing != null, `Missing existing choice`);
      return { type: `existing`, hanziWord: existing[1] };
    }
    return {
      type: `new`,
      hanziWord: buildHanziWord(query.hanzi, x.meaningKey),
      meaning: x.meaning,
    };
  });

  return res;

  // return new Map(
  //   [...queriesWithIds].map(([id, query]) => [
  //     query,
  //     results
  //       .filter((x) => x.referenceId === id)
  //       .map((x) => ({
  //         type: `new`,
  //         hanziWord: buildHanziWord(query.hanzi, x.meaningKey),
  //         meaning: x.meaning,
  //       })),
  //   ]),
  // );
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
        queue: HanziWordBulkInput[];
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
        {onCancel != null ? <Button label="Cancel" action={onCancel} /> : null}
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
            const inputs: HanziWordBulkInput[] = [];

            linesLoop: for (const line of lines) {
              if (line.trim() === ``) {
                continue;
              }

              const [hanzi, rest] = line.split(`:`);
              invariant(hanzi != null, `Missing hanzi for ${line}`);

              // Normalize an empty/missing description to 'null'
              const description =
                rest == null || rest.trim() === `` ? null : rest.trim();

              if (description === null) {
                // there's no description or further information, so if there
                // are existing hanzi word matches just take the first one.
                for (const res of await lookupHanzi(hanzi)) {
                  inputs.push({ type: `existing`, hanziWord: res[0] });
                  continue linesLoop;
                }
                inputs.push({ type: `new`, query: { hanzi } });
              } else {
                const existingItems = await lookupHanzi(hanzi);
                inputs.push({
                  type: `new`,
                  query: { hanzi, description, existingItems },
                });
              }
            }

            setLocation({
              type: `bulkCreateTriage`,
              queue: inputs,
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
              {item.type === `new` ? (
                <>
                  <Text>New: </Text>
                  {item.query.hanzi}
                  {item.query.description == null ? null : (
                    <>{item.query.description}</>
                  )}
                </>
              ) : (
                <>
                  <Text>Existing: </Text>
                  {item.hanziWord}
                </>
              )}
              {` `}
              <Text dimColor>({location.queue.length - 1} remaining)</Text>
            </Text>
          </Alert>

          {item.type === `new` ? (
            <>
              <Text bold>Pick an option:</Text>
              <GenerateHanziWordOptions
                query={item.query}
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
          ) : (
            <AfterDelay
              delay={0}
              action={() => {
                const newResults = [...location.result, item.hanziWord];
                setLocation({
                  type: `bulkCreateTriage`,
                  queue: location.queue.slice(1),
                  result: newResults,
                });
              }}
            />
          )}
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
          />
          {item.type === `new` ? (
            <Text bold backgroundColor="yellow">
              {` `}
              {item.type}
              {` `}
            </Text>
          ) : null}
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
            if (value === `checkHsk1HanziWords`) {
              setLocation({ type: `checkHsk1HanziWords` });
            } else if (value === `hsk1WordList`) {
              setLocation({
                type: `wordListEditor`,
                wordListName: `hsk1HanziWords`,
              });
            } else if (value === `hsk2WordList`) {
              setLocation({
                type: `wordListEditor`,
                wordListName: `hsk2HanziWords`,
              });
            } else if (value === `hsk3WordList`) {
              setLocation({
                type: `wordListEditor`,
                wordListName: `hsk3HanziWords`,
              });
            } else if (value === `editRadicalsWordList`) {
              setLocation({
                type: `wordListEditor`,
                wordListName: `radicalsHanziWords`,
              });
            } else if (value === `dictionaryEditor`) {
              setLocation({
                type: `dictionaryEditor`,
              });
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
  [hanziWord, meaning]: DeepReadonly<[HanziWord, HanziWordMeaning]>,
) {
  return (
    hanziWord.includes(query) ||
    meaning.gloss.some((x) => x.includes(query)) ||
    (meaning.visualVariants?.some((x) => x.includes(query)) ?? false) ||
    (meaning.pinyin?.some((x) => x.includes(query)) ?? false)
  );
}

function useDictionary() {
  return useQuery({
    queryKey: [`loadDictionary`],
    queryFn: async () => {
      return await readDictionary();
    },
  });
}

const DictionaryHanziWordEntry = ({
  hanziWord,
  meaning,
}: {
  hanziWord: HanziWord;
  meaning?: HanziWordMeaning;
}) => {
  const res = useDictionary();

  meaning ??= res.data?.get(hanziWord);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">{hanziWord}</Text>
      </Text>
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
            {meaning.gloss.map((g, i) => (
              <Text key={i}>
                {g}
                <Text dimColor>; </Text>
              </Text>
            ))}
          </Text>
          {meaning.pinyin == null ? null : (
            <Text>
              <Text bold dimColor>
                pinyin:
              </Text>
              {` `}
              {meaning.pinyin.join(` `)}
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
              {meaning.visualVariants.map((x, i) => (
                <Text key={i}>
                  {x}
                  <Text dimColor>; </Text>
                </Text>
              ))}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

const dictionaryPath = join(import.meta.dirname, `../src/dictionary/`);

const dictionaryFilePath = join(dictionaryPath, `dictionary.asset.json`);

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
  return useQuery({
    queryKey: [`loadHanziWordList`, wordListFileName],
    queryFn: async () => {
      return await readHanziWordList(wordListFileName);
    },
  });
}

async function readHanziWordList(name: string) {
  return await readFileWithSchema(
    join(dictionaryPath, `${name}.asset.json`),
    wordListSchema,
    [],
  );
}

async function writeHanziWordList(wordListFileName: string, data: HanziWord[]) {
  await writeUtf8FileIfChanged(
    join(dictionaryPath, `${wordListFileName}.asset.json`),
    jsonStringifyIndentOneLevel(data.sort()),
  );
}

// @ts-expect-error todo use this in the future
async function updateManualWordDefinition(word: string, definitions: string[]) {
  const filepath = join(
    import.meta.dirname,
    `../src/dictionary/wordsManual.asset.json`,
  );

  const data = await readFileWithSchema(filepath, manualWordsSchema, new Map());
  data.set(word, { definitions });

  await writeUtf8FileIfChanged(
    filepath,
    jsonStringifyIndentOneLevel([...data.entries()]),
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
    } else if (key.return) {
      if (focusedFieldId != null) {
        onEditField(focusedFieldId);
      }
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

{
  const radicals = [
    { hanzi: [`一`], name: [`one`], pinyin: [`yī`] },
    { hanzi: [`丨`], name: [`line`], pinyin: [`gǔn`] },
    { hanzi: [`丶`], name: [`dot`], pinyin: [`zhǔ`] },
    { hanzi: [`丿`, `乀`, `⺄`], name: [`slash`], pinyin: [`piě`] },
    { hanzi: [`乙`, `乚`, `乛`], name: [`second`], pinyin: [`yǐ`] },
    { hanzi: [`亅`], name: [`hook`], pinyin: [`jué`] },
    { hanzi: [`二`], name: [`two`], pinyin: [`èr`] },
    { hanzi: [`亠`], name: [`lid`], pinyin: [`tóu`] },
    { hanzi: [`人`, `亻`], name: [`man`], pinyin: [`rén`] },
    { hanzi: [`儿`], name: [`son`, `legs`], pinyin: [`ér`] },
    { hanzi: [`入`], name: [`enter`], pinyin: [`rù`] },
    { hanzi: [`八`, `丷`], name: [`eight`], pinyin: [`bā`] },
    { hanzi: [`冂`], name: [`wide`], pinyin: [`jiōng`] },
    { hanzi: [`冖`], name: [`cloth cover`], pinyin: [`mì`] },
    { hanzi: [`冫`], name: [`ice`], pinyin: [`bīng`] },
    { hanzi: [`几`], name: [`table`], pinyin: [`jī`] },
    { hanzi: [`凵`], name: [`receptacle`], pinyin: [`kǎn`] },
    { hanzi: [`刀`, `刂`, `⺈`], name: [`knife`], pinyin: [`dāo`] },
    { hanzi: [`力`], name: [`power`], pinyin: [`lì`] },
    { hanzi: [`勹`], name: [`wrap`], pinyin: [`bāo`] },
    { hanzi: [`匕`], name: [`spoon`], pinyin: [`bǐ`] },
    { hanzi: [`匚`], name: [`box`], pinyin: [`fāng`] },
    { hanzi: [`匸`], name: [`hiding enclosure`], pinyin: [`xǐ`, `xì`] },
    { hanzi: [`十`], name: [`ten`], pinyin: [`shí`] },
    { hanzi: [`卜`], name: [`divination`], pinyin: [`bǔ`] },
    { hanzi: [`卩`, `㔾`], name: [`seal (device)`], pinyin: [`jié`] },
    { hanzi: [`厂`], name: [`cliff`], pinyin: [`hǎn`] },
    { hanzi: [`厶`], name: [`private`], pinyin: [`sī`] },
    { hanzi: [`又`], name: [`again`], pinyin: [`yòu`] },
    { hanzi: [`口`], name: [`mouth`], pinyin: [`kǒu`] },
    { hanzi: [`囗`], name: [`enclosure`], pinyin: [`wéi`] },
    { hanzi: [`土`], name: [`earth`], pinyin: [`tǔ`] },
    { hanzi: [`士`], name: [`scholar`], pinyin: [`shì`] },
    { hanzi: [`夂`], name: [`go`], pinyin: [`zhǐ`] },
    { hanzi: [`夊`], name: [`go slowly`], pinyin: [`suī`] },
    { hanzi: [`夕`], name: [`evening`], pinyin: [`xī`] },
    { hanzi: [`大`], name: [`big`], pinyin: [`dà`] },
    { hanzi: [`女`], name: [`woman`], pinyin: [`nǚ`] },
    { hanzi: [`子`], name: [`child`], pinyin: [`zǐ`] },
    { hanzi: [`宀`], name: [`roof`], pinyin: [`mián`] },
    { hanzi: [`寸`], name: [`inch`], pinyin: [`cùn`] },
    { hanzi: [`小`, `⺌`, `⺍`], name: [`small`], pinyin: [`xiǎo`] },
    { hanzi: [`尢`, `尣`], name: [`lame`], pinyin: [`wāng`] },
    { hanzi: [`尸`], name: [`corpse`], pinyin: [`shī`] },
    { hanzi: [`屮`], name: [`sprout`], pinyin: [`chè`] },
    { hanzi: [`山`], name: [`mountain`], pinyin: [`shān`] },
    { hanzi: [`巛`, `川`], name: [`river`], pinyin: [`chuān`] },
    { hanzi: [`工`], name: [`work`], pinyin: [`gōng`] },
    { hanzi: [`己`], name: [`oneself`], pinyin: [`jǐ`] },
    { hanzi: [`巾`], name: [`turban`], pinyin: [`jīn`] },
    { hanzi: [`干`], name: [`dry`], pinyin: [`gān`] },
    { hanzi: [`幺`, `么`], name: [`short thread`], pinyin: [`yāo`] },
    { hanzi: [`广`], name: [`dotted cliff`], pinyin: [`yǎn`] },
    { hanzi: [`廴`], name: [`long stride`], pinyin: [`yǐn`] },
    { hanzi: [`廾`], name: [`arch`], pinyin: [`gǒng`] },
    { hanzi: [`弋`], name: [`shoot`], pinyin: [`yì`] },
    { hanzi: [`弓`], name: [`bow`], pinyin: [`gōng`] },
    { hanzi: [`彐`, `彑`], name: [`snout`], pinyin: [`jì`] },
    { hanzi: [`彡`], name: [`bristle`], pinyin: [`shān`] },
    { hanzi: [`彳`], name: [`step`], pinyin: [`chì`] },
    { hanzi: [`心`, `忄`, `⺗`], name: [`heart`], pinyin: [`xīn`] },
    { hanzi: [`戈`], name: [`halberd`], pinyin: [`gē`] },
    { hanzi: [`戶`, `户`, `戸`], name: [`door`], pinyin: [`hù`] },
    { hanzi: [`手`, `扌`, `龵`], name: [`hand`], pinyin: [`shǒu`] },
    { hanzi: [`支`], name: [`branch`], pinyin: [`zhī`] },
    { hanzi: [`攴`, `攵`], name: [`rap, tap`], pinyin: [`pū`] },
    { hanzi: [`文`], name: [`script`], pinyin: [`wén`] },
    { hanzi: [`斗`], name: [`dipper`], pinyin: [`dǒu`] },
    { hanzi: [`斤`], name: [`axe`], pinyin: [`jīn`] },
    { hanzi: [`方`], name: [`square`], pinyin: [`fāng`] },
    { hanzi: [`无`, `旡`], name: [`not`], pinyin: [`wú`] },
    { hanzi: [`日`], name: [`sun`], pinyin: [`rì`] },
    { hanzi: [`曰`], name: [`say`], pinyin: [`yuē`] },
    { hanzi: [`月`], name: [`moon`], pinyin: [`yuè`] },
    { hanzi: [`木`], name: [`tree`], pinyin: [`mù`] },
    { hanzi: [`欠`], name: [`lack`], pinyin: [`qiàn`] },
    { hanzi: [`止`], name: [`stop`], pinyin: [`zhǐ`] },
    { hanzi: [`歹`, `歺`], name: [`death`], pinyin: [`dǎi`] },
    { hanzi: [`殳`], name: [`weapon`], pinyin: [`shū`] },
    { hanzi: [`毋`, `母`], name: [`do not`], pinyin: [`wú`] },
    { hanzi: [`比`], name: [`compare`], pinyin: [`bǐ`] },
    { hanzi: [`毛`], name: [`fur`], pinyin: [`máo`] },
    { hanzi: [`氏`], name: [`clan`], pinyin: [`shì`] },
    { hanzi: [`气`], name: [`steam`], pinyin: [`qì`] },
    { hanzi: [`水`, `氵`, `氺`], name: [`water`], pinyin: [`shuǐ`] },
    { hanzi: [`火`, `灬`], name: [`fire`], pinyin: [`huǒ`] },
    { hanzi: [`爪`, `爫`], name: [`claw`], pinyin: [`zhǎo`] },
    { hanzi: [`父`], name: [`father`], pinyin: [`fù`] },
    { hanzi: [`爻`], name: [`Trigrams`], pinyin: [`yáo`] },
    { hanzi: [`爿`, `丬`], name: [`split wood`], pinyin: [`qiáng`] },
    { hanzi: [`片`], name: [`slice`], pinyin: [`piàn`] },
    { hanzi: [`牙`], name: [`fang`], pinyin: [`yá`] },
    { hanzi: [`牛`, `牜`, `⺧`], name: [`cow`], pinyin: [`niú`] },
    { hanzi: [`犬`, `犭`], name: [`dog`], pinyin: [`quǎn`] },
    { hanzi: [`玄`], name: [`profound`], pinyin: [`xuán`] },
    { hanzi: [`玉`, `王`, `玊`], name: [`jade`], pinyin: [`yù`] },
    { hanzi: [`瓜`], name: [`melon`], pinyin: [`guā`] },
    { hanzi: [`瓦`], name: [`tile`], pinyin: [`wǎ`] },
    { hanzi: [`甘`], name: [`sweet`], pinyin: [`gān`] },
    { hanzi: [`生`], name: [`life`], pinyin: [`shēng`] },
    { hanzi: [`用`], name: [`use`], pinyin: [`yòng`] },
    { hanzi: [`田`], name: [`field`], pinyin: [`tián`] },
    { hanzi: [`疋`, `⺪`], name: [`bolt of cloth`], pinyin: [`pǐ`] },
    { hanzi: [`疒`], name: [`sickness`], pinyin: [`nè`] },
    { hanzi: [`癶`], name: [`footsteps`], pinyin: [`bō`] },
    { hanzi: [`白`], name: [`white`], pinyin: [`bái`] },
    { hanzi: [`皮`], name: [`skin`], pinyin: [`pí`] },
    { hanzi: [`皿`], name: [`dish`], pinyin: [`mǐn`] },
    { hanzi: [`目`, `⺫`], name: [`eye`], pinyin: [`mù`] },
    { hanzi: [`矛`], name: [`spear`], pinyin: [`máo`] },
    { hanzi: [`矢`], name: [`arrow`], pinyin: [`shǐ`] },
    { hanzi: [`石`], name: [`stone`], pinyin: [`shí`] },
    { hanzi: [`示`, `礻`], name: [`spirit`], pinyin: [`shì`] },
    { hanzi: [`禸`], name: [`track`], pinyin: [`róu`] },
    { hanzi: [`禾`], name: [`grain`], pinyin: [`hé`] },
    { hanzi: [`穴`], name: [`cave`], pinyin: [`xué`] },
    { hanzi: [`立`], name: [`stand`], pinyin: [`lì`] },
    { hanzi: [`竹`, `⺮`], name: [`bamboo`], pinyin: [`zhú`] },
    { hanzi: [`米`], name: [`rice`], pinyin: [`mǐ`] },
    { hanzi: [`糸`, `糹`], name: [`silk`], pinyin: [`mì`] },
    { hanzi: [`缶`], name: [`jar`], pinyin: [`fǒu`] },
    { hanzi: [`网`, `罓`, `⺳`], name: [`net`], pinyin: [`wǎng`] },
    { hanzi: [`羊`, `⺶`, `⺷`], name: [`sheep`], pinyin: [`yáng`] },
    { hanzi: [`羽`], name: [`feather`], pinyin: [`yǔ`] },
    { hanzi: [`老`, `耂`], name: [`old`], pinyin: [`lǎo`] },
    { hanzi: [`而`], name: [`and`], pinyin: [`ér`] },
    { hanzi: [`耒`], name: [`plough`], pinyin: [`lěi`] },
    { hanzi: [`耳`], name: [`ear`], pinyin: [`ěr`] },
    { hanzi: [`聿`, `⺺`, `⺻`], name: [`brush`], pinyin: [`yù`] },
    { hanzi: [`肉`, `⺼`], name: [`meat`], pinyin: [`ròu`] },
    { hanzi: [`臣`], name: [`minister`], pinyin: [`chén`] },
    { hanzi: [`自`], name: [`self`], pinyin: [`zì`] },
    { hanzi: [`至`], name: [`arrive`], pinyin: [`zhì`] },
    { hanzi: [`臼`], name: [`mortar`], pinyin: [`jiù`] },
    { hanzi: [`舌`], name: [`tongue`], pinyin: [`shé`] },
    { hanzi: [`舛`], name: [`oppose`], pinyin: [`chuǎn`] },
    { hanzi: [`舟`], name: [`boat`], pinyin: [`zhōu`] },
    { hanzi: [`艮`], name: [`stopping`], pinyin: [`gèn`] },
    { hanzi: [`色`], name: [`colour`], pinyin: [`sè`] },
    { hanzi: [`艸`, `⺿`], name: [`grass`], pinyin: [`cǎo`] },
    { hanzi: [`虍`], name: [`tiger`], pinyin: [`hū`] },
    { hanzi: [`虫`], name: [`insect`], pinyin: [`chóng`] },
    { hanzi: [`血`], name: [`blood`], pinyin: [`xuè`] },
    { hanzi: [`行`], name: [`walk enclosure`], pinyin: [`xíng`] },
    { hanzi: [`衣`, `⻂`], name: [`clothes`], pinyin: [`yī`] },
    { hanzi: [`襾`, `西`, `覀`], name: [`cover`], pinyin: [`yà`] },
    { hanzi: [`見`], name: [`see`], pinyin: [`jiàn`] },
    { hanzi: [`角`, `⻇`], name: [`horn`], pinyin: [`jiǎo`] },
    { hanzi: [`言`, `訁`], name: [`speech`], pinyin: [`yán`] },
    { hanzi: [`谷`], name: [`valley`], pinyin: [`gǔ`] },
    { hanzi: [`豆`], name: [`bean`], pinyin: [`dòu`] },
    { hanzi: [`豕`], name: [`pig`], pinyin: [`shǐ`] },
    { hanzi: [`豸`], name: [`badger`], pinyin: [`zhì`] },
    { hanzi: [`貝`], name: [`shell`], pinyin: [`bèi`] },
    { hanzi: [`赤`], name: [`red`], pinyin: [`chì`] },
    { hanzi: [`走`], name: [`run`], pinyin: [`zǒu`] },
    { hanzi: [`足`, `⻊`], name: [`foot`], pinyin: [`zú`] },
    { hanzi: [`身`], name: [`body`], pinyin: [`shēn`] },
    { hanzi: [`車`], name: [`cart`], pinyin: [`chē`] },
    { hanzi: [`辛`], name: [`bitter`], pinyin: [`xīn`] },
    { hanzi: [`辰`], name: [`morning`], pinyin: [`chén`] },
    { hanzi: [`辵`, `⻍`, `⻎`], name: [`walk`], pinyin: [`chuò`] },
    { hanzi: [`邑`, `⻏`], name: [`city`], pinyin: [`yì`] },
    { hanzi: [`酉`], name: [`wine`], pinyin: [`yǒu`] },
    { hanzi: [`釆`], name: [`distinguish`], pinyin: [`biàn`] },
    { hanzi: [`里`], name: [`village`], pinyin: [`lǐ`] },
    { hanzi: [`金`, `釒`], name: [`gold`], pinyin: [`jīn`] },
    { hanzi: [`長`, `镸`], name: [`long`], pinyin: [`cháng`] },
    { hanzi: [`門`], name: [`gate`], pinyin: [`mén`] },
    { hanzi: [`阜`, `⻖`], name: [`mound`], pinyin: [`fù`] },
    { hanzi: [`隶`], name: [`slave`], pinyin: [`lì`] },
    { hanzi: [`隹`], name: [`short-tailed bird`], pinyin: [`zhuī`] },
    { hanzi: [`雨`], name: [`rain`], pinyin: [`yǔ`] },
    { hanzi: [`靑`, `青`], name: [`blue`], pinyin: [`qīng`] },
    { hanzi: [`非`], name: [`wrong`], pinyin: [`fēi`] },
    { hanzi: [`面`, `靣`], name: [`face`], pinyin: [`miàn`] },
    { hanzi: [`革`], name: [`leather`], pinyin: [`gé`] },
    { hanzi: [`韋`], name: [`tanned leather`], pinyin: [`wéi`] },
    { hanzi: [`韭`], name: [`leek`], pinyin: [`jiǔ`] },
    { hanzi: [`音`], name: [`sound`], pinyin: [`yīn`] },
    { hanzi: [`頁`], name: [`leaf`], pinyin: [`yè`] },
    { hanzi: [`風`], name: [`wind`], pinyin: [`fēng`] },
    { hanzi: [`飛`], name: [`fly`], pinyin: [`fēi`] },
    { hanzi: [`食`, `飠`], name: [`eat`], pinyin: [`shí`] },
    { hanzi: [`首`], name: [`head`], pinyin: [`shǒu`] },
    { hanzi: [`香`], name: [`fragrant`], pinyin: [`xiāng`] },
    { hanzi: [`馬`], name: [`horse`], pinyin: [`mǎ`] },
    { hanzi: [`骨`], name: [`bone`], pinyin: [`gǔ`] },
    { hanzi: [`高`, `髙`], name: [`tall`], pinyin: [`gāo`] },
    { hanzi: [`髟`], name: [`hair`], pinyin: [`biāo`] },
    { hanzi: [`鬥`], name: [`fight`], pinyin: [`dòu`] },
    { hanzi: [`鬯`], name: [`sacrificial wine`], pinyin: [`chàng`] },
    { hanzi: [`鬲`], name: [`cauldron`], pinyin: [`lì`] },
    { hanzi: [`鬼`], name: [`ghost`], pinyin: [`guǐ`] },
    { hanzi: [`魚`], name: [`fish`], pinyin: [`yú`] },
    { hanzi: [`鳥`], name: [`bird`], pinyin: [`niǎo`] },
    { hanzi: [`鹵`], name: [`salt`], pinyin: [`lǔ`] },
    { hanzi: [`鹿`], name: [`deer`], pinyin: [`lù`] },
    { hanzi: [`麥`], name: [`wheat`], pinyin: [`mài`] },
    { hanzi: [`麻`], name: [`hemp`], pinyin: [`má`] },
    { hanzi: [`黃`], name: [`yellow`], pinyin: [`huáng`] },
    { hanzi: [`黍`], name: [`millet`], pinyin: [`shǔ`] },
    { hanzi: [`黑`], name: [`black`], pinyin: [`hēi`] },
    { hanzi: [`黹`], name: [`embroidery`], pinyin: [`zhǐ`] },
    { hanzi: [`黽`], name: [`frog`], pinyin: [`mǐn`] },
    { hanzi: [`鼎`], name: [`tripod`], pinyin: [`dǐng`] },
    { hanzi: [`鼓`], name: [`drum`], pinyin: [`gǔ`] },
    { hanzi: [`鼠`], name: [`rat`], pinyin: [`shǔ`] },
    { hanzi: [`鼻`], name: [`nose`], pinyin: [`bí`] },
    { hanzi: [`齊`, `斉`], name: [`even`], pinyin: [`qí`] },
    { hanzi: [`齒`], name: [`tooth`], pinyin: [`chǐ`] },
    { hanzi: [`龍`], name: [`dragon`], pinyin: [`lóng`] },
    { hanzi: [`龜`], name: [`turtle`], pinyin: [`guī`] },
    { hanzi: [`龠`], name: [`flute`], pinyin: [`yuè`] },
  ] as const;

  for (const radical of radicals) {
    const primaryHanzi = radical.hanzi[0];
    const hanziWords = await lookupHanzi(primaryHanzi);
    if (hanziWords.length !== 1) {
      console.error(
        `expected 1 hanzi words for ${primaryHanzi} but found ${hanziWords.map((x) => x[0]).join(`,`)}`,
      );
    }
    if (
      !hanziWords.some(
        ([, meaning]) => meaning.pinyin?.includes(radical.pinyin[0]) === true,
      )
    ) {
      console.error(`expected ${primaryHanzi} to have a matching pinyin`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import hanzi from "hanzi";

import { HanziWord } from "#data/model.ts";
import {
  allHsk1HanziWords,
  allHsk2Words,
  allHsk3Words,
  buildHanziWord,
  dictionarySchema,
  hanziFromHanziWord,
  HanziWordMeaning,
  hanziWordMeaningSchema,
  loadHanziDecomposition,
  loadRadicals,
  loadRadicalsByHanzi,
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
const radicalsByHanzi = await loadRadicalsByHanzi();
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

// Load all the root words we want to include in the dictionary, this will later
// expanded to include all the components of each word.
const rootWords = new Set<string>([
  ...(await allHsk1HanziWords()).map((x) => hanziFromHanziWord(x)),
  ...(await allHsk2Words()),
  ...(await allHsk3Words()),
  ...(await loadRadicals()).flatMap((x) => x.hanzi),
]);

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
for (const hanzi of rootWords) {
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
  const [scrollIndex, setScrollIndex] = useState(0);
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

  useInput((input, key) => {
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
    if (selectedIndex < scrollIndex) {
      setScrollIndex(selectedIndex);
    } else if (selectedIndex >= scrollIndex + visibleOptionCount) {
      setScrollIndex(selectedIndex - visibleOptionCount + 1);
    }
  }, [selectedIndex, scrollIndex, visibleOptionCount, filteredItemCount]);

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
          .slice(scrollIndex, scrollIndex + visibleOptionCount)
          .map((item, index) => {
            const isSelected =
              isFocused && scrollIndex + index === selectedIndex;
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

  useInput((input, k) => {
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
  const [wordList, setWordList] = useState<HanziWord[]>();

  const wordListIsLoaded = wordList != null;
  useEffect(() => {
    void (async () => {
      if (!wordListIsLoaded) {
        const data = await readHanziWordList(wordListName);
        setWordList(data);
      }
    })();
  }, [wordListIsLoaded, wordListName]);

  return (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Text bold>{wordListName}.asset.json</Text>

      <SelectWithFilter
        items={wordList ?? []}
        onChange={(x) => {
          onSubmit(x as HanziWord);
        }}
      />
    </Box>
  );
};

interface HanziWordCreateResult {
  hanziWord: HanziWord;
  meaning: HanziWordMeaning;
}

interface GenerateHanziWordQuery {
  hanzi: string;
  description: string;
}

async function generateHanziWordResults(
  queries: GenerateHanziWordQuery[],
  optionCount = 3,
): Promise<Map<GenerateHanziWordQuery, HanziWordCreateResult[]>> {
  const queriesWithIds = new Map(
    queries.map((query, i) => [`7a2fe4${i}`, query]),
  );

  const { results } = await openai(
    [`curriculum.md`, `word-representation.md`, `skill-types.md`],
    `
I want to create a new HanziWord dictionary entry for:

${[...queriesWithIds]
  .map(
    ([id, { hanzi, description }]) => `
- Hanzi: ${hanzi}
  Description: ${description}
  referenceId: ${id} 
`,
  )
  .join(`\n`)}

Can you give me the best ${optionCount === 1 ? `option` : `${optionCount} options`} ${queries.length === 1 ? `` : `for each`}`,
    z.object({
      results: z.array(
        z.object({
          meaningKey: z.string(),
          meaning: hanziWordMeaningSchema,
          referenceId: z.string(),
        }),
      ),
    }),
  );

  return new Map(
    [...queriesWithIds].map(([id, query]) => [
      query,
      results
        .filter((x) => x.referenceId === id)
        .map((x) => ({
          hanziWord: buildHanziWord(query.hanzi, x.meaningKey),
          meaning: x.meaning,
        })),
    ]),
  );
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
        type: `bulkCreateQuerying`;
        abortController: AbortController;
        results: HanziWordCreateResult[];
        remainingItems: number;
      }
    | { type: `createInput` }
    | { type: `createQuerying`; query: string }
    | { type: `createPickResult`; results: HanziWordCreateResult[] }
    | null
  >({ type: `list` });

  return location?.type === `list` ? (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Box flexGrow={1} flexShrink={1} flexDirection="column">
        <Select2
          gap={1}
          filter={(query, [hanziWord, meaning]) =>
            hanziWord.includes(query) ||
            meaning.gloss.some((x) => x.includes(query)) ||
            (meaning.visualVariants?.some((x) => x.includes(query)) ?? false) ||
            (meaning.pinyin?.some((x) => x.includes(query)) ?? false)
          }
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
          <>
            <Button
              label="Add"
              action={() => {
                setLocation({ type: `createInput` });
              }}
            />
            <Button
              label="Bulk add"
              action={() => {
                setLocation({ type: `bulkCreateInput` });
              }}
            />
          </>
        )}
      </Shortcuts>
    </Box>
  ) : location?.type === `bulkCreateInput` ? (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Text bold>Bulk create:</Text>
      <MultiLinePasteInput
        label="Paste multi-line of <hanzi>: <description>…"
        onSubmit={(lines) => {
          void (async () => {
            const abortController = new AbortController();

            setLocation({
              type: `bulkCreateQuerying`,
              abortController,
              results: [],
              remainingItems: lines.length,
            });

            const queryItems = lines.map((line) => {
              const [hanzi, description] = line.split(`:`);
              invariant(hanzi != null, `Missing hanzi for ${line}`);
              invariant(description != null, `Missing description for ${line}`);
              return { hanzi, description };
            });

            const allResults: HanziWordCreateResult[] = [];

            for (const queryItemsChunk of chunk(queryItems, 10)) {
              const resultsByQuery = await generateHanziWordResults(
                queryItemsChunk,
                1,
              );

              if (abortController.signal.aborted) {
                break;
              }

              for (const [query, results] of resultsByQuery) {
                const result = results[0];
                invariant(
                  results.length === 1 && result != null,
                  `Expected 1 result`,
                );
                const { hanziWord, meaning } = result;

                await upsertHanziWordMeaning(hanziWord, meaning);

                allResults.push(result);
              }

              setLocation({
                type: `bulkCreateQuerying`,
                abortController,
                results: allResults,
                remainingItems: queryItems.length - allResults.length,
              });
            }
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
  ) : location?.type === `bulkCreateQuerying` ? (
    <Box flexDirection="column" gap={1}>
      <Text bold>Bulk create results:</Text>

      {location.abortController.signal.aborted ? (
        <Alert variant="error">Aborted by user</Alert>
      ) : location.remainingItems > 0 ? (
        <Alert variant="info">
          <Spinner /> Processing{` `}
          <Text dimColor>({location.remainingItems} remaining)</Text>
        </Alert>
      ) : (
        <Alert variant="success">All items have been processed</Alert>
      )}

      <Box flexDirection="column" gap={1} marginLeft={1}>
        {location.results.length > 0 ? (
          <>
            <Text bold>Results:</Text>
            <Select2
              gap={1}
              items={location.results}
              visibleOptionCount={3}
              renderItem={(item) => (
                <DictionaryHanziWordEntry
                  hanziWord={item.hanziWord}
                  meaning={item.meaning}
                />
              )}
            />
          </>
        ) : (
          <Text dimColor>Waiting for results…</Text>
        )}
      </Box>

      <Shortcuts>
        <Shortcut
          letter="esc"
          label="Back"
          action={() => {
            setLocation({ type: `list` });
          }}
        />
        {location.remainingItems > 0 ? (
          <Shortcut
            letter="t"
            label="Cancel"
            action={() => {
              location.abortController.abort();
            }}
          />
        ) : (
          <Shortcut
            letter="enter"
            label="Add all"
            action={() => {
              onSubmit(location.results.map((x) => x.hanziWord));
            }}
          />
        )}
      </Shortcuts>
    </Box>
  ) : location?.type === `createInput` ? (
    <Box flexDirection="column" gap={1} minHeight={15}>
      <Text bold>HanziWord: {`<hanzi>:<description>`}</Text>

      <UncontrolledTextInput
        defaultValue=""
        placeholder="e.g. <hanzi>:<description>"
        onSubmit={(queryText) => {
          void (async () => {
            setLocation({ type: `createQuerying`, query: queryText });

            const hanzi = hanziFromHanziWord(queryText as HanziWord);
            const description = meaningKeyFromHanziWord(queryText as HanziWord);
            const queryItem = { hanzi, description };

            const resultsByQuery = await generateHanziWordResults([queryItem]);
            const results = resultsByQuery.get(queryItem);
            invariant(results != null, `Missing query result for ${queryText}`);

            setLocation({
              type: `createPickResult`,
              results,
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
  ) : location?.type === `createQuerying` ? (
    <Box gap={1}>
      <Spinner />
      <Text>
        Fetching suggestions for <Text italic>{location.query}</Text>…
      </Text>
    </Box>
  ) : location?.type === `createPickResult` ? (
    <>
      <Box flexDirection="column" gap={1}>
        <Text bold>Pick the best result:</Text>

        <Select2
          gap={1}
          items={location.results}
          renderItem={(item) => (
            <DictionaryHanziWordEntry
              hanziWord={item.hanziWord}
              meaning={item.meaning}
            />
          )}
          onChange={(value) => {
            void (async () => {
              await upsertHanziWordMeaning(value.hanziWord, value.meaning);

              setLocation({ type: `list` });
              onSubmit([value.hanziWord]);
            })();
          }}
        />
      </Box>
    </>
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
    () => text?.split(/\n\r?|\r/g).map((x) => x.trim()),
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

  return (
    <Box flexDirection="column">
      <Text bold>{label}:</Text>
      <Box borderStyle="round" padding={1} flexDirection="column">
        {lines == null ? (
          <Text dimColor>Paste {`⌘+v`} from clipboard</Text>
        ) : (
          lines.map((x, i) => <Text key={i}>{JSON.stringify(x)}</Text>)
        )}
      </Box>
      <Text dimColor>Press delete or backspace to clear</Text>
    </Box>
  );
};

const SelectWithFilter = ({
  items,
  onChange,
}: {
  items: string[];
  onChange: (item: string) => void;
}) => {
  const [query, setQuery] = useState(``);

  const filteredItems = items.filter((x) => query === `` || x.includes(query));

  const options = useMemo(
    () => filteredItems.map((x) => ({ value: x, label: x })),
    [filteredItems],
  );

  const { isFocused } = useFocus({ autoFocus: true });

  return (
    <Box flexDirection="column">
      <TextInput
        focus={isFocused}
        value={query}
        onChange={(newValue) => {
          setQuery(newValue);
        }}
        placeholder={isFocused ? `Type to search` : ` `}
      />
      <Select
        isDisabled={!isFocused}
        options={options}
        visibleOptionCount={10}
        onChange={(value) => {
          onChange(value);
        }}
      />
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
              value: `editHsk1WordList`,
              label: `Edit HSK1 word list`,
            },
            {
              value: `editRadicalsWordList`,
              label: `Edit radicals word list`,
            },
          ]}
          onChange={(value) => {
            if (value === `checkHsk1HanziWords`) {
              setLocation({ type: `checkHsk1HanziWords` });
            } else if (value === `editHsk1WordList`) {
              setLocation({
                type: `wordListEditor`,
                wordListName: `hsk1HanziWords`,
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

  meaning = res.data?.get(hanziWord);

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
  }

  await writeHanziWordList(wordListFileName, data);
  await queryClient.invalidateQueries({
    queryKey: [`loadHanziWordList`, wordListFileName],
  });
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

interface FormEdit {
  id: string;
  newValue: string;
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

  useInput((input, key) => {
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

  useInput((input, key) => {
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

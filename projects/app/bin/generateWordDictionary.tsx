import { intersperse } from "#client/react.ts";
import {
  flattenIds,
  idsNodeToString,
  isHanziCharacter,
  parseIds,
  strokeCountPlaceholderOrNull,
  walkIdsNodeLeafs,
} from "#data/hanzi.ts";
import type {
  HanziCharacter,
  HanziText,
  HanziWord,
  IdsNode,
  PinyinText,
} from "#data/model.ts";
import { partOfSpeechSchema } from "#data/model.ts";
import type {
  DictionaryJson,
  HanziWordMeaning,
  HanziWordWithMeaning,
} from "#dictionary.ts";
import {
  allHanziCharacters,
  buildHanziWord,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadCharacters,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "#dictionary.ts";
import { Alert, Select } from "@inkjs/ui";
import {
  emptyArray,
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { makeFsDbCache } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import makeDebug from "debug";
import { Box, render, Text, useFocus, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import type { ReactNode } from "react";
import { Children, useEffect, useMemo, useState } from "react";
import type { DeepReadonly } from "ts-essentials";
import yargs from "yargs";
import { z } from "zod/v4";
import {
  readDictionaryJson,
  upsertHanziWordMeaning,
  writeDictionaryJson,
} from "../test/helpers.ts";
import {
  dongChineseData,
  getDongChineseGloss,
  getDongChineseMeaningKey,
  getDongChinesePronunciation,
} from "./util/dongChinese.js";
import { makeSimpleAiClient } from "./util/openai.js";

const debug = makeDebug(`pyly`);

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

const charactersData = await loadCharacters();
const fsDbCache = makeFsDbCache(
  import.meta.filename,
  `openai_chat_cache`,
  debug,
);
const openai = makeSimpleAiClient(fsDbCache);

// All root words as well as all the components of each word.
const allWords = new Set<string>();

// Recursively decompose each hanzi and gather together all the components that
// aren't already in the list.
function decomp(char: HanziCharacter) {
  if (allWords.has(char)) {
    return;
  }

  allWords.add(char);
  const ids = charactersData.get(char)?.decomposition;
  if (ids != null) {
    const idsNode = parseIds(ids) as IdsNode<HanziCharacter>;
    for (const leaf of walkIdsNodeLeafs(idsNode)) {
      if (strokeCountPlaceholderOrNull(leaf) == null && leaf !== char) {
        decomp(leaf);
      }
    }
  }
}
// Load all the root words we want to include in the dictionary, this will later
// expanded to include all the components of each word.
for (const hanzi of await allHanziCharacters()) {
  decomp(hanzi);
}

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

// @ts-expect-error keep it around for now, will be used later
async function openAiHanziWordGlossHintQuery(
  hanziWord: HanziWord,
  dict: DictionaryJson,
) {
  const meaning = dict.get(hanziWord);
  const dictionary = await loadDictionary();
  invariant(meaning != null);
  const hanzi = hanziFromHanziWord(hanziWord);

  if (isHanziCharacter(hanzi)) {
    const componentGlosses = new Map<string, Set<string>>();
    let hanziIds: string = hanzi;

    const visited = new Set<string>();
    async function decomp(char: HanziCharacter) {
      if (visited.has(char)) {
        return;
      }
      visited.add(char);

      // single character
      const ids = charactersData.get(char)?.decomposition;
      invariant(ids != null, `missing decomposition for ${char}`);
      hanziIds = hanziIds.replaceAll(char, ids);

      for (const leaf of walkIdsNodeLeafs(
        parseIds(ids) as IdsNode<HanziCharacter>,
      )) {
        if (strokeCountPlaceholderOrNull(leaf) == null) {
          if (leaf === char) {
            mapSetAdd(
              componentGlosses,
              leaf,
              `anything as it has no specific meaning since it's purely structural`,
            );
          } else {
            const lookups = dictionary.lookupHanzi(leaf as HanziText);
            if (lookups.length > 0) {
              for (const [, leafMeaning] of lookups) {
                mapSetAdd(
                  componentGlosses,
                  leaf,
                  `**${leafMeaning.gloss.join(`/`)}**`,
                );
              }
            } else {
              // No definition for the character, try decomposing it further.
              await decomp(leaf);
            }
          }
        }
      }
    }

    await decomp(hanzi);

    // "dot" is not a useful concept to focus on, it's better to let the LLM
    // imagine what it might represent
    if (componentGlosses.has(`丶`)) {
      componentGlosses.set(
        `丶`,
        new Set([
          `almost anything small physical thing — a rain drop, a stick, a leaf, a hand, etc`,
        ]),
      );
    }

    hanziIds = idsNodeToString(flattenIds(parseIds(hanziIds)), (x) => x);

    const query = `
I'm having trouble remembering that ${hanzi} means **${meaning.gloss.join(`/`)}** ${meaning.pos == null ? `` : `(${meaning.pos})`}.

${hanziIds.length > 1 ? `\nI've worked out that ${hanzi} = ${hanziIds}` : ``}
${[...componentGlosses.entries()]
  .flatMap(
    ([hanzi, glosses]) =>
      `${hanzi} → ${[...glosses].join(` or `)}${
        glosses.size > 1 ? ` (${glosses.size} distinct meanings)` : ``
      }`,
  )
  .map((x) => `• ${x}`)
  .join(`\n`)}

Can you come up with a few suggestions for me?
  `;

    console.log(query);
    const { suggestions: results } = await openai(
      [`curriculum.instructions.md`],
      query,
      z.object({
        suggestions: z.array(
          z.object({
            // strategy: z.string(),
            glossHint: z.string(),
            // stepByStepLogic: z.string(),
          }),
        ),
      }),
    );

    // Imagine a child under a

    return results;
  }
  // multiple characters
  throw new Error(
    `multiple character gloss hint generation not implemented yet`,
  );
}

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
                  id: `partOfSpeech`,
                  label: `Part of speech`,
                  value: meaning.pos ?? ``,
                },
              ]),
        ]}
        onCancel={() => {
          onCancel();
        }}
        onSubmit={(edits) => {
          void (async () => {
            const mutations = [];

            if (edits.has(`partOfSpeech`)) {
              const newValue = edits.get(`partOfSpeech`)?.trim();
              invariant(newValue != null);

              const newPos =
                newValue === ``
                  ? undefined
                  : partOfSpeechSchema.parse(newValue);
              mutations.push(() =>
                saveUpsertHanziWordMeaning(hanziWord, {
                  pos: newPos,
                }),
              );
              edits.delete(`partOfSpeech`);
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
                saveUpsertHanziWordMeaning(hanziWord, {
                  gloss: newGloss,
                }),
              );
              edits.delete(`gloss`);
            }

            if (edits.has(`pinyin`)) {
              const newValue = edits.get(`pinyin`);
              invariant(newValue != null);

              const newPinyin = newValue
                .split(`;`)
                .map((x) =>
                  x
                    // Make sure any double spaces are replaced with a single, this is assumed by rPinyinPronunciation
                    .replaceAll(/ +/g, ` `)
                    // Remove leading and trailing spaces
                    .trim(),
                )
                .filter((x) => x !== ``)
                .map((x) => x as PinyinText);
              mutations.push(() =>
                saveUpsertHanziWordMeaning(hanziWord, {
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
    <Box gap={1}>{intersperse(nonNullChilds, <Text dimColor>•</Text>)}</Box>
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
  const dongChinese = useQuery({
    queryKey: [`dongChineseData`],
    queryFn: dongChineseData,
    networkMode: `online`,
  });

  const lookup = useMemo(
    () => dongChinese.data?.lookupChar(hanzi),
    [dongChinese.data, hanzi],
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
            <SemiColonList
              items={getDongChinesePronunciation(lookup) ?? emptyArray}
            />
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

async function queryOpenAiForHanziWordResults(query: unknown) {
  const { suggestions } = await openai(
    [
      `curriculum.instructions.md`,
      `word-representation.instructions.md`,
      `skill-kinds.instructions.md`,
    ],
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

  for (const x of await queryOpenAiForHanziWordResults(query)) {
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
            pinyin: getDongChinesePronunciation(lookup),
          },
        });

        // Add a mixed version with OpenAI
        for (const openAiResult of await queryOpenAiForHanziWordResults({
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
              pinyin: getDongChinesePronunciation(lookup),
              pos: openAiResult.meaning.pos,
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
            const dictionary = await loadDictionary();

            for (const line of lines) {
              if (line.trim() === ``) {
                continue;
              }

              const [hanzi, rest] = line.split(`:`);
              invariant(hanzi != null, `Missing hanzi for ${line}`);

              // Normalize an empty/missing description to 'null'
              const description =
                rest == null || rest.trim() === `` ? null : rest.trim();

              const existingItems = dictionary.lookupHanzi(hanzi as HanziText);
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
                  await saveUpsertHanziWordMeaning(
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
  const [location, setLocation] = useState<{
    type: `dictionaryEditor`;
  } | null>();

  return (
    <QueryClientProvider client={queryClient}>
      {location?.type === `dictionaryEditor` ? (
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
              value: `editRadicalsWordList`,
              label: `Edit radicals word list`,
            },
          ]}
          onChange={(value) => {
            switch (value) {
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
    (meaning.pinyin?.some((pronunciation) => pronunciation.includes(query)) ??
      false)
  );
}

function useDictionary() {
  return useQuery({
    queryKey: [`loadDictionary`],
    queryFn: async () => {
      return await readDictionaryJson();
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
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

  const flagElement = useMemo(() => {
    const nonNullChilds = Children.map(flags, (child) => child);
    return nonNullChilds == null || nonNullChilds.length === 0 ? null : (
      <Box gap={1}>{intersperse(nonNullChilds, <Text>{` `}</Text>)}</Box>
    );
  }, [flags]);

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between">
        <Text>
          <Text color="cyan">{hanziWord}</Text>
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
              part of speech:
            </Text>
            {` `}
            <Text italic>{meaning.pos}</Text>
          </Text>
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

async function renameHanziWord(
  oldHanziWord: HanziWord,
  newHanziWord: HanziWord,
) {
  const dict = await readDictionaryJson();

  const meaning = dict.get(oldHanziWord);
  invariant(meaning != null, `missing meaning for ${oldHanziWord}`);

  invariant(!dict.has(newHanziWord), `the new meaning-key already exists`);

  dict.set(newHanziWord, meaning);
  dict.delete(oldHanziWord);
  await writeDictionaryAndInvalidateCache(dict);
}

async function mergeHanziWord(
  hanziWordToRemove: HanziWord,
  hanziWordToKeep: HanziWord,
) {
  const dict = await readDictionaryJson();

  invariant(dict.has(hanziWordToRemove), `the old meaning-key does not exist`);
  invariant(dict.has(hanziWordToKeep), `the new meaning-key does not exist`);

  dict.delete(hanziWordToRemove);

  await writeDictionaryAndInvalidateCache(dict);
}

async function saveUpsertHanziWordMeaning(
  hanziWord: HanziWord,
  patch: Partial<HanziWordMeaning>,
) {
  const dict = await readDictionaryJson();

  upsertHanziWordMeaning(dict, hanziWord, patch);

  await writeDictionaryAndInvalidateCache(dict);
}

async function writeDictionaryAndInvalidateCache(dict: DictionaryJson) {
  await writeDictionaryJson(dict);
  await queryClient.invalidateQueries({ queryKey: [`loadDictionary`] });
}

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

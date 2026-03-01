import type { PinyinlyObjectId } from "@/data/model";
import {
  assetIdFromPinyinlyObjectId,
  assetIdPinyinlyObjectIdKind,
  hanziWordFromPinyinlyObjectId,
  hanziWordPinyinlyObjectId,
  hanziWordPinyinlyObjectIdKind,
  pinyinlyObjectIdKind,
  pinyinSoundIdPinyinlyObjectId,
  pinyinSoundIdPinyinlyObjectIdKind,
  skillIdFromPinyinlyObjectId,
  skillPinyinlyObjectIdKind,
  soundIdFromPinyinlyObjectId,
} from "@/data/model";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { useDebounce } from "@uidotdev/usehooks";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { use, useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import { useRizzle } from "./hooks/useRizzle";
import { quickSearchPickSetting, useUserSetting } from "./hooks/useUserSetting";
import { useUserSettingHistory } from "./hooks/useUserSettingHistory";
import { Icon } from "./Icon";
import { PageSheetModal } from "./PageSheetModal";
import type { QuickSearchResult } from "./quickSearch";
import { searchDictionaryEntries } from "./quickSearch";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

function quickSearchObjectIdForResult(
  result: QuickSearchResult,
): PinyinlyObjectId {
  switch (result.kind) {
    case `hanziWord`:
      return hanziWordPinyinlyObjectId(result.hanziWord);

    case `pinyinSound`:
      return pinyinSoundIdPinyinlyObjectId(result.pinyinSoundId);

    default:
      result satisfies never;
      throw new Error(
        `Unknown result quick search result: ${JSON.stringify(result)}`,
      );
  }
}

export function QuickSearchModal({
  devUiSnapshotMode,
  onDismiss,
}: {
  devUiSnapshotMode?: boolean;
  onDismiss: () => void;
}) {
  return (
    <PageSheetModal
      onDismiss={onDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={<Text className="text-fg-dim">Loading…</Text>}
    >
      {({ dismiss }) => <ModalContent onDismiss={dismiss} />}
    </PageSheetModal>
  );
}

function ModalContent({ onDismiss }: { onDismiss: () => void }) {
  const dictionary = use(loadDictionary());
  const r = useRizzle();
  const [query, setQuery] = useState(``);
  const { setValue: setQuickSearchPick } = useUserSetting(
    quickSearchPickSetting,
  );

  const trimmedQuery = useDebounce(query.trim(), 200);

  const hasQuery = trimmedQuery.length > 0;
  const results = searchDictionaryEntries(dictionary.allEntries, trimmedQuery);

  const onSelectResult = (result: QuickSearchResult) => {
    setQuickSearchPick({ objectId: quickSearchObjectIdForResult(result) });
    onDismiss();
  };

  const onRemoveRecent = (id: string) => {
    void r.mutate.deleteSettingHistory({ id }).catch((error: unknown) => {
      console.error(`Failed to delete quick search history "${id}":`, error);
    });
  };

  return (
    <View className="min-h-[200px] flex-1 bg-bg-high">
      <View className="h-12 flex-row items-center gap-2 border-b border-b-fg/10 px-4">
        <Icon icon="search" size={20} className="text-fg-dim" />
        <TextInputSingle
          autoFocus
          placeholder="Search dictionary"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          className="flex-1"
          variant="bare"
        />
        <Pressable
          className="rounded bg-fg/10 p-1.5"
          onPress={() => {
            onDismiss();
          }}
        >
          <Text className="text-[8px] text-fg">ESC</Text>
        </Pressable>
      </View>

      {hasQuery === false ? (
        <RecentQueries
          onRemove={onRemoveRecent}
          onSelect={() => {
            onDismiss();
          }}
        />
      ) : results.length === 0 ? (
        <NoResults
          query={trimmedQuery}
          onChangeQuery={(query) => {
            setQuery(query);
          }}
        />
      ) : (
        results.map((result) => (
          <SearchResultItem
            key={result.hanziWord}
            result={result}
            onSelect={onSelectResult}
          />
        ))
      )}
    </View>
  );
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: QuickSearchResult;
  onSelect: (result: QuickSearchResult) => void;
}) {
  switch (result.kind) {
    case `hanziWord`:
      return (
        <ResultItem
          id={result}
          href={`/wiki/${encodeURIComponent(result.hanzi)}`}
          onPress={() => {
            onSelect(result);
          }}
        >
          <HanziWordResultContent
            hanzi={result.hanzi}
            gloss={result.gloss}
            pinyin={result.pinyin}
          />
        </ResultItem>
      );

    case `pinyinSound`:
      return null;

    default:
      result satisfies never;
  }
}

function HanziWordResultContent({
  hanzi,
  gloss,
  pinyin,
}: {
  hanzi: string;
  gloss?: string;
  pinyin?: string;
}) {
  return (
    <View className="gap-0.5">
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="text-lg font-normal text-fg-loud">{hanzi}</Text>
        {gloss == null ? null : (
          <Text className="text-sm text-fg">{gloss}</Text>
        )}
      </View>
      {pinyin == null ? null : (
        <Text className="text-xs text-fg-dim">{pinyin}</Text>
      )}
    </View>
  );
}

function RecentQueries({
  onRemove,
  onSelect,
}: {
  onRemove: (id: string) => void;
  onSelect: () => void;
}) {
  const dictionary = use(loadDictionary());
  const dictionaryEntriesByWord = new Map(dictionary.allEntries);

  const quickSearchHistory = useUserSettingHistory(quickSearchPickSetting);
  const items = quickSearchHistory.entries;

  if (items.length === 0) {
    return (
      <View className="items-center px-4 py-16">
        <Text className="font-sans text-lg text-fg-dim">
          No recent searches
        </Text>
      </View>
    );
  }

  return (
    <View className="">
      <Text className="px-5 pb-4 pt-6 text-base font-semibold uppercase text-fg">
        Recent
      </Text>
      {items.map((item) => {
        const objectId = item.value?.objectId;
        if (objectId == null) {
          return null;
        }

        const kind = pinyinlyObjectIdKind(objectId);

        if (kind == null) {
          return null;
        }

        switch (kind) {
          case hanziWordPinyinlyObjectIdKind: {
            const hanziWord = hanziWordFromPinyinlyObjectId(objectId);
            if (hanziWord == null) {
              return null;
            }

            const dictionaryEntry = dictionaryEntriesByWord.get(hanziWord);
            const hanzi = hanziFromHanziWord(hanziWord);

            return (
              <ResultItem
                key={item.id}
                id={item.id}
                onRemove={onRemove}
                onPress={onSelect}
                href={`/wiki/${encodeURIComponent(hanzi)}`}
              >
                <HanziWordResultContent
                  hanzi={hanzi}
                  gloss={dictionaryEntry?.gloss?.[0]}
                  pinyin={dictionaryEntry?.pinyin?.[0]}
                />
              </ResultItem>
            );
          }

          case pinyinSoundIdPinyinlyObjectIdKind: {
            const soundId = soundIdFromPinyinlyObjectId(objectId);
            if (soundId == null) {
              return null;
            }

            return (
              <ResultItem
                key={item.id}
                id={item.id}
                onRemove={onRemove}
                onPress={onSelect}
                href={`/sounds/${encodeURIComponent(soundId)}`}
              >
                <View className="gap-0.5">
                  <View className="flex-1 flex-row items-center gap-2">
                    <Text className="text-lg font-normal text-fg-loud">
                      {soundId}
                    </Text>
                    <Text className="text-sm text-fg">Sound</Text>
                  </View>
                </View>
              </ResultItem>
            );
          }

          case skillPinyinlyObjectIdKind: {
            const skillId = skillIdFromPinyinlyObjectId(objectId);
            if (skillId == null) {
              return null;
            }

            return (
              <ResultItem
                key={item.id}
                id={item.id}
                onRemove={onRemove}
                onPress={onSelect}
                href={`/skills`}
              >
                <View className="gap-0.5">
                  <View className="flex-1 flex-row items-center gap-2">
                    <Text className="text-lg font-normal text-fg-loud">
                      {skillId}
                    </Text>
                    <Text className="text-sm text-fg">Skill</Text>
                  </View>
                </View>
              </ResultItem>
            );
          }

          case assetIdPinyinlyObjectIdKind: {
            const assetId = assetIdFromPinyinlyObjectId(objectId);
            if (assetId == null) {
              return null;
            }

            return (
              <ResultItem
                key={item.id}
                id={item.id}
                onRemove={onRemove}
                onPress={onSelect}
                href={`./`}
              >
                <View className="gap-0.5">
                  <View className="flex-1 flex-row items-center gap-2">
                    <Text className="text-lg font-normal text-fg-loud">
                      {assetId}
                    </Text>
                    <Text className="text-sm text-fg">Asset</Text>
                  </View>
                </View>
              </ResultItem>
            );
          }

          case null:
            return null;

          default:
            kind satisfies never;
        }

        return null;
      })}
    </View>
  );
}

function ResultItem<T>({
  children,
  href,
  id,
  onPress,
  onRemove,
}: {
  children: ViewProps[`children`];
  href: Href;
  id: T;
  onPress: () => void;
  onRemove?: (id: T) => void;
}) {
  return (
    <Link
      href={href}
      onPress={onPress}
      className={`
        flex flex-row items-center justify-between gap-3 border-t border-t-fg/10 px-5 py-4

        hover:bg-fg/5
      `}
    >
      {children}

      {onRemove == null ? null : (
        <RectButton
          variant="bare2"
          iconStart="close"
          iconSize={24}
          className="text-fg-dim"
          onPress={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onRemove(id);
          }}
        />
      )}
    </Link>
  );
}

function NoResults({
  query,
  onChangeQuery,
}: {
  query: string;
  onChangeQuery: (newQuery: string) => void;
}) {
  return (
    <View className="items-center px-4 pb-8 pt-10">
      <Text className="mb-10 font-sans text-lg font-medium text-fg-dim">
        No results for &quot;<Text className={`text-fg`}>{query}</Text>&quot;
      </Text>

      <View className="w-full items-start gap-2">
        <Text className="font-sans text-sm font-semibold uppercase text-fg">
          Try searching for
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[`learn`, `学`, `good`, `coffee`].map((suggestion) => (
            <RectButton
              key={suggestion}
              onPress={() => {
                onChangeQuery(suggestion);
              }}
              variant="rounded"
            >
              {suggestion}
            </RectButton>
          ))}
        </View>
      </View>
    </View>
  );
}

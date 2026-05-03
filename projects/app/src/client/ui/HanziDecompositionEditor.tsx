import { getWikiCharacterData } from "@/client/wiki";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import {
  componentToString,
  idsNodeToString,
  parseIdsStrict,
  parseIdsStrictOrNull,
} from "@/data/hanzi";
import type { HanziText, WikiCharacterDecomposition } from "@/data/model";
import { wikiCharacterDecompositionSchema } from "@/data/model";
import { userWikiCharacterDecompositionSetting } from "@/data/userSettings";
import {
  decompositionComponentsToIds,
  parseIdsToDecompositionComponents,
} from "@/dictionary";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { use, useState } from "react";
import { Text, View } from "react-native";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";
import { useDb } from "./hooks/useDb";

interface DecompositionOption {
  ids: string;
  components: WikiCharacterDecomposition;
}

interface DecompositionOverrideInput {
  ids: string;
  components?: WikiCharacterDecomposition;
}

type UserWikiCharacterDecompositionValue = ReturnType<
  typeof userWikiCharacterDecompositionSetting.entity.unmarshalValueSafe
>;

function getOverrideIds(value: UserWikiCharacterDecompositionValue): string {
  if (value == null) {
    return ``;
  }

  const parsed = wikiCharacterDecompositionSchema.safeParse(value.components);
  if (parsed.success) {
    return idsNodeToString(parsed.data, componentToString);
  }

  return ``;
}

export function HanziDecompositionEditor({ hanzi }: { hanzi: HanziText }) {
  const characterData = use(getWikiCharacterData(hanzi));
  const db = useDb();
  const userWikiCharacterDecomposition = useUserSetting({
    setting: userWikiCharacterDecompositionSetting,
    key: { hanzi },
  });
  const overrideIds = getOverrideIds(userWikiCharacterDecomposition.value);

  const mnemonicIds =
    characterData?.mnemonic == null
      ? null
      : idsNodeToString(characterData.mnemonic.components, componentToString);

  const builtInOptions: DecompositionOption[] = [];
  const seenBuiltInIds = new Set<string>();

  const pushBuiltInOption = (
    ids: string | null,
    components: WikiCharacterDecomposition,
  ) => {
    if (ids == null || parseIdsStrictOrNull(ids) == null) {
      return;
    }

    if (seenBuiltInIds.has(ids)) {
      return;
    }

    seenBuiltInIds.add(ids);
    builtInOptions.push({ ids, components });
  };

  if (mnemonicIds != null && characterData?.mnemonic != null) {
    pushBuiltInOption(mnemonicIds, characterData.mnemonic.components);
  }

  for (const decomposition of characterData?.decompositions ?? []) {
    const ids = idsNodeToString(decomposition, componentToString);
    pushBuiltInOption(ids, decomposition);
  }

  const { data: selectedDecompositionRows } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.characterDecompositionCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .select(({ entry }) => ({
          decompositionComponents: entry.decompositionComponents,
        })),
    [db.characterDecompositionCollection, hanzi],
  );

  const selectedDecomposition = selectedDecompositionRows[0];
  const selectedIds =
    (selectedDecomposition?.decompositionComponents == null
      ? null
      : decompositionComponentsToIds(
          selectedDecomposition.decompositionComponents,
        )) ??
    mnemonicIds ??
    builtInOptions[0]?.ids ??
    null;

  const onSetOverride = (value: DecompositionOverrideInput | null) => {
    if (value == null) {
      userWikiCharacterDecomposition.setValue(null);
      return;
    }

    const components =
      value.components ?? parseIdsToDecompositionComponents(value.ids);
    if (components == null) {
      return;
    }

    userWikiCharacterDecomposition.setValue({ hanzi, components });
  };

  const [customIdsInput, setCustomIdsInput] = useState(overrideIds);

  const customIdsTrimmed = customIdsInput.trim();
  let customIdsError: string | null = null;
  if (customIdsTrimmed.length > 0) {
    try {
      parseIdsStrict(customIdsTrimmed);
    } catch (error) {
      customIdsError =
        error instanceof Error ? error.message : `Invalid IDS decomposition`;
    }
  }

  const selectDecomposition = (option: DecompositionOption | null) => {
    if (option == null || option.ids === mnemonicIds) {
      onSetOverride(null);
      return;
    }

    onSetOverride({
      ids: option.ids,
      components: option.components,
    });
  };

  const saveCustomDecomposition = () => {
    if (customIdsTrimmed.length === 0) {
      onSetOverride(null);
      return;
    }

    if (customIdsError != null) {
      return;
    }

    onSetOverride({ ids: customIdsTrimmed });
  };

  return (
    <View className="gap-3 rounded-xl border border-fg/10 bg-bg-high p-3">
      <Text className="pyly-body-caption text-fg-dim">
        Choose a decomposition or enter a custom IDS value.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {builtInOptions.map((option, index) => {
          const isSelected = option.ids === selectedIds;
          return (
            <RectButton
              key={option.ids}
              variant={isSelected ? `option` : `outline`}
              onPress={() => {
                selectDecomposition(option);
              }}
            >
              {index === 0 ? `Default` : `Option ${index + 1}`}: {option.ids}
            </RectButton>
          );
        })}
      </View>
      <TextInputSingle
        placeholder="Custom IDS, e.g. ⿰讠兑"
        value={customIdsInput}
        onChangeText={setCustomIdsInput}
      />
      {customIdsError == null ? null : (
        <Text className="pyly-body-caption text-danger">{customIdsError}</Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        <RectButton
          variant="option"
          disabled={customIdsError != null}
          onPress={saveCustomDecomposition}
        >
          Save custom
        </RectButton>
        <RectButton
          variant="bareDim"
          onPress={() => {
            setCustomIdsInput(``);
            onSetOverride(null);
          }}
        >
          Reset to default
        </RectButton>
      </View>
    </View>
  );
}

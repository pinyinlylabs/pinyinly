import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { AiLeadCharacterDescriptionModal } from "@/client/ui/AiLeadCharacterDescriptionModal";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { CompactWordRows } from "@/client/ui/CompactWordRows";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinFinalToneImagePicker } from "@/client/ui/PinyinFinalToneImagePicker";
import { PinyinFinalToneEditor } from "@/client/ui/PinyinFinalToneEditor";
import { PinyinSoundNameText } from "@/client/ui/PinyinSoundNameText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import { SettingText } from "@/client/ui/SettingText";
import { SoundNameEditModal } from "@/client/ui/SoundNameEditModal";
import { TextInputMulti } from "@/client/ui/TextInputMulti";
import { useDb } from "@/client/ui/hooks/useDb";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { pickSoundUsageExamplesForEntries } from "@/client/ui/soundUsageExamples";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundExamples,
  defaultPinyinSoundInstructions,
  getPinyinSoundLabel,
  isFinalSoundId,
  isInitialSoundId,
  isInitialOrFinalSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { getAudioSourcesByPinyinMap } from "@/data/pinyinSoundAudio";
import {
  pinyinSoundDescriptionSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundImageSetting,
  pinyinSoundMnemonicIdentitySetting,
  pinyinSoundModelSheetImageSetting,
  pinyinSoundNameArticleSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { and, eq, gte, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SoundIdPage() {
  const { id: rawId, tone: rawTone } = useLocalSearchParams<
    `/sounds/[id]` & { tone?: string }
  >();
  const id = rawId as PinyinSoundId;
  const focusedTone = typeof rawTone === `string` ? rawTone : null;
  const chart = loadPylyPinyinChart();
  const isFinalSound = isFinalSoundId(id);

  const [isEditSoundNameModalOpen, setIsEditSoundNameModalOpen] =
    useState(false);

  const label = getPinyinSoundLabel(id, chart);
  const examplePinyins = defaultPinyinSoundExamples[id] ?? [];
  const audioSourcesByPinyinMap = getAudioSourcesByPinyinMap();
  let soundAudioSource = null;
  for (const examplePinyin of examplePinyins) {
    const audioSources = audioSourcesByPinyinMap.get(examplePinyin);
    if (audioSources?.[0] != null) {
      soundAudioSource = audioSources[0];
      break;
    }
  }

  const playSound = useSoundEffect(soundAudioSource);

  const tone1AudioSource = isFinalSound ? null : null;
  const tone2AudioSource = isFinalSound ? null : null;
  const tone3AudioSource = isFinalSound ? null : null;
  const tone4AudioSource = isFinalSound ? null : null;
  const tone5AudioSource = isFinalSound ? null : null;

  return (
    <View className="w-full self-center pb-2 px-safe pt-safe">
      <Breadcrumb pinyinSoundId={id} />

      <HeaderTitleProvider.ScrollTrigger title={label} />

      <View className="my-5 flex-row items-center gap-4">
        <View className={pinyinPartBox()}>
          <Text className="text-center font-cursive text-2xl text-fg">
            {label}
          </Text>
          {soundAudioSource == null ? null : (
            <RectButton
              variant="bare"
              iconStart="speaker-2"
              onPressIn={playSound}
            />
          )}
        </View>
        <InlineEditableSettingText
          variant="title"
          setting={pinyinSoundNameSetting}
          settingKey={{ soundId: id }}
          placeholder="Name this sound"
        />

        <RectButton
          onPress={() => {
            setIsEditSoundNameModalOpen(true);
          }}
          variant="bare"
          iconStart="pencil"
        />
      </View>

      {examplePinyins.length === 0 ? null : (
        <View className="my-5 flex-row items-center gap-4">
          <Text className="pyly-body text-fg-dim">
            Example pinyin: {examplePinyins.join(`, `)}
          </Text>
        </View>
      )}

      <View className="gap-10">
        <WikiTitledBox title="Pronunciation">
          <View className="gap-4 p-4">
            <Text className="pyly-body">
              <Pylymark source={defaultPinyinSoundInstructions[id] ?? ``} />
            </Text>
          </View>
        </WikiTitledBox>

        <MnemonicStoryRoleSection pinyinSoundId={id} />

        {/* Final-tone details editor for finals */}
        {isFinalSound && (
          <PinyinFinalToneEditor
            finalSoundId={id}
            focusedTone={focusedTone}
            toneAudioSourceByTone={{
              1: tone1AudioSource,
              2: tone2AudioSource,
              3: tone3AudioSource,
              4: tone4AudioSource,
              5: tone5AudioSource,
            }}
          />
        )}
      </View>

      <SoundUsageExamplesSection pinyinSoundId={id} />

      <SoundNameEditModal
        soundId={id}
        isOpen={isEditSoundNameModalOpen}
        onClose={() => {
          setIsEditSoundNameModalOpen(false);
        }}
      />
    </View>
  );
}

function MnemonicStoryRoleSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [mnemonicIdentityDraft, setMnemonicIdentityDraft] = useState(``);
  const [mnemonicIdentityError, setMnemonicIdentityError] = useState<
    string | null
  >(null);
  const isFinalSound = isFinalSoundId(pinyinSoundId);
  const chart = loadPylyPinyinChart();
  const soundLabel = getPinyinSoundLabel(pinyinSoundId, chart);
  const mnemonicDescriptionSetting = useUserSetting({
    setting: pinyinSoundDescriptionSetting,
    key: { soundId: pinyinSoundId },
  });
  const mnemonicImageSetting = useUserSetting({
    setting: pinyinSoundImageSetting,
    key: { soundId: pinyinSoundId },
  });
  const mnemonicIdentitySetting = useUserSetting({
    setting: pinyinSoundMnemonicIdentitySetting,
    key: { soundId: pinyinSoundId },
  });
  const modelSheetImageSetting = useUserSetting({
    setting: pinyinSoundModelSheetImageSetting,
    key: { soundId: pinyinSoundId },
  });
  const characterNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: pinyinSoundId },
  });
  const characterName = characterNameSetting.value?.text ?? soundLabel;
  const hasMnemonicIdentity = hasIdentityContent(
    mnemonicIdentitySetting.value?.mnemonicIdentity,
  );

  const handleEditingChange = (editing: boolean) => {
    setIsEditMode(editing);
    setMnemonicIdentityError(null);
    if (editing) {
      setMnemonicIdentityDraft(
        formatIdentityJson(mnemonicIdentitySetting.value?.mnemonicIdentity),
      );
    }
  };

  const saveMnemonicIdentityDraft = () => {
    const trimmed = mnemonicIdentityDraft.trim();
    if (trimmed.length === 0) {
      mnemonicIdentitySetting.setValue(null);
      setMnemonicIdentityError(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      mnemonicIdentitySetting.setValue({
        soundId: pinyinSoundId,
        mnemonicIdentity: parsed,
      });
      setMnemonicIdentityDraft(formatIdentityJson(parsed));
      setMnemonicIdentityError(null);
    } catch {
      setMnemonicIdentityError(`Invalid JSON. Fix formatting before saving.`);
    }
  };

  const hasMnemonicContent =
    (mnemonicDescriptionSetting.value?.text ?? ``).trim().length > 0 ||
    mnemonicImageSetting.value?.imageId != null ||
    modelSheetImageSetting.value?.imageId != null ||
    hasMnemonicIdentity;

  return (
    <WikiTitledBox
      title="Mnemonic story role"
      onEditingChange={handleEditingChange}
    >
      <View className="gap-4 p-4">
        {!isEditMode && !hasMnemonicContent ? (
          <Text className="pyly-body text-fg-dim">
            No description, identity, or images
          </Text>
        ) : (
          <>
            <View className="gap-2">
              {isEditMode ? (
                <InlineEditableSettingText
                  setting={pinyinSoundNameArticleSetting}
                  settingKey={{ soundId: pinyinSoundId }}
                  placeholder="Article (e.g. the, a)"
                />
              ) : null}
              <InlineEditableSettingText
                setting={pinyinSoundDescriptionSetting}
                settingKey={{ soundId: pinyinSoundId }}
                placeholder="Add a description to help with mnemonic generation…"
                readonly={!isEditMode}
                multiline
              />
              {isEditMode && !isFinalSound ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Need help making this character memorable?
                  </Text>
                  <RectButton
                    variant="bare"
                    onPress={() => {
                      setShowAiModal(true);
                    }}
                  >
                    Use AI
                  </RectButton>
                </View>
              ) : null}
            </View>
            <View className="gap-2">
              <Text className="pyly-body-caption text-fg-dim">
                Avatar image
              </Text>
              <InlineEditableSettingImage
                setting={pinyinSoundImageSetting}
                settingKey={{ soundId: pinyinSoundId }}
                readonly={!isEditMode}
                enableAiGeneration
                previewHeight={200}
                tileSize={64}
                frameShape={isInitialSoundId(pinyinSoundId) ? `circle` : `rect`}
                aspectRatio={isInitialSoundId(pinyinSoundId) ? `1:1` : `16:9`}
              />
            </View>
            <View className="gap-2">
              <Text className="pyly-body-caption text-fg-dim">
                Model sheet image
              </Text>
              <InlineEditableSettingImage
                setting={pinyinSoundModelSheetImageSetting}
                settingKey={{ soundId: pinyinSoundId }}
                readonly={!isEditMode}
                previewHeight={220}
                tileSize={64}
                enableAiGeneration
                frameShape="rect"
                aspectRatio="16:9"
              />
            </View>
            <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
              <Text className="pyly-body-caption text-fg-dim">
                Mnemonic identity (JSON)
              </Text>
              {isEditMode ? (
                <>
                  <TextInputMulti
                    variant="bare"
                    placeholder='{"traits": ["curious"]}'
                    autoResizeMinHeight={100}
                    value={mnemonicIdentityDraft}
                    onChangeText={(value) => {
                      setMnemonicIdentityDraft(value);
                      if (mnemonicIdentityError != null) {
                        setMnemonicIdentityError(null);
                      }
                    }}
                    className={`
                      min-h-24 rounded-md border border-fg/15 bg-bg px-3 py-2 font-mono text-[12px]
                    `}
                  />
                  <View className="flex-row flex-wrap gap-2">
                    <RectButton
                      variant="option"
                      onPress={saveMnemonicIdentityDraft}
                    >
                      Save mnemonic identity JSON
                    </RectButton>
                    <RectButton
                      variant="bareDim"
                      onPress={() => {
                        setMnemonicIdentityDraft(``);
                        mnemonicIdentitySetting.setValue(null);
                        setMnemonicIdentityError(null);
                      }}
                    >
                      Clear identity
                    </RectButton>
                  </View>
                  {mnemonicIdentityError == null ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      Stored as JSON for future prompt generation.
                    </Text>
                  ) : (
                    <Text className="pyly-body-caption text-danger">
                      {mnemonicIdentityError}
                    </Text>
                  )}
                </>
              ) : hasMnemonicIdentity ? (
                <Text className="font-mono text-[12px] text-fg">
                  {formatIdentityJson(
                    mnemonicIdentitySetting.value?.mnemonicIdentity,
                  )}
                </Text>
              ) : (
                <Text className="pyly-body-caption text-fg-dim">
                  No mnemonic identity JSON
                </Text>
              )}
            </View>
            {isFinalSound && isEditMode ? (
              <PinyinFinalToneImagePicker finalSoundId={pinyinSoundId} />
            ) : null}
          </>
        )}
      </View>

      {showAiModal && isEditMode && !isFinalSound ? (
        <AiLeadCharacterDescriptionModal
          characterName={characterName}
          sound={soundLabel}
          existingDescription={mnemonicDescriptionSetting.value?.text}
          onApplyDescription={(description) => {
            mnemonicDescriptionSetting.setValue({
              soundId: pinyinSoundId,
              text: description,
            });
            setShowAiModal(false);
          }}
          onDismiss={() => {
            setShowAiModal(false);
          }}
        />
      ) : null}
    </WikiTitledBox>
  );
}

function formatIdentityJson(value: unknown): string {
  if (value == null) {
    return ``;
  }

  return JSON.stringify(value, null, 2);
}

function hasIdentityContent(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === `string`) {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === `object`) {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});

function SoundUsageExamplesSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(eq(entry.hanziCharacterCount, 1), gte(entry.glossCount, 1)),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          hanzi: entry.hanzi,
          gloss: entry.gloss,
          glossCount: entry.glossCount,
          pinyin: entry.pinyin,
          hsk: entry.hsk,
        })),
    [db.dictionarySearch],
  );
  const usageExamples = pickSoundUsageExamplesForEntries({
    allEntries: dictionarySearchEntries,
    limit: 5,
    soundId: pinyinSoundId,
  });

  if (!isInitialOrFinalSoundId(pinyinSoundId)) {
    return null;
  }

  return usageExamples.length === 0 ? null : (
    <WikiTitledBox title="Usage examples" className="mt-10">
      <View className="p-4">
        <CompactWordRows
          dictionarySearchEntries={usageExamples.map((entry) => ({
            ...entry,
            pinyin: entry.pinyin ?? null,
            hsk: entry.hsk ?? null,
          }))}
        />
      </View>
    </WikiTitledBox>
  );
}

function Breadcrumb({ pinyinSoundId }: { pinyinSoundId: PinyinSoundId }) {
  const chart = loadPylyPinyinChart();
  const pinyinSoundGroups = usePinyinSoundGroups();

  const pinyinSoundGroupId = useMemo(
    () => chart.soundGroups.find((g) => g.sounds.includes(pinyinSoundId))?.id,
    [chart, pinyinSoundId],
  );

  const pinyinSoundGroup = pinyinSoundGroups.data.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>

      {pinyinSoundGroupId == null ? null : (
        <Breadcrumbs.Item href="/sounds">
          <SettingText
            setting={pinyinSoundGroupNameSetting}
            settingKey={{ soundGroupId: pinyinSoundGroupId }}
          />
        </Breadcrumbs.Item>
      )}

      {pinyinSoundGroup == null ? (
        <Breadcrumbs.Item>
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </Breadcrumbs.Item>
      ) : (
        <Breadcrumbs.Item
          menu={
            <SiblingSoundMenu
              sounds={pinyinSoundGroup.sounds}
              currentSoundId={pinyinSoundId}
            />
          }
        >
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </Breadcrumbs.Item>
      )}
    </Breadcrumbs>
  );
}

function SiblingSoundMenu({
  sounds,
  currentSoundId,
  onRequestClose,
}: {
  sounds: readonly PinyinSoundId[];
  currentSoundId: PinyinSoundId;
} & FloatingMenuModalMenuProps) {
  return (
    <DropdownMenu.Content
      className="max-h-60 items-start overflow-y-scroll"
      onRequestClose={onRequestClose}
    >
      {sounds.map((soundId) => (
        <DropdownMenu.Item
          key={soundId}
          href={`/sounds/${soundId}`}
          iconEnd={soundId === currentSoundId ? `check` : undefined}
          iconSize={16}
        >
          <PinyinSoundNameText pinyinSoundId={soundId} />
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  );
}

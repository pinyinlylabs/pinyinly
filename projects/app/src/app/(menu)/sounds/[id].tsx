import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { AiLeadCharacterDescriptionModal } from "@/client/ui/AiLeadCharacterDescriptionModal";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { CompactWordRows } from "@/client/ui/CompactWordRows";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
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
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { and, eq, gte, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SoundIdPage() {
  "use memo";
  const { id: rawId, tone: rawTone } = useLocalSearchParams<
    `/sounds/[id]` & { tone?: string }
  >();
  const id = rawId as PinyinSoundId;
  const focusedTone = typeof rawTone === `string` ? rawTone : null;
  const chart = loadPylyPinyinChart();
  const isFinalSound = isFinalSoundId(id);

  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const [toneAnchorY, setToneAnchorY] = useState<number | null>(null);
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

  useEffect(() => {
    if (focusedTone == null || toneAnchorY == null || hasScrolledRef.current) {
      return;
    }

    scrollRef.current?.scrollTo({
      y: Math.max(0, toneAnchorY - 24),
      animated: true,
    });
    hasScrolledRef.current = true;
  }, [focusedTone, toneAnchorY]);

  return (
    <ScrollView ref={scrollRef}>
      <View className="w-full max-w-[800px] self-center pb-2 px-safe pt-safe">
        <Breadcrumb pinyinSoundId={id} />

        <View className="my-5 flex-row items-center gap-4">
          <View className={pinyinPartBox()}>
            <Text className="text-center font-cursive text-2xl text-fg">
              {label}
            </Text>
            {soundAudioSource == null ? null : (
              <RectButton
                variant="bare2"
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
            variant="bare2"
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
              onToneLayout={(tone, layoutY) => {
                if (tone !== focusedTone) {
                  return;
                }
                setToneAnchorY(layoutY);
              }}
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
    </ScrollView>
  );
}

function MnemonicStoryRoleSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
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
  const characterNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: pinyinSoundId },
  });
  const characterName = characterNameSetting.value?.text ?? soundLabel;
  const hasMnemonicContent =
    (mnemonicDescriptionSetting.value?.text ?? ``).trim().length > 0 ||
    mnemonicImageSetting.value?.imageId != null;

  return (
    <WikiTitledBox title="Mnemonic story role" onEditingChange={setIsEditMode}>
      <View className="gap-4 p-4">
        {!isEditMode && !hasMnemonicContent ? (
          <Text className="pyly-body text-fg-dim">No description or image</Text>
        ) : (
          <>
            <View className="gap-2">
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

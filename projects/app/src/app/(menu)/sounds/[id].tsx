import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { FloatingMenuModal } from "@/client/ui/FloatingMenuModal";
import { HanziWordRefText } from "@/client/ui/HanziWordRefText";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinFinalToneEditor } from "@/client/ui/PinyinFinalToneEditor";
import { PinyinSoundNameText } from "@/client/ui/PinyinSoundNameText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import { SettingText } from "@/client/ui/SettingText";
import { SoundNameEditModal } from "@/client/ui/SoundNameEditModal";
import type { SoundUsageExample } from "@/client/ui/soundUsageExamples";
import { pickSoundUsageExamplesForEntries } from "@/client/ui/soundUsageExamples";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  getPinyinSoundLabel,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  hanziPronunciationHintTextSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundImageSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { loadDictionary } from "@/dictionary";
import { useLocalSearchParams } from "expo-router";
import { use, useEffect, useMemo, useRef, useState } from "react";
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

  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const [toneAnchorY, setToneAnchorY] = useState<number | null>(null);
  const [isEditSoundNameModalOpen, setIsEditSoundNameModalOpen] =
    useState(false);

  const label = getPinyinSoundLabel(id, chart);

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

        <View className="gap-10">
          <WikiTitledBox title="Pronunciation">
            <View className="gap-4 p-4">
              <Text className="pyly-body">
                <Pylymark source={defaultPinyinSoundInstructions[id] ?? ``} />
              </Text>
            </View>
          </WikiTitledBox>

          <WikiTitledBox title="Mnemonic story role">
            <View className="gap-4 p-4">
              <InlineEditableSettingText
                setting={pinyinSoundDescriptionSetting}
                settingKey={{ soundId: id }}
                placeholder="Add a description to help with mnemonic generation…"
                multiline
              />
              <InlineEditableSettingImage
                setting={pinyinSoundImageSetting}
                settingKey={{ soundId: id }}
                enableAiGeneration
                previewHeight={200}
                tileSize={64}
                enablePasteDropZone
                frameConstraint={{ aspectRatio: 1 }}
              />
            </View>
          </WikiTitledBox>
        </View>

        {/* Final-tone details editor for finals */}
        {id.startsWith(`-`) && (
          <PinyinFinalToneEditor
            finalSoundId={id}
            focusedTone={focusedTone}
            onToneLayout={(tone, layoutY) => {
              if (tone !== focusedTone) {
                return;
              }
              setToneAnchorY(layoutY);
            }}
          />
        )}

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

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});

function SoundUsageExamplesSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const dictionary = use(loadDictionary());
  const usageExamples = pickSoundUsageExamplesForEntries({
    allEntries: dictionary.allEntries,
    limit: 5,
    soundId: pinyinSoundId,
  });

  if (!isInitialOrFinalSoundId(pinyinSoundId)) {
    return null;
  }

  return (
    <WikiTitledBox title="Usage examples" className="mt-10">
      <View className="gap-4 p-4">
        <Text className="pyly-body text-fg-dim">
          Characters that use this sound. Open any character to inspect its wiki
          page.
        </Text>

        {usageExamples.length === 0 ? (
          <Text className="pyly-body text-fg-dim">
            No single-character examples found yet for this sound.
          </Text>
        ) : (
          <View className="gap-2">
            {usageExamples.map((example) => (
              <SoundUsageExampleRow key={example.hanziWord} example={example} />
            ))}
          </View>
        )}
      </View>
    </WikiTitledBox>
  );
}

function SoundUsageExampleRow({ example }: { example: SoundUsageExample }) {
  return (
    <View className="gap-1 rounded-lg border border-fg/10 bg-bg p-3">
      <Text className="pyly-body-title">
        <HanziWordRefText hanziWord={example.hanziWord} gloss={false} />
        <Text className="text-fg-dim"> {example.pinyin}</Text>
      </Text>
      <Text className="pyly-body text-fg-dim">{example.gloss}</Text>
      <SettingText
        setting={hanziPronunciationHintTextSetting}
        settingKey={{ hanzi: example.hanzi, pinyin: example.pinyin }}
        className="pyly-body text-xs italic text-fg-dim/80"
      />
    </View>
  );
}

function isInitialOrFinalSoundId(soundId: PinyinSoundId): boolean {
  return soundId.endsWith(`-`) || soundId.startsWith(`-`);
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
    <View className="flex-row items-center gap-1">
      <RectButton href="/sounds" variant="bare2" iconSize={20}>
        Sounds
      </RectButton>
      {pinyinSoundGroupId == null ? null : (
        <>
          <Text className="text-fg-dim">/</Text>
          <RectButton href="/sounds" variant="bare2" iconSize={20}>
            <SettingText
              setting={pinyinSoundGroupNameSetting}
              settingKey={{ soundGroupId: pinyinSoundGroupId }}
            />
          </RectButton>
        </>
      )}
      <Text className="text-fg-dim">/</Text>
      {pinyinSoundGroup == null ? (
        <RectButton variant="bare2">
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </RectButton>
      ) : (
        <FloatingMenuModal
          menu={
            <SiblingSoundMenu
              sounds={pinyinSoundGroup.sounds}
              currentSoundId={pinyinSoundId}
            />
          }
        >
          <RectButton iconEnd="chevron-up-down" variant="bare2" iconSize={16}>
            <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
          </RectButton>
        </FloatingMenuModal>
      )}
    </View>
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
    <View className="max-h-60 items-start overflow-y-scroll rounded-xl bg-bg-high p-3">
      {sounds.map((soundId) => (
        <RectButton
          key={soundId}
          href={`/sounds/${soundId}`}
          variant="bare2"
          onPress={onRequestClose}
          iconEnd={soundId === currentSoundId ? `check` : undefined}
          iconSize={16}
        >
          <PinyinSoundNameText pinyinSoundId={soundId} />
        </RectButton>
      ))}
    </View>
  );
}

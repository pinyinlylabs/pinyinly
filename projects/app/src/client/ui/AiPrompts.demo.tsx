import type { ChatPromptMessage } from "@/server/lib/ai";
import { RectButton } from "@/client/ui/RectButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { buildLocationSetDescriptionPrompt } from "@/util/prompts/location";
import {
  buildMeaningHintCausualBridgePrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
} from "@/util/prompts/meaningHint";
import { buildMnemonicActorProfilePrompt } from "@/util/prompts/buildMnemonicActorProfilePrompt";
import {
  buildPronunciationHintFantasyPrompt,
  buildPronunciationHintRealisticPrompt,
} from "@/util/prompts/pronunciationHint";
import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

type PromptModeKind =
  | `meaning-hint`
  | `pronunciation-hint`
  | `location-set-description`
  | `mnemonic-actor`;

type CopyStateKind = `idle` | `copied` | `unsupported`;

type MeaningHintInputType = {
  hanzi: string;
  hanziWord: string;
  glossesText: string;
  componentsText: string;
  countText: string;
};

type PronunciationHintInputType = {
  leadName: string;
  leadBio: string;
  locationName: string;
  locationDescription: string;
  cueWord: string;
  cueMeaning: string;
  countText: string;
};

type LocationSetDescriptionInputType = {
  label: string;
  location: string;
  locationNotes: string;
  locationSet: string;
  countText: string;
};

type MnemonicActorInputType = {
  identity: string;
};

const defaultMeaningHintInput: MeaningHintInputType = {
  hanzi: `好`,
  hanziWord: `好`,
  glossesText: `good, well, fine`,
  componentsText: `女|woman\n子|child`,
  countText: `4`,
};

const defaultPronunciationHintInput: PronunciationHintInputType = {
  leadName: `seal`,
  leadBio: `A dramatic performer who overreacts to tiny mistakes.`,
  locationName: `kitchen`,
  locationDescription: `Bright tiled kitchen packed with loud appliances.`,
  cueWord: `can`,
  cueMeaning: `to be able to`,
  countText: `4`,
};

const defaultLocationSetDescriptionInput: LocationSetDescriptionInputType = {
  label: `Airport baggage carousel`,
  location: `airport`,
  locationNotes: `Large international terminal with glass walls.`,
  locationSet: `baggage carousel area`,
  countText: `4`,
};

const defaultMnemonicActorInput: MnemonicActorInputType = {
  identity: `Dracula`,
};

const meaningHintPresets: MeaningHintInputType[] = [
  defaultMeaningHintInput,
  {
    hanzi: `休`,
    hanziWord: `休息`,
    glossesText: `rest, take a break`,
    componentsText: `亻|person\n木|tree`,
    countText: `5`,
  },
  {
    hanzi: `明`,
    hanziWord: `明`,
    glossesText: `bright, clear`,
    componentsText: `日|sun\n月|moon`,
    countText: `3`,
  },
];

const pronunciationHintPresets: PronunciationHintInputType[] = [
  defaultPronunciationHintInput,
  {
    leadName: `owl`,
    leadBio: `Always whispers secrets with intense seriousness.`,
    locationName: `library`,
    locationDescription: `Ancient stacks with dusty ladders and green lamps.`,
    cueWord: `night`,
    cueMeaning: `the dark part of a day`,
    countText: `4`,
  },
  {
    leadName: `robot`,
    leadBio: `Talks like a motivational coach between beeps.`,
    locationName: `gym`,
    locationDescription: `Echoing room with metallic equipment and mirrors.`,
    cueWord: `press`,
    cueMeaning: `to push`,
    countText: `5`,
  },
];

const locationSetDescriptionPresets: LocationSetDescriptionInputType[] = [
  defaultLocationSetDescriptionInput,
  {
    label: `Train station ticket window`,
    location: `train station`,
    locationNotes: `Busy city transport hub with high ceilings.`,
    locationSet: `ticket window`,
    countText: `4`,
  },
  {
    label: `School rooftop garden`,
    location: `school`,
    locationNotes: `Modern campus focused on science and arts.`,
    locationSet: `rooftop garden`,
    countText: `3`,
  },
];

const mnemonicActorPresets: MnemonicActorInputType[] = [
  defaultMnemonicActorInput,
  {
    identity: `Leprechaun`,
  },
  {
    identity: `Bear`,
  },
];

export default () => {
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [mode, setMode] = useState<PromptModeKind>(`meaning-hint`);
  const [copyState, setCopyState] = useState<CopyStateKind>(`idle`);

  const [meaningInput, setMeaningInput] = useState<MeaningHintInputType>(
    defaultMeaningHintInput,
  );
  const [pronunciationInput, setPronunciationInput] =
    useState<PronunciationHintInputType>(defaultPronunciationHintInput);
  const [locationSetInput, setLocationSetInput] =
    useState<LocationSetDescriptionInputType>(
      defaultLocationSetDescriptionInput,
    );
  const [mnemonicActorInput, setMnemonicActorInput] =
    useState<MnemonicActorInputType>(defaultMnemonicActorInput);

  const promptBuild = buildCurrentPrompt({
    mode,
    meaningInput,
    pronunciationInput,
    locationSetInput,
    mnemonicActorInput,
  });

  const promptPayload =
    promptBuild.result == null
      ? ``
      : promptBuild.result
          .map((message) => [message.role, `\n`, message.content])
          .join(`\n\n`);

  return (
    <ScrollView
      className="max-h-[90vh]"
      contentContainerClassName="gap-4 p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Text className="pyly-body-heading text-fg">AI Prompt Builder</Text>
        <Text className="pyly-body-caption text-fg-dim">
          Configure inputs, generate prompt text, then copy it into ChatGPT.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <ModeButton
          label="Meaning Hint"
          active={mode === `meaning-hint`}
          onPress={() => {
            setMode(`meaning-hint`);
            setCopyState(`idle`);
          }}
        />
        <ModeButton
          label="Pronunciation Hint"
          active={mode === `pronunciation-hint`}
          onPress={() => {
            setMode(`pronunciation-hint`);
            setCopyState(`idle`);
          }}
        />
        <ModeButton
          label="Location Set Description"
          active={mode === `location-set-description`}
          onPress={() => {
            setMode(`location-set-description`);
            setCopyState(`idle`);
          }}
        />
        <ModeButton
          label="Mnemonic Actor"
          active={mode === `mnemonic-actor`}
          onPress={() => {
            setMode(`mnemonic-actor`);
            setCopyState(`idle`);
          }}
        />
      </View>

      <View className="gap-4 rounded-xl border border-fg/10 bg-bg-high p-4">
        {mode === `meaning-hint` ? (
          <View className="gap-3">
            <PresetRow
              count={meaningHintPresets.length}
              onApply={(index) => {
                const preset = meaningHintPresets[index];
                if (preset == null) {
                  return;
                }
                setMeaningInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setMeaningInput(defaultMeaningHintInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Hanzi" />
            <TextInputSingle
              placeholder="Character"
              value={meaningInput.hanzi}
              onChangeText={(value) => {
                setMeaningInput((current) => ({ ...current, hanzi: value }));
              }}
            />

            <FieldLabel text="Hanzi Word" />
            <TextInputSingle
              placeholder="Word"
              value={meaningInput.hanziWord}
              onChangeText={(value) => {
                setMeaningInput((current) => ({
                  ...current,
                  hanziWord: value,
                }));
              }}
            />

            <FieldLabel text="Glosses (comma separated)" />
            <TextInputSingle
              placeholder="good, well, fine"
              value={meaningInput.glossesText}
              onChangeText={(value) => {
                setMeaningInput((current) => ({
                  ...current,
                  glossesText: value,
                }));
              }}
            />

            <FieldLabel text="Components (one per line: hanzi|meaning or hanzi|label|meaning)" />
            <MultilineInput
              value={meaningInput.componentsText}
              onChangeText={(value) => {
                setMeaningInput((current) => ({
                  ...current,
                  componentsText: value,
                }));
              }}
              placeholder="女|woman\n子|child"
            />

            <FieldLabel text="Count" />
            <TextInputSingle
              placeholder="4"
              value={meaningInput.countText}
              onChangeText={(value) => {
                setMeaningInput((current) => ({
                  ...current,
                  countText: value,
                }));
              }}
              keyboardType="number-pad"
            />
          </View>
        ) : null}

        {mode === `pronunciation-hint` ? (
          <View className="gap-3">
            <PresetRow
              count={pronunciationHintPresets.length}
              onApply={(index) => {
                const preset = pronunciationHintPresets[index];
                if (preset == null) {
                  return;
                }
                setPronunciationInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setPronunciationInput(defaultPronunciationHintInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Lead Character Name" />
            <TextInputSingle
              placeholder="seal"
              value={pronunciationInput.leadName}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  leadName: value,
                }));
              }}
            />

            <FieldLabel text="Lead Character Bio (optional)" />
            <MultilineInput
              value={pronunciationInput.leadBio}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  leadBio: value,
                }));
              }}
              placeholder="Short personality cue"
            />

            <FieldLabel text="Location" />
            <TextInputSingle
              placeholder="kitchen"
              value={pronunciationInput.locationName}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  locationName: value,
                }));
              }}
            />

            <FieldLabel text="Location Description (optional)" />
            <MultilineInput
              value={pronunciationInput.locationDescription}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  locationDescription: value,
                }));
              }}
              placeholder="Visual context"
            />

            <FieldLabel text="Cue Word" />
            <TextInputSingle
              placeholder="can"
              value={pronunciationInput.cueWord}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  cueWord: value,
                }));
              }}
            />

            <FieldLabel text="Cue Meaning (optional)" />
            <TextInputSingle
              placeholder="to be able to"
              value={pronunciationInput.cueMeaning}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  cueMeaning: value,
                }));
              }}
            />

            <FieldLabel text="Count" />
            <TextInputSingle
              placeholder="4"
              value={pronunciationInput.countText}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  countText: value,
                }));
              }}
              keyboardType="number-pad"
            />
          </View>
        ) : null}

        {mode === `location-set-description` ? (
          <View className="gap-3">
            <PresetRow
              count={locationSetDescriptionPresets.length}
              onApply={(index) => {
                const preset = locationSetDescriptionPresets[index];
                if (preset == null) {
                  return;
                }
                setLocationSetInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setLocationSetInput(defaultLocationSetDescriptionInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Combined Label" />
            <TextInputSingle
              placeholder="Airport baggage carousel"
              value={locationSetInput.label}
              onChangeText={(value) => {
                setLocationSetInput((current) => ({
                  ...current,
                  label: value,
                }));
              }}
            />

            <FieldLabel text="Location" />
            <TextInputSingle
              placeholder="airport"
              value={locationSetInput.location}
              onChangeText={(value) => {
                setLocationSetInput((current) => ({
                  ...current,
                  location: value,
                }));
              }}
            />

            <FieldLabel text="Location Notes (optional)" />
            <MultilineInput
              value={locationSetInput.locationNotes}
              onChangeText={(value) => {
                setLocationSetInput((current) => ({
                  ...current,
                  locationNotes: value,
                }));
              }}
              placeholder="Optional stable context"
            />

            <FieldLabel text="Location Set" />
            <TextInputSingle
              placeholder="baggage carousel area"
              value={locationSetInput.locationSet}
              onChangeText={(value) => {
                setLocationSetInput((current) => ({
                  ...current,
                  locationSet: value,
                }));
              }}
            />

            <FieldLabel text="Count" />
            <TextInputSingle
              placeholder="4"
              value={locationSetInput.countText}
              onChangeText={(value) => {
                setLocationSetInput((current) => ({
                  ...current,
                  countText: value,
                }));
              }}
              keyboardType="number-pad"
            />
          </View>
        ) : null}

        {mode === `mnemonic-actor` ? (
          <View className="gap-3">
            <PresetRow
              count={mnemonicActorPresets.length}
              onApply={(index) => {
                const preset = mnemonicActorPresets[index];
                if (preset == null) {
                  return;
                }
                setMnemonicActorInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setMnemonicActorInput(defaultMnemonicActorInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Actor Identity" />
            <TextInputSingle
              placeholder="Dracula"
              value={mnemonicActorInput.identity}
              onChangeText={(value) => {
                setMnemonicActorInput((current) => ({
                  ...current,
                  identity: value,
                }));
              }}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-3 rounded-xl border border-fg/10 bg-bg-high p-4">
        <View className="flex-row items-center gap-2">
          <RectButton
            variant="filled"
            disabled={promptBuild.result == null}
            onPress={() => {
              void copyToClipboard(promptPayload).then((didCopy) => {
                setCopyState(didCopy ? `copied` : `unsupported`);
                if (copyResetTimeoutRef.current != null) {
                  clearTimeout(copyResetTimeoutRef.current);
                }
                copyResetTimeoutRef.current = setTimeout(() => {
                  setCopyState(`idle`);
                }, 1400);
              });
            }}
          >
            {copyState === `idle`
              ? `Copy Prompt`
              : copyState === `copied`
                ? `Copied`
                : `Copy Unsupported`}
          </RectButton>
          <Text className="pyly-body-caption text-fg-dim">
            Output format: System + User
          </Text>
        </View>

        {promptBuild.errors.length > 0 ? (
          <View className="gap-1 rounded-lg border border-danger/30 bg-danger/10 p-3">
            {promptBuild.errors.map((error) => (
              <Text key={error} className="pyly-body-caption text-danger">
                {error}
              </Text>
            ))}
          </View>
        ) : null}

        {promptBuild.result?.map((message, index) => (
          <View className="gap-2" key={index}>
            <FieldLabel text={message.role} />
            <SelectableOutput text={message.content} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <RectButton
      variant={active ? `filled` : `outline`}
      onPress={onPress}
      className={active ? `[--color-fg:var(--color-cyanold)]` : undefined}
    >
      {label}
    </RectButton>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text className="pyly-body-caption text-fg-dim">{text}</Text>;
}

function PresetRow({
  count,
  onApply,
  onReset,
}: {
  count: number;
  onApply: (index: number) => void;
  onReset: () => void;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="pyly-body-caption text-fg-dim">Presets</Text>
      {Array.from({ length: count }, (_, index) => {
        const label = `Preset ${index + 1}`;
        return (
          <RectButton
            key={label}
            variant="outline"
            onPress={() => {
              onApply(index);
            }}
          >
            {label}
          </RectButton>
        );
      })}
      <RectButton variant="bare" onPress={onReset}>
        Reset
      </RectButton>
    </View>
  );
}

function MultilineInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      value={value}
      onChangeText={onChangeText}
      multiline
      textAlignVertical="top"
      className={`
        min-h-22 rounded-xl bg-bg px-4 py-3 font-sans text-sm text-fg outline-none

        web:placeholder:text-fg/30
      `}
    />
  );
}

function SelectableOutput({ text }: { text: string }) {
  return (
    <View className="rounded-xl border border-fg/10 bg-bg p-3">
      <Text selectable className="font-mono text-sm text-fg">
        {text.length > 0 ? text : ` `}
      </Text>
    </View>
  );
}

function parseCount(text: string): number | null {
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value < 1) {
    return null;
  }
  return value;
}

function parseGlosses(glossesText: string): string[] {
  return glossesText
    .split(`,`)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseComponents(componentsText: string): {
  hanzi?: string;
  label?: string;
  meaning?: string;
}[] {
  return componentsText
    .split(`\n`)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [partA, partB, partC] = line.split(`|`).map((part) => part.trim());
      const hanzi = toOptionalString(partA);
      const secondPart = toOptionalString(partB);
      const thirdPart = toOptionalString(partC);

      if (partC != null) {
        return {
          hanzi,
          label: secondPart,
          meaning: thirdPart,
        };
      }

      return {
        hanzi,
        meaning: secondPart,
      };
    });
}

function toOptionalString(value: string | undefined): string | undefined {
  if (value == null || value.length === 0) {
    return undefined;
  }
  return value;
}

function buildCurrentPrompt(args: {
  mode: PromptModeKind;
  meaningInput: MeaningHintInputType;
  pronunciationInput: PronunciationHintInputType;
  locationSetInput: LocationSetDescriptionInputType;
  mnemonicActorInput: MnemonicActorInputType;
}): { result: ChatPromptMessage[] | null; errors: string[] } {
  const errors: string[] = [];

  if (args.mode === `meaning-hint`) {
    const glosses = parseGlosses(args.meaningInput.glossesText);
    const count = parseCount(args.meaningInput.countText);

    if (args.meaningInput.hanzi.trim().length === 0) {
      errors.push(`Hanzi is required.`);
    }
    if (args.meaningInput.hanziWord.trim().length === 0) {
      errors.push(`Hanzi Word is required.`);
    }
    if (glosses.length === 0) {
      errors.push(`At least one gloss is required.`);
    }
    if (count == null) {
      errors.push(`Count must be a positive integer.`);
    }

    if (errors.length > 0) {
      return { result: null, errors };
    }

    const visual = buildMeaningHintPrompt({
      hanzi: args.meaningInput.hanzi.trim(),
      meaning: {
        hanziWord: args.meaningInput.hanziWord.trim(),
        glosses,
      },
      components: parseComponents(args.meaningInput.componentsText),
      count: count ?? 1,
    });

    const logical = buildMeaningHintLogicalPrompt({
      hanzi: args.meaningInput.hanzi.trim(),
      meaning: {
        hanziWord: args.meaningInput.hanziWord.trim(),
        glosses,
      },
      components: parseComponents(args.meaningInput.componentsText),
      count: count ?? 1,
    });

    const causalBridge = buildMeaningHintCausualBridgePrompt({
      hanzi: args.meaningInput.hanzi.trim(),
      meaning: {
        hanziWord: args.meaningInput.hanziWord.trim(),
        glosses,
      },
      components: parseComponents(args.meaningInput.componentsText),
      count: count ?? 1,
    });

    const result: ChatPromptMessage[] = [
      {
        role: `system`,
        content: `[Visual]\n\n${visual.messages[0]?.content ?? ``}`,
      },
      {
        role: `user`,
        content: visual.messages[1]?.content ?? ``,
      },
      {
        role: `system`,
        content: `[Logical]\n\n${logical.messages[0]?.content ?? ``}`,
      },
      {
        role: `user`,
        content: logical.messages[1]?.content ?? ``,
      },
      {
        role: `system`,
        content: `[Causal Bridge]\n\n${causalBridge.messages[0]?.content ?? ``}`,
      },
      {
        role: `user`,
        content: causalBridge.messages[1]?.content ?? ``,
      },
    ];

    return { result, errors };
  }

  if (args.mode === `pronunciation-hint`) {
    const count = parseCount(args.pronunciationInput.countText);

    if (args.pronunciationInput.leadName.trim().length === 0) {
      errors.push(`Lead Character Name is required.`);
    }
    if (args.pronunciationInput.locationName.trim().length === 0) {
      errors.push(`Location is required.`);
    }
    if (args.pronunciationInput.cueWord.trim().length === 0) {
      errors.push(`Cue Word is required.`);
    }
    if (count == null) {
      errors.push(`Count must be a positive integer.`);
    }

    if (errors.length > 0) {
      return { result: null, errors };
    }

    const input = {
      leadCharacter: {
        name: args.pronunciationInput.leadName.trim(),
        bio:
          args.pronunciationInput.leadBio.trim().length === 0
            ? undefined
            : args.pronunciationInput.leadBio.trim(),
      },
      location: {
        name: args.pronunciationInput.locationName.trim(),
        description:
          args.pronunciationInput.locationDescription.trim().length === 0
            ? undefined
            : args.pronunciationInput.locationDescription.trim(),
      },
      cue: {
        word: args.pronunciationInput.cueWord.trim(),
        meaning:
          args.pronunciationInput.cueMeaning.trim().length === 0
            ? undefined
            : args.pronunciationInput.cueMeaning.trim(),
      },
      count: count ?? 1,
    };

    const fantasy = buildPronunciationHintFantasyPrompt(input);
    const realistic = buildPronunciationHintRealisticPrompt(input);

    const result: ChatPromptMessage[] = [
      {
        role: `system`,
        content: `[Fantasy]\n\n${fantasy.messages[0]?.content ?? ``}`,
      },
      {
        role: `user`,
        content: fantasy.messages[1]?.content ?? ``,
      },
      {
        role: `system`,
        content: `[Realistic]\n\n${realistic.messages[0]?.content ?? ``}`,
      },
      {
        role: `user`,
        content: realistic.messages[1]?.content ?? ``,
      },
    ];

    return { result, errors };
  }

  if (args.mode === `location-set-description`) {
    const count = parseCount(args.locationSetInput.countText);

    if (args.locationSetInput.label.trim().length === 0) {
      errors.push(`Combined Label is required.`);
    }
    if (args.locationSetInput.location.trim().length === 0) {
      errors.push(`Location is required.`);
    }
    if (args.locationSetInput.locationSet.trim().length === 0) {
      errors.push(`Location set is required.`);
    }
    if (count == null) {
      errors.push(`Count must be a positive integer.`);
    }

    if (errors.length > 0) {
      return { result: null, errors };
    }

    const result = buildLocationSetDescriptionPrompt({
      label: args.locationSetInput.label.trim(),
      location: args.locationSetInput.location.trim(),
      locationNotes:
        args.locationSetInput.locationNotes.trim().length === 0
          ? undefined
          : args.locationSetInput.locationNotes.trim(),
      locationSet: args.locationSetInput.locationSet.trim(),
      count: count ?? 1,
    });

    return { result: result.messages, errors };
  }

  if (args.mnemonicActorInput.identity.trim().length === 0) {
    errors.push(`Actor Identity is required.`);
  }

  if (errors.length > 0) {
    return { result: null, errors };
  }

  const result = buildMnemonicActorProfilePrompt({
    identity: args.mnemonicActorInput.identity.trim(),
  });

  return { result: result.messages, errors };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (text.length === 0) {
    return false;
  }

  const globalNavigator = globalThis.navigator;
  if (typeof globalNavigator.clipboard.writeText === `function`) {
    await globalNavigator.clipboard.writeText(text);
    return true;
  }

  return false;
}

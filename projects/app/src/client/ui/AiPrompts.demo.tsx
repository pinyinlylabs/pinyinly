import type { ChatPromptMessage } from "@/server/lib/ai";
import { RectButton } from "@/client/ui/RectButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import {
  buildLeadCharacterDescriptionPrompt,
  buildMeaningHintPrompt,
  buildPronunciationHintPrompt,
  buildSubLocationDescriptionPrompt,
} from "@/util/prompts";
import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

type PromptModeKind =
  | `meaning-hint`
  | `pronunciation-hint`
  | `sub-location-description`
  | `lead-character-description`;

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
  leadArticle: string;
  leadBio: string;
  locationName: string;
  locationDescription: string;
  cueWord: string;
  cueMeaning: string;
  creativeDirection: string;
  countText: string;
};

type SubLocationDescriptionInputType = {
  label: string;
  location: string;
  locationNotes: string;
  sublocation: string;
  viewpoint: string;
  countText: string;
};

type LeadCharacterDescriptionInputType = {
  name: string;
  sound: string;
  existingDescription: string;
  countText: string;
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
  leadArticle: `the`,
  leadBio: `A dramatic performer who overreacts to tiny mistakes.`,
  locationName: `kitchen`,
  locationDescription: `Bright tiled kitchen packed with loud appliances.`,
  cueWord: `can`,
  cueMeaning: `to be able to`,
  creativeDirection: `Make it surreal and very visual.`,
  countText: `4`,
};

const defaultSubLocationDescriptionInput: SubLocationDescriptionInputType = {
  label: `Airport baggage carousel`,
  location: `airport`,
  locationNotes: `Large international terminal with glass walls.`,
  sublocation: `baggage carousel area`,
  viewpoint: `standing at the carousel facing incoming luggage`,
  countText: `4`,
};

const defaultLeadCharacterDescriptionInput: LeadCharacterDescriptionInputType =
  {
    name: `Chef Li`,
    sound: `li`,
    existingDescription: `Known for balancing bowls on his head while teaching.`,
    countText: `4`,
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
    leadArticle: `an`,
    leadBio: `Always whispers secrets with intense seriousness.`,
    locationName: `library`,
    locationDescription: `Ancient stacks with dusty ladders and green lamps.`,
    cueWord: `night`,
    cueMeaning: `the dark part of a day`,
    creativeDirection: `Lean into eerie comedy.`,
    countText: `4`,
  },
  {
    leadName: `robot`,
    leadArticle: `a`,
    leadBio: `Talks like a motivational coach between beeps.`,
    locationName: `gym`,
    locationDescription: `Echoing room with metallic equipment and mirrors.`,
    cueWord: `press`,
    cueMeaning: `to push`,
    creativeDirection: `Fast, energetic action.`,
    countText: `5`,
  },
];

const subLocationDescriptionPresets: SubLocationDescriptionInputType[] = [
  defaultSubLocationDescriptionInput,
  {
    label: `Train station ticket window`,
    location: `train station`,
    locationNotes: `Busy city transport hub with high ceilings.`,
    sublocation: `ticket window`,
    viewpoint: `standing in line facing the clerk window`,
    countText: `4`,
  },
  {
    label: `School rooftop garden`,
    location: `school`,
    locationNotes: `Modern campus focused on science and arts.`,
    sublocation: `rooftop garden`,
    viewpoint: `near the planter beds looking toward the city`,
    countText: `3`,
  },
];

const leadCharacterDescriptionPresets: LeadCharacterDescriptionInputType[] = [
  defaultLeadCharacterDescriptionInput,
  {
    name: `Mina`,
    sound: `mi`,
    existingDescription: `Collects tiny clocks and times every conversation.`,
    countText: `5`,
  },
  {
    name: `Gao`,
    sound: `gao`,
    existingDescription: `Climbs on chairs to make every announcement.`,
    countText: `4`,
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
  const [subLocationInput, setSubLocationInput] =
    useState<SubLocationDescriptionInputType>(
      defaultSubLocationDescriptionInput,
    );
  const [leadCharacterInput, setLeadCharacterInput] =
    useState<LeadCharacterDescriptionInputType>(
      defaultLeadCharacterDescriptionInput,
    );

  const promptBuild = buildCurrentPrompt({
    mode,
    meaningInput,
    pronunciationInput,
    subLocationInput,
    leadCharacterInput,
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
          label="Sub-location Description"
          active={mode === `sub-location-description`}
          onPress={() => {
            setMode(`sub-location-description`);
            setCopyState(`idle`);
          }}
        />
        <ModeButton
          label="Lead Character Description"
          active={mode === `lead-character-description`}
          onPress={() => {
            setMode(`lead-character-description`);
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

            <FieldLabel text="Lead Character Article (optional)" />
            <TextInputSingle
              placeholder="the"
              value={pronunciationInput.leadArticle}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  leadArticle: value,
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

            <FieldLabel text="Creative Direction (optional)" />
            <MultilineInput
              value={pronunciationInput.creativeDirection}
              onChangeText={(value) => {
                setPronunciationInput((current) => ({
                  ...current,
                  creativeDirection: value,
                }));
              }}
              placeholder="Tone and style guidance"
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

        {mode === `sub-location-description` ? (
          <View className="gap-3">
            <PresetRow
              count={subLocationDescriptionPresets.length}
              onApply={(index) => {
                const preset = subLocationDescriptionPresets[index];
                if (preset == null) {
                  return;
                }
                setSubLocationInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setSubLocationInput(defaultSubLocationDescriptionInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Combined Label" />
            <TextInputSingle
              placeholder="Airport baggage carousel"
              value={subLocationInput.label}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  label: value,
                }));
              }}
            />

            <FieldLabel text="Location" />
            <TextInputSingle
              placeholder="airport"
              value={subLocationInput.location}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  location: value,
                }));
              }}
            />

            <FieldLabel text="Location Notes (optional)" />
            <MultilineInput
              value={subLocationInput.locationNotes}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  locationNotes: value,
                }));
              }}
              placeholder="Optional stable context"
            />

            <FieldLabel text="Sublocation" />
            <TextInputSingle
              placeholder="baggage carousel area"
              value={subLocationInput.sublocation}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  sublocation: value,
                }));
              }}
            />

            <FieldLabel text="Viewpoint (optional)" />
            <TextInputSingle
              placeholder="standing near the conveyor"
              value={subLocationInput.viewpoint}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  viewpoint: value,
                }));
              }}
            />

            <FieldLabel text="Count" />
            <TextInputSingle
              placeholder="4"
              value={subLocationInput.countText}
              onChangeText={(value) => {
                setSubLocationInput((current) => ({
                  ...current,
                  countText: value,
                }));
              }}
              keyboardType="number-pad"
            />
          </View>
        ) : null}

        {mode === `lead-character-description` ? (
          <View className="gap-3">
            <PresetRow
              count={leadCharacterDescriptionPresets.length}
              onApply={(index) => {
                const preset = leadCharacterDescriptionPresets[index];
                if (preset == null) {
                  return;
                }
                setLeadCharacterInput(preset);
                setCopyState(`idle`);
              }}
              onReset={() => {
                setLeadCharacterInput(defaultLeadCharacterDescriptionInput);
                setCopyState(`idle`);
              }}
            />

            <FieldLabel text="Character Name" />
            <TextInputSingle
              placeholder="Chef Li"
              value={leadCharacterInput.name}
              onChangeText={(value) => {
                setLeadCharacterInput((current) => ({
                  ...current,
                  name: value,
                }));
              }}
            />

            <FieldLabel text="Associated Pinyin Sound" />
            <TextInputSingle
              placeholder="li"
              value={leadCharacterInput.sound}
              onChangeText={(value) => {
                setLeadCharacterInput((current) => ({
                  ...current,
                  sound: value,
                }));
              }}
            />

            <FieldLabel text="Existing Description (optional)" />
            <MultilineInput
              value={leadCharacterInput.existingDescription}
              onChangeText={(value) => {
                setLeadCharacterInput((current) => ({
                  ...current,
                  existingDescription: value,
                }));
              }}
              placeholder="Optional existing personality cue"
            />

            <FieldLabel text="Count" />
            <TextInputSingle
              placeholder="4"
              value={leadCharacterInput.countText}
              onChangeText={(value) => {
                setLeadCharacterInput((current) => ({
                  ...current,
                  countText: value,
                }));
              }}
              keyboardType="number-pad"
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
        min-h-[88px] rounded-xl bg-bg px-4 py-3 font-sans text-sm text-fg outline-none

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
  subLocationInput: SubLocationDescriptionInputType;
  leadCharacterInput: LeadCharacterDescriptionInputType;
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

    const result = buildMeaningHintPrompt({
      hanzi: args.meaningInput.hanzi.trim(),
      meaning: {
        hanziWord: args.meaningInput.hanziWord.trim(),
        glosses,
      },
      components: parseComponents(args.meaningInput.componentsText),
      count: count ?? 1,
    });

    return { result: result.messages, errors };
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

    const result = buildPronunciationHintPrompt({
      leadCharacter: {
        name: args.pronunciationInput.leadName.trim(),
        article:
          args.pronunciationInput.leadArticle.trim().length === 0
            ? undefined
            : args.pronunciationInput.leadArticle.trim(),
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
      creativeDirection:
        args.pronunciationInput.creativeDirection.trim().length === 0
          ? undefined
          : args.pronunciationInput.creativeDirection.trim(),
      count: count ?? 1,
    });

    return { result: result.messages, errors };
  }

  if (args.mode === `sub-location-description`) {
    const count = parseCount(args.subLocationInput.countText);

    if (args.subLocationInput.label.trim().length === 0) {
      errors.push(`Combined Label is required.`);
    }
    if (args.subLocationInput.location.trim().length === 0) {
      errors.push(`Location is required.`);
    }
    if (args.subLocationInput.sublocation.trim().length === 0) {
      errors.push(`Sublocation is required.`);
    }
    if (count == null) {
      errors.push(`Count must be a positive integer.`);
    }

    if (errors.length > 0) {
      return { result: null, errors };
    }

    const result = buildSubLocationDescriptionPrompt({
      label: args.subLocationInput.label.trim(),
      location: args.subLocationInput.location.trim(),
      locationNotes:
        args.subLocationInput.locationNotes.trim().length === 0
          ? undefined
          : args.subLocationInput.locationNotes.trim(),
      sublocation: args.subLocationInput.sublocation.trim(),
      viewpoint:
        args.subLocationInput.viewpoint.trim().length === 0
          ? undefined
          : args.subLocationInput.viewpoint.trim(),
      count: count ?? 1,
    });

    return { result: result.messages, errors };
  }

  const count = parseCount(args.leadCharacterInput.countText);
  if (args.leadCharacterInput.name.trim().length === 0) {
    errors.push(`Character Name is required.`);
  }
  if (args.leadCharacterInput.sound.trim().length === 0) {
    errors.push(`Associated Pinyin Sound is required.`);
  }
  if (count == null) {
    errors.push(`Count must be a positive integer.`);
  }

  if (errors.length > 0) {
    return { result: null, errors };
  }

  const result = buildLeadCharacterDescriptionPrompt({
    name: args.leadCharacterInput.name.trim(),
    sound: args.leadCharacterInput.sound.trim(),
    existingDescription:
      args.leadCharacterInput.existingDescription.trim().length === 0
        ? undefined
        : args.leadCharacterInput.existingDescription.trim(),
    count: count ?? 1,
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

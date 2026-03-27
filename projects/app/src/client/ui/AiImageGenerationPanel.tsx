import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { getAiImageStyleConfig } from "@/client/aiImageStyle";
import { trpc } from "@/client/trpc";
import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { FloatingMenuModal } from "@/client/ui/FloatingMenuModal";
import { usePointerHoverCapability } from "@/client/ui/hooks/usePointerHoverCapability";
import type { UserSettingKeyInput } from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { AssetId } from "@/data/model";
import { aiImagePlaygroundSetting } from "@/data/userSettings";
import { setAdd, setDelete, setToggle } from "@pinyinly/lib/collections";
import type {
  UserSetting,
  UserSettingImageEntity,
  UserSettingTextEntity,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { invariant } from "@pinyinly/lib/invariant";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AssetImage } from "./AssetImage";
import { ButtonGroup } from "./ButtonGroup";
import { RectButton } from "./RectButton";
import { TextInputMulti } from "./TextInputMulti";
import { Tooltip } from "./Tooltip";

type AiImagePlaygroundRole = `user` | `assistant`;

interface AiImagePlaygroundMessage {
  id: string;
  role: AiImagePlaygroundRole;
  text?: string;
  assetId?: AssetId;
  contextReferenceEntries?: AiImageContextReferenceEntry[];
  createdAtIso: string;
}

interface AiImagePlaygroundThread {
  id: string;
  title: string;
  draftPrompt: string;
  createdAtIso: string;
  updatedAtIso: string;
  messages: AiImagePlaygroundMessage[];
}

interface AiImagePlaygroundStateV1 {
  version: 1;
  activeThreadId: string | null;
  threads: AiImagePlaygroundThread[];
}

const MAX_AI_PLAYGROUND_THREADS = 12;
const MAX_AI_PLAYGROUND_MESSAGES_PER_THREAD = 40;
const MAX_AI_REFERENCE_IMAGES = 8;

type AiReferenceImageKind = `actor` | `location` | `other`;

/**
 * Declarative reference to an image setting that will be lazily resolved during AI generation.
 * Labels can be either static strings or fetched from a UserSettingTextEntity.
 */
export interface AiReferenceImageDeclaration {
  id?: string;
  imageSetting: UserSetting<UserSettingImageEntity>;
  imageSettingKey: UserSettingKeyInput<UserSettingImageEntity>;
  label:
    | string
    | {
        setting: UserSetting<UserSettingTextEntity>;
        key: UserSettingKeyInput<UserSettingTextEntity>;
      };
  kind?: AiReferenceImageKind;
  defaultVisibleInRow?: boolean;
  fallbackForId?: string;
  fallbackOrder?: number;
  fallbackHintLabel?: string;
  missingPromptPrefill?: string;
}

export interface AiImageGenerationPanelProps {
  initialPrompt?: string;
  aiImageStyle?: AiImageStyleKind | null;
  aiReferenceImages?: AiReferenceImageDeclaration[];
  playgroundStorageKey: string;
  onChangeImage: (assetId: AssetId) => void;
  onError?: (message: string) => void;
  onSavePrompt?: (prompt: string) => void;
}

interface AiImageContextReferenceEntry {
  label: string;
  assetId: AssetId;
}

interface AiResolvedReference {
  id: string;
  label: string;
  kind: AiReferenceImageKind;
  assetId: AssetId | null;
  defaultVisibleInRow: boolean;
  fallbackForId: string | null;
  fallbackOrder: number;
  fallbackHintLabel: string | null;
  missingPromptPrefill: string | null;
  setImage: ((assetId: AssetId) => void) | null;
}

interface AiQuickPromptAction {
  id: string;
  label: string;
  prompt: string;
}

export function AiImageGenerationPanel({
  initialPrompt = ``,
  aiImageStyle = null,
  aiReferenceImages,
  playgroundStorageKey,
  onChangeImage,
  onError,
  onSavePrompt,
}: AiImageGenerationPanelProps) {
  const playgroundSettingResult = useUserSetting({
    setting: aiImagePlaygroundSetting,
    key: { settingKey: playgroundStorageKey },
  });

  const [playgroundState, setPlaygroundState] =
    useState<AiImagePlaygroundStateV1>(() =>
      createInitialPlaygroundState(initialPrompt),
    );
  const [isLoadedFromSetting, setIsLoadedFromSetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const hasScrolledInitiallyRef = useRef(false);
  const previousActiveThreadIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);
  const playgroundSettingLoading = playgroundSettingResult.isLoading;
  const playgroundSettingText = playgroundSettingResult.value?.text;

  useEffect(() => {
    if (playgroundSettingLoading) {
      return;
    }

    const parsed = parseAiImagePlaygroundState(
      playgroundSettingText,
      initialPrompt,
    );
    setPlaygroundState(parsed);
    setIsLoadedFromSetting(true);
  }, [initialPrompt, playgroundSettingLoading, playgroundSettingText]);

  // Destructure up to 8 reference images with static hooks
  const [
    aiReferenceImage1,
    aiReferenceImage2,
    aiReferenceImage3,
    aiReferenceImage4,
    aiReferenceImage5,
    aiReferenceImage6,
    aiReferenceImage7,
    aiReferenceImage8,
  ] = aiReferenceImages ?? [];

  invariant(
    (aiReferenceImages?.length ?? 0) <= MAX_AI_REFERENCE_IMAGES,
    `A maximum of ${String(MAX_AI_REFERENCE_IMAGES)} reference images can be provided`,
  );

  const reference1ImageSetting = useUserSetting(
    aiReferenceImage1 == null
      ? null
      : {
          setting: aiReferenceImage1.imageSetting,
          key: aiReferenceImage1.imageSettingKey,
        },
  );
  const reference1LabelSetting = useUserSetting(
    aiReferenceImage1 == null || typeof aiReferenceImage1.label !== `object`
      ? null
      : aiReferenceImage1.label,
  );

  const reference2ImageSetting = useUserSetting(
    aiReferenceImage2 == null
      ? null
      : {
          setting: aiReferenceImage2.imageSetting,
          key: aiReferenceImage2.imageSettingKey,
        },
  );
  const reference2LabelSetting = useUserSetting(
    aiReferenceImage2 == null || typeof aiReferenceImage2.label !== `object`
      ? null
      : aiReferenceImage2.label,
  );

  const reference3ImageSetting = useUserSetting(
    aiReferenceImage3 == null
      ? null
      : {
          setting: aiReferenceImage3.imageSetting,
          key: aiReferenceImage3.imageSettingKey,
        },
  );
  const reference3LabelSetting = useUserSetting(
    aiReferenceImage3 == null || typeof aiReferenceImage3.label !== `object`
      ? null
      : aiReferenceImage3.label,
  );

  const reference4ImageSetting = useUserSetting(
    aiReferenceImage4 == null
      ? null
      : {
          setting: aiReferenceImage4.imageSetting,
          key: aiReferenceImage4.imageSettingKey,
        },
  );
  const reference4LabelSetting = useUserSetting(
    aiReferenceImage4 == null || typeof aiReferenceImage4.label !== `object`
      ? null
      : aiReferenceImage4.label,
  );

  const reference5ImageSetting = useUserSetting(
    aiReferenceImage5 == null
      ? null
      : {
          setting: aiReferenceImage5.imageSetting,
          key: aiReferenceImage5.imageSettingKey,
        },
  );
  const reference5LabelSetting = useUserSetting(
    aiReferenceImage5 == null || typeof aiReferenceImage5.label !== `object`
      ? null
      : aiReferenceImage5.label,
  );

  const reference6ImageSetting = useUserSetting(
    aiReferenceImage6 == null
      ? null
      : {
          setting: aiReferenceImage6.imageSetting,
          key: aiReferenceImage6.imageSettingKey,
        },
  );
  const reference6LabelSetting = useUserSetting(
    aiReferenceImage6 == null || typeof aiReferenceImage6.label !== `object`
      ? null
      : aiReferenceImage6.label,
  );

  const reference7ImageSetting = useUserSetting(
    aiReferenceImage7 == null
      ? null
      : {
          setting: aiReferenceImage7.imageSetting,
          key: aiReferenceImage7.imageSettingKey,
        },
  );
  const reference7LabelSetting = useUserSetting(
    aiReferenceImage7 == null || typeof aiReferenceImage7.label !== `object`
      ? null
      : aiReferenceImage7.label,
  );

  const reference8ImageSetting = useUserSetting(
    aiReferenceImage8 == null
      ? null
      : {
          setting: aiReferenceImage8.imageSetting,
          key: aiReferenceImage8.imageSettingKey,
        },
  );
  const reference8LabelSetting = useUserSetting(
    aiReferenceImage8 == null || typeof aiReferenceImage8.label !== `object`
      ? null
      : aiReferenceImage8.label,
  );

  const generateMutation = trpc.ai.generateHintImage.useMutation();
  const isPointerHoverCapable = usePointerHoverCapability();

  const persistPlaygroundState = (nextState: AiImagePlaygroundStateV1) => {
    playgroundSettingResult.setValue(
      {
        settingKey: playgroundStorageKey,
        text: JSON.stringify(nextState),
      },
      { skipHistory: true },
    );
  };

  const updatePlaygroundState = (
    updater: (prev: AiImagePlaygroundStateV1) => AiImagePlaygroundStateV1,
  ) => {
    setPlaygroundState((prev) => {
      const next = updater(prev);
      persistPlaygroundState(next);
      return next;
    });
  };

  const activeThread =
    playgroundState.threads.find(
      (thread) => thread.id === playgroundState.activeThreadId,
    ) ??
    playgroundState.threads[0] ??
    null;

  const latestAssistantImageMessage =
    activeThread?.messages
      .slice()
      .reverse()
      .find(
        (message) => message.role === `assistant` && message.assetId != null,
      ) ?? null;
  const activeThreadLatestAssistantImageAssetId =
    latestAssistantImageMessage?.assetId ?? null;
  const activeThreadLatestAssistantImageMessageId =
    latestAssistantImageMessage?.id ?? null;
  const activeThreadId = activeThread?.id ?? null;
  const activeThreadMessageCount = activeThread?.messages.length ?? 0;
  const styleReferenceConfig =
    aiImageStyle == null ? null : getAiImageStyleConfig(aiImageStyle);

  const referenceSettings = [
    {
      declaration: aiReferenceImage1,
      imageSetting: reference1ImageSetting,
      labelSetting: reference1LabelSetting,
      fallbackId: `reference-1`,
    },
    {
      declaration: aiReferenceImage2,
      imageSetting: reference2ImageSetting,
      labelSetting: reference2LabelSetting,
      fallbackId: `reference-2`,
    },
    {
      declaration: aiReferenceImage3,
      imageSetting: reference3ImageSetting,
      labelSetting: reference3LabelSetting,
      fallbackId: `reference-3`,
    },
    {
      declaration: aiReferenceImage4,
      imageSetting: reference4ImageSetting,
      labelSetting: reference4LabelSetting,
      fallbackId: `reference-4`,
    },
    {
      declaration: aiReferenceImage5,
      imageSetting: reference5ImageSetting,
      labelSetting: reference5LabelSetting,
      fallbackId: `reference-5`,
    },
    {
      declaration: aiReferenceImage6,
      imageSetting: reference6ImageSetting,
      labelSetting: reference6LabelSetting,
      fallbackId: `reference-6`,
    },
    {
      declaration: aiReferenceImage7,
      imageSetting: reference7ImageSetting,
      labelSetting: reference7LabelSetting,
      fallbackId: `reference-7`,
    },
    {
      declaration: aiReferenceImage8,
      imageSetting: reference8ImageSetting,
      labelSetting: reference8LabelSetting,
      fallbackId: `reference-8`,
    },
  ];

  const allReferences: AiResolvedReference[] = [];
  for (const item of referenceSettings) {
    const declaration = item.declaration;
    if (declaration == null) {
      continue;
    }
    const settingResult = item.imageSetting;

    const label =
      typeof declaration.label === `string`
        ? declaration.label
        : item.labelSetting?.value?.text;
    const id = (declaration.id ?? item.fallbackId).trim();

    allReferences.push({
      id: id.length > 0 ? id : item.fallbackId,
      label: (label ?? `Reference image`).trim(),
      kind: declaration.kind ?? `other`,
      assetId: item.imageSetting?.value?.imageId ?? null,
      defaultVisibleInRow: declaration.defaultVisibleInRow ?? true,
      fallbackForId: declaration.fallbackForId ?? null,
      fallbackOrder: declaration.fallbackOrder ?? 0,
      fallbackHintLabel: declaration.fallbackHintLabel ?? null,
      missingPromptPrefill: declaration.missingPromptPrefill ?? null,
      setImage:
        settingResult == null
          ? null
          : (assetId: AssetId) => {
              settingResult.setValue({ imageId: assetId });
            },
    });
  }

  const [addedReferenceIds, setAddedReferenceIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [removedReferenceIds, setRemovedReferenceIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [disabledReferenceIds, setDisabledReferenceIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [
    selectedTimelineMessageIdsForNextPrompt,
    setSelectedTimelineMessageIdsForNextPrompt,
  ] = useState<ReadonlySet<string>>(() => new Set());

  const resetReferenceSelection = () => {
    setAddedReferenceIds(new Set());
    setRemovedReferenceIds(new Set());
    setDisabledReferenceIds(new Set());
  };

  const resetOneTimeTimelineContextSelection = () => {
    setSelectedTimelineMessageIdsForNextPrompt(new Set());
  };

  useEffect(() => {
    resetReferenceSelection();
  }, [activeThreadId]);

  useEffect(() => {
    resetOneTimeTimelineContextSelection();
  }, [activeThreadId]);

  const rowReferences = allReferences.filter((reference) => {
    if (removedReferenceIds.has(reference.id)) {
      return false;
    }
    return reference.defaultVisibleInRow || addedReferenceIds.has(reference.id);
  });

  const assignmentReferenceOptions = allReferences.filter(
    (reference) => reference.kind === `actor` || reference.kind === `location`,
  );

  const fixedRowReferences: AiResolvedReference[] = [];
  if (styleReferenceConfig != null) {
    fixedRowReferences.push({
      id: `style-reference`,
      label: styleReferenceConfig.stylePrompt,
      kind: `other`,
      assetId: styleReferenceConfig.assetId,
      defaultVisibleInRow: true,
      fallbackForId: null,
      fallbackOrder: 0,
      fallbackHintLabel: null,
      missingPromptPrefill: null,
      setImage: null,
    });
  }
  if (activeThreadLatestAssistantImageAssetId != null) {
    fixedRowReferences.push({
      id: `latest-chat-image-reference`,
      label: `Previous generated image from this chat`,
      kind: `other`,
      assetId: activeThreadLatestAssistantImageAssetId,
      defaultVisibleInRow: true,
      fallbackForId: null,
      fallbackOrder: 0,
      fallbackHintLabel: null,
      missingPromptPrefill: null,
      setImage: null,
    });
  }

  const contextReferenceEntries: AiImageContextReferenceEntry[] = [];
  const seenContextReferenceAssetIds = new Set<AssetId>();
  const appendContextReferenceEntry = (entry: AiImageContextReferenceEntry) => {
    if (seenContextReferenceAssetIds.has(entry.assetId)) {
      return;
    }

    seenContextReferenceAssetIds.add(entry.assetId);
    contextReferenceEntries.push(entry);
  };
  const promptContextLabelByReferenceId = new Map<string, string>();

  const fallbackForPrimaryById = new Map<string, AiResolvedReference>();
  const fallbackUsageLabelByPrimaryId = new Map<string, string>();
  const missingPromptActions: AiQuickPromptAction[] = [];
  const missingReferenceLabels: string[] = [];

  for (const reference of rowReferences) {
    if (disabledReferenceIds.has(reference.id)) {
      continue;
    }

    if (reference.assetId != null) {
      appendContextReferenceEntry({
        label: reference.label,
        assetId: reference.assetId,
      });
      promptContextLabelByReferenceId.set(reference.id, reference.label);
      continue;
    }

    const fallbackCandidates = allReferences
      .filter(
        (candidate) =>
          candidate.fallbackForId === reference.id &&
          !removedReferenceIds.has(candidate.id) &&
          !disabledReferenceIds.has(candidate.id),
      )
      .sort((a, b) => a.fallbackOrder - b.fallbackOrder);

    const fallbackMatch = fallbackCandidates.find(
      (candidate) => candidate.assetId != null,
    );

    if (fallbackMatch?.assetId != null) {
      const promptContextLabel =
        fallbackMatch.fallbackHintLabel ?? fallbackMatch.label;
      appendContextReferenceEntry({
        label: promptContextLabel,
        assetId: fallbackMatch.assetId,
      });
      promptContextLabelByReferenceId.set(reference.id, promptContextLabel);
      fallbackForPrimaryById.set(reference.id, fallbackMatch);
      fallbackUsageLabelByPrimaryId.set(
        reference.id,
        `${reference.label}: using ${promptContextLabel}`,
      );
      continue;
    }

    missingReferenceLabels.push(reference.label);
    if (reference.missingPromptPrefill != null) {
      missingPromptActions.push({
        id: reference.id,
        label: `Draft prompt for ${reference.label}`,
        prompt: reference.missingPromptPrefill,
      });
    }
  }

  for (const reference of fixedRowReferences) {
    if (disabledReferenceIds.has(reference.id) || reference.assetId == null) {
      continue;
    }
    appendContextReferenceEntry({
      label: reference.label,
      assetId: reference.assetId,
    });
    promptContextLabelByReferenceId.set(reference.id, reference.label);
  }

  const selectedTimelineContextMessages =
    activeThread?.messages.filter(
      (message) =>
        message.role === `assistant` &&
        message.assetId != null &&
        selectedTimelineMessageIdsForNextPrompt.has(message.id) &&
        message.id !== activeThreadLatestAssistantImageMessageId,
    ) ?? [];

  const oneTimeTimelineContextEntries: AiImageContextReferenceEntry[] =
    selectedTimelineContextMessages.flatMap((message) =>
      message.assetId == null
        ? []
        : [
            {
              label: `Earlier generated image from this chat`,
              assetId: message.assetId,
            },
          ],
    );

  for (const message of selectedTimelineContextMessages) {
    if (message.assetId == null) {
      continue;
    }

    appendContextReferenceEntry({
      label: `Earlier generated image from this chat`,
      assetId: message.assetId,
    });
  }

  useEffect(() => {
    if (!isLoadedFromSetting || activeThreadId == null) {
      return;
    }

    const currentThreadId = activeThreadId;
    const currentMessageCount = activeThreadMessageCount;
    const previousThreadId = previousActiveThreadIdRef.current;
    const previousMessageCount = previousMessageCountRef.current;

    if (!hasScrolledInitiallyRef.current) {
      timelineScrollRef.current?.scrollToEnd({ animated: false });
      hasScrolledInitiallyRef.current = true;
    } else if (
      previousThreadId === currentThreadId &&
      currentMessageCount > previousMessageCount
    ) {
      timelineScrollRef.current?.scrollToEnd({ animated: true });
    }

    previousActiveThreadIdRef.current = currentThreadId;
    previousMessageCountRef.current = currentMessageCount;
  }, [isLoadedFromSetting, activeThreadId, activeThreadMessageCount]);

  const handleCreateThread = () => {
    updatePlaygroundState((prev) => {
      const nextThreadIndex = prev.threads.length + 1;
      const nextThread = createThread(
        initialPrompt,
        `Idea ${String(nextThreadIndex)}`,
      );
      const nextThreads = [...prev.threads, nextThread].slice(
        -MAX_AI_PLAYGROUND_THREADS,
      );

      return {
        ...prev,
        activeThreadId: nextThread.id,
        threads: nextThreads,
      };
    });
    setError(null);
  };

  const handleSelectThread = (threadId: string) => {
    updatePlaygroundState((prev) => ({
      ...prev,
      activeThreadId: threadId,
    }));
    setError(null);
  };

  const handlePersistDraftPrompt = (nextPrompt: string) => {
    if (activeThread == null) {
      return;
    }

    updatePlaygroundState((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              draftPrompt: nextPrompt,
              updatedAtIso: new Date().toISOString(),
            }
          : thread,
      ),
    }));
  };

  const handleGenerate = async (draftPrompt: string) => {
    const prompt = draftPrompt.trim();
    if (activeThread == null || prompt.length === 0) {
      const promptError = `Please enter a prompt`;
      setError(promptError);
      onError?.(promptError);
      return;
    }

    setError(null);

    const nowIso = new Date().toISOString();
    const userMessageId = nanoid();
    const assistantMessageId = nanoid();

    updatePlaygroundState((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) => {
        if (thread.id !== activeThread.id) {
          return thread;
        }

        const nextMessages = [
          ...thread.messages,
          {
            id: userMessageId,
            role: `user` as const,
            text: prompt,
            contextReferenceEntries: contextReferenceEntries.map((entry) => ({
              assetId: entry.assetId,
              label: entry.label,
            })),
            createdAtIso: nowIso,
          },
        ].slice(-MAX_AI_PLAYGROUND_MESSAGES_PER_THREAD);

        return {
          ...thread,
          title:
            thread.title.trim().length === 0
              ? buildThreadTitleFromPrompt(prompt)
              : thread.title,
          draftPrompt: ``,
          updatedAtIso: nowIso,
          messages: nextMessages,
        };
      }),
    }));

    onSavePrompt?.(prompt);
    resetReferenceSelection();
    resetOneTimeTimelineContextSelection();

    try {
      const result = await generateMutation.mutateAsync({
        prompt,
        referenceImages:
          contextReferenceEntries.length > 0
            ? contextReferenceEntries
            : undefined,
      });

      updatePlaygroundState((prev) => ({
        ...prev,
        threads: prev.threads.map((thread) => {
          if (thread.id !== activeThread.id) {
            return thread;
          }

          const nextMessages = [
            ...thread.messages,
            {
              id: assistantMessageId,
              role: `assistant` as const,
              text: `Generated image`,
              assetId: result.assetId,
              createdAtIso: new Date().toISOString(),
            },
          ].slice(-MAX_AI_PLAYGROUND_MESSAGES_PER_THREAD);

          return {
            ...thread,
            updatedAtIso: new Date().toISOString(),
            messages: nextMessages,
          };
        }),
      }));
    } catch (err) {
      console.error(`AI image generation failed:`, err);
      const errorMsg = `Unable to generate image right now.`;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const isGenerating = generateMutation.isPending;
  const isProcessing = isGenerating;

  const toggleReferenceDisabled = (referenceId: string) => {
    setDisabledReferenceIds((prev) => setToggle(prev, referenceId));
  };

  const toggleOneTimeTimelineContextSelection = (messageId: string) => {
    setSelectedTimelineMessageIdsForNextPrompt((prev) =>
      setToggle(prev, messageId),
    );
  };

  const setReferenceVisibleInRow = (referenceId: string, visible: boolean) => {
    if (visible) {
      setRemovedReferenceIds((prev) => setDelete(prev, referenceId));
      setAddedReferenceIds((prev) => setAdd(prev, referenceId));
      return;
    }

    setRemovedReferenceIds((prev) => setAdd(prev, referenceId));
    setAddedReferenceIds((prev) => setDelete(prev, referenceId));
    setDisabledReferenceIds((prev) => setDelete(prev, referenceId));
  };

  const assignGeneratedImageToReference = (
    assetId: AssetId,
    referenceId: string,
  ) => {
    const targetReference = assignmentReferenceOptions.find(
      (reference) => reference.id === referenceId,
    );
    targetReference?.setImage?.(assetId);
  };

  return (
    <View className="h-[460px]">
      <View className="h-full flex-row items-stretch gap-4">
        <View className="h-full w-[120px] shrink-0 gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="pyly-body-subheading">Chats</Text>
            <RectButton
              variant="bare2"
              iconStart="plus"
              iconSize={16}
              onPress={handleCreateThread}
              disabled={isProcessing || !isLoadedFromSetting}
            >
              New
            </RectButton>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="items-start gap-2 pb-2"
          >
            {playgroundState.threads.map((thread) => {
              const isActive = thread.id === activeThread?.id;
              return (
                <RectButton
                  key={thread.id}
                  variant="bare2"
                  onPress={() => {
                    handleSelectThread(thread.id);
                  }}
                  disabled={isProcessing}
                  className={
                    isActive
                      ? `justify-start self-start opacity-100`
                      : `justify-start self-start opacity-80`
                  }
                >
                  {thread.title}
                </RectButton>
              );
            })}
          </ScrollView>
        </View>

        <View className="w-px self-stretch bg-fg-bg10" />

        <View className="h-full min-w-0 flex-1 gap-3">
          {isLoadedFromSetting ? null : (
            <Text className="font-sans text-[13px] text-fg-dim">
              Loading chats...
            </Text>
          )}

          <View className="min-h-0 flex-1 gap-2">
            <ScrollView
              ref={timelineScrollRef}
              className="flex-1"
              contentContainerClassName="gap-6 py-10 px-3"
            >
              {activeThread == null || activeThread.messages.length === 0 ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Start by entering a prompt below.
                </Text>
              ) : (
                activeThread.messages.map((message) => {
                  if (message.role === `user`) {
                    return (
                      <AiImageUserMessage
                        key={message.id}
                        message={message}
                        className="ml-8"
                      />
                    );
                  }

                  return (
                    <AiImageAssistantMessage
                      key={message.id}
                      message={message}
                      canToggleOneTimeContext={
                        message.id !== activeThreadLatestAssistantImageMessageId
                      }
                      isSelectedForOneTimeContext={selectedTimelineMessageIdsForNextPrompt.has(
                        message.id,
                      )}
                      isPointerHoverCapable={isPointerHoverCapable}
                      isProcessing={isProcessing}
                      onChangeImage={onChangeImage}
                      onToggleOneTimeContextSelection={
                        toggleOneTimeTimelineContextSelection
                      }
                      assignmentReferenceOptions={assignmentReferenceOptions}
                      onAssignImageToReference={assignGeneratedImageToReference}
                      className="mr-2"
                    />
                  );
                })
              )}
            </ScrollView>
          </View>

          <View className="gap-1">
            <AiImagePromptComposer
              key={activeThread?.id ?? `no-active-thread`}
              draftPrompt={activeThread?.draftPrompt ?? ``}
              editable={
                isLoadedFromSetting && !isProcessing && activeThread != null
              }
              isGenerating={isGenerating}
              isPointerHoverCapable={isPointerHoverCapable}
              isLoadedFromSetting={isLoadedFromSetting}
              isProcessing={isProcessing}
              references={allReferences}
              fixedRowReferences={fixedRowReferences}
              rowReferences={rowReferences}
              removedReferenceIds={removedReferenceIds}
              disabledReferenceIds={disabledReferenceIds}
              fallbackForPrimaryById={fallbackForPrimaryById}
              fallbackUsageLabelByPrimaryId={fallbackUsageLabelByPrimaryId}
              promptContextLabelByReferenceId={promptContextLabelByReferenceId}
              missingReferenceLabels={missingReferenceLabels}
              missingPromptActions={missingPromptActions}
              oneTimeTimelineContextEntries={oneTimeTimelineContextEntries}
              onToggleReferenceDisabled={toggleReferenceDisabled}
              onSetReferenceVisibleInRow={setReferenceVisibleInRow}
              onPersistDraftPrompt={handlePersistDraftPrompt}
              onGenerate={handleGenerate}
            />

            {error == null ? null : (
              <Text className="font-sans text-[14px] text-[crimson]">
                {error}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function AiImageUserMessage({
  message,
  className,
}: {
  message: AiImagePlaygroundMessage;
  className?: string;
}) {
  const contextEntries = message.contextReferenceEntries ?? [];

  return (
    <View className="gap-1">
      <View
        className={`
          rounded-lg bg-sky/20 px-3 py-2

          ${className ?? ``}
        `}
      >
        {message.text != null && message.text.length > 0 ? (
          <Text className="font-sans text-sm font-medium leading-snug text-fg">
            {message.text}
          </Text>
        ) : null}
        {message.assetId == null ? null : (
          <View className="gap-2">
            <View className="w-full max-w-[560px]">
              <AssetImage
                assetId={message.assetId}
                className="aspect-[2/1] max-h-[320px] w-full rounded-md"
                contentFit="contain"
              />
            </View>
          </View>
        )}
      </View>
      {contextEntries.length === 0 ? null : (
        <View className="flex-row flex-wrap items-center justify-end gap-1 px-3">
          {contextEntries.map((entry, index) => (
            <Tooltip
              key={`${entry.assetId}-${entry.label}-${String(index)}`}
              placement="top"
              sideOffset={6}
            >
              <Tooltip.Trigger>
                <AssetImage
                  assetId={entry.assetId}
                  className="size-6 rounded"
                  contentFit="cover"
                />
              </Tooltip.Trigger>
              <Tooltip.Content variant="custom">
                <ImageReferenceTooltipContent
                  imageAssetId={entry.assetId}
                  prompt={entry.label}
                />
              </Tooltip.Content>
            </Tooltip>
          ))}
        </View>
      )}
    </View>
  );
}

function AiImageAssistantMessage({
  message,
  canToggleOneTimeContext,
  isSelectedForOneTimeContext,
  isPointerHoverCapable,
  isProcessing,
  onChangeImage,
  onToggleOneTimeContextSelection,
  assignmentReferenceOptions,
  onAssignImageToReference,
  className,
}: {
  message: AiImagePlaygroundMessage;
  canToggleOneTimeContext: boolean;
  isSelectedForOneTimeContext: boolean;
  isPointerHoverCapable: boolean;
  isProcessing: boolean;
  onChangeImage: (assetId: AssetId) => void;
  onToggleOneTimeContextSelection: (messageId: string) => void;
  assignmentReferenceOptions: AiResolvedReference[];
  onAssignImageToReference: (assetId: AssetId, referenceId: string) => void;
  className?: string;
}) {
  const { assetId } = message;

  if (assetId == null) {
    return null;
  }

  return (
    <View
      className={`
        gap-2

        ${className ?? ``}
      `}
    >
      <View className="group relative w-full max-w-[560px]">
        <AssetImage
          assetId={assetId}
          className="aspect-[2/1] max-h-[320px] w-full rounded-lg"
          contentFit="fill"
        />

        <View
          className={
            isPointerHoverCapable
              ? `
                pointer-events-none absolute inset-x-3 top-3 items-start opacity-0

                group-hover:pointer-events-auto group-hover:opacity-100
              `
              : `absolute inset-x-3 top-3 items-start`
          }
        >
          <ButtonGroup>
            {canToggleOneTimeContext ? (
              <ButtonGroup.Button
                onPress={() => {
                  onToggleOneTimeContextSelection(message.id);
                }}
                disabled={isProcessing}
              >
                {isSelectedForOneTimeContext
                  ? `Remove from context`
                  : `Add to context`}
              </ButtonGroup.Button>
            ) : null}
            <ButtonGroup.Button
              onPress={() => {
                onChangeImage(assetId);
              }}
              disabled={isProcessing}
            >
              Use image
            </ButtonGroup.Button>
            {assignmentReferenceOptions.length === 0 ? null : (
              <FloatingMenuModal
                menu={
                  <AiImageAssignMenu
                    assetId={assetId}
                    options={assignmentReferenceOptions}
                    onAssignImageToReference={onAssignImageToReference}
                  />
                }
              >
                <ButtonGroup.Button
                  disabled={isProcessing}
                  iconStart="chevron-down"
                  iconSize={16}
                />
              </FloatingMenuModal>
            )}
          </ButtonGroup>
        </View>
      </View>
    </View>
  );
}

function AiImageAssignMenu({
  assetId,
  options,
  onAssignImageToReference,
  onRequestClose,
}: {
  assetId: AssetId;
  options: AiResolvedReference[];
  onAssignImageToReference: (assetId: AssetId, referenceId: string) => void;
} & FloatingMenuModalMenuProps) {
  return (
    <View className="min-w-[220px] gap-1 rounded-xl bg-bg-high p-3">
      <Text className="font-sans text-[11px] uppercase text-fg-dim">
        Assign generated image
      </Text>
      {options.map((option) => (
        <RectButton
          key={option.id}
          variant="bare2"
          onPress={() => {
            onAssignImageToReference(assetId, option.id);
            onRequestClose?.();
          }}
          className="justify-start"
        >
          {option.label}
        </RectButton>
      ))}
    </View>
  );
}

function AiImagePromptComposer({
  draftPrompt: initialDraftPrompt,
  editable,
  isGenerating,
  isPointerHoverCapable,
  isLoadedFromSetting,
  isProcessing,
  references,
  fixedRowReferences,
  rowReferences,
  removedReferenceIds,
  disabledReferenceIds,
  fallbackForPrimaryById,
  fallbackUsageLabelByPrimaryId,
  promptContextLabelByReferenceId,
  missingReferenceLabels,
  missingPromptActions,
  oneTimeTimelineContextEntries,
  onPersistDraftPrompt,
  onToggleReferenceDisabled,
  onSetReferenceVisibleInRow,
  onGenerate,
}: {
  draftPrompt: string;
  editable: boolean;
  isGenerating: boolean;
  isPointerHoverCapable: boolean;
  isLoadedFromSetting: boolean;
  isProcessing: boolean;
  references: AiResolvedReference[];
  fixedRowReferences: AiResolvedReference[];
  rowReferences: AiResolvedReference[];
  removedReferenceIds: ReadonlySet<string>;
  disabledReferenceIds: ReadonlySet<string>;
  fallbackForPrimaryById: Map<string, AiResolvedReference>;
  fallbackUsageLabelByPrimaryId: Map<string, string>;
  promptContextLabelByReferenceId: Map<string, string>;
  missingReferenceLabels: string[];
  missingPromptActions: AiQuickPromptAction[];
  oneTimeTimelineContextEntries: AiImageContextReferenceEntry[];
  onPersistDraftPrompt: (prompt: string) => void;
  onToggleReferenceDisabled: (referenceId: string) => void;
  onSetReferenceVisibleInRow: (referenceId: string, visible: boolean) => void;
  onGenerate: (prompt: string) => Promise<void>;
}) {
  const [draftPrompt, setDraftPrompt] = useState(initialDraftPrompt);
  const [isPromptInputFocused, setIsPromptInputFocused] = useState(false);
  const lastPersistedDraftPromptRef = useRef(initialDraftPrompt);

  const persistDraftPrompt = (nextDraftPrompt: string) => {
    if (lastPersistedDraftPromptRef.current === nextDraftPrompt) {
      return;
    }

    lastPersistedDraftPromptRef.current = nextDraftPrompt;
    onPersistDraftPrompt(nextDraftPrompt);
  };

  useEffect(() => {
    if (!editable) {
      return;
    }

    if (lastPersistedDraftPromptRef.current === draftPrompt) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastPersistedDraftPromptRef.current = draftPrompt;
      onPersistDraftPrompt(draftPrompt);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [draftPrompt, editable, onPersistDraftPrompt]);

  const canSend =
    isLoadedFromSetting && !isProcessing && draftPrompt.trim().length > 0;

  const displayedRowReferences = [
    ...fixedRowReferences,
    ...rowReferences.filter((reference) => {
      if (reference.assetId != null) {
        return true;
      }

      const fallbackReference = fallbackForPrimaryById.get(reference.id);
      return fallbackReference?.assetId != null;
    }),
  ];

  const applyQuickPrompt = (prompt: string) => {
    setDraftPrompt((prev) =>
      prev.trim().length === 0 ? prompt : `${prev}\n${prompt}`,
    );
  };

  return (
    <View
      className={
        isPromptInputFocused
          ? `gap-2 rounded-xl border border-blue bg-bg-high px-4 py-3`
          : `gap-2 rounded-xl border border-fg-bg10 bg-bg-high px-4 py-3`
      }
    >
      <TextInputMulti
        value={draftPrompt}
        onChangeText={setDraftPrompt}
        placeholder="Describe how to create or modify the image in this chat"
        className="max-h-80 rounded-none bg-transparent p-0 text-sm font-medium leading-5"
        editable={editable}
        onFocus={() => {
          setIsPromptInputFocused(true);
        }}
        onBlur={() => {
          setIsPromptInputFocused(false);
          persistDraftPrompt(draftPrompt);
        }}
      />

      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
          <FloatingMenuModal
            menu={
              <ReferencePickerMenu
                references={references}
                rowReferences={rowReferences}
                removedReferenceIds={removedReferenceIds}
                disabledReferenceIds={disabledReferenceIds}
                fallbackUsageLabelByPrimaryId={fallbackUsageLabelByPrimaryId}
                onSetReferenceVisibleInRow={onSetReferenceVisibleInRow}
              />
            }
          >
            <RectButton variant="bare2" iconStart="plus" iconSize={20} />
          </FloatingMenuModal>

          {displayedRowReferences.map((reference) => {
            const isDisabled = disabledReferenceIds.has(reference.id);
            const fallbackReference = fallbackForPrimaryById.get(reference.id);
            const hasImage = reference.assetId != null;
            const previewAssetId = hasImage
              ? reference.assetId
              : (fallbackReference?.assetId ?? null);

            return (
              <Tooltip key={reference.id} placement="top" sideOffset={6}>
                <Tooltip.Trigger asChild>
                  <Pressable
                    onPress={() => {
                      onToggleReferenceDisabled(reference.id);
                    }}
                    className={
                      isDisabled
                        ? `group relative rounded border border-fg-bg10 opacity-45`
                        : `group relative rounded border border-fg-bg10`
                    }
                  >
                    {previewAssetId == null ? null : (
                      <AssetImage
                        assetId={previewAssetId}
                        className="size-9 rounded"
                        contentFit="cover"
                      />
                    )}

                    <View
                      className={
                        isPointerHoverCapable && !isDisabled
                          ? `
                            absolute right-1 top-0.5 rounded bg-bg/80 px-1 opacity-0

                            group-hover:opacity-100
                          `
                          : `absolute right-1 top-0.5 rounded bg-bg/80 px-1`
                      }
                    >
                      <Text className="font-sans text-[10px] text-fg">
                        {isDisabled ? `☐` : `☑`}
                      </Text>
                    </View>
                  </Pressable>
                </Tooltip.Trigger>
                <Tooltip.Content variant="custom">
                  <ImageReferenceTooltipContent
                    imageAssetId={previewAssetId}
                    prompt={
                      promptContextLabelByReferenceId.get(reference.id) ??
                      reference.label
                    }
                  />
                </Tooltip.Content>
              </Tooltip>
            );
          })}

          {oneTimeTimelineContextEntries.map((entry, index) => (
            <Tooltip
              key={`${entry.assetId}-${entry.label}-one-time-${String(index)}`}
              placement="top"
              sideOffset={6}
            >
              <Tooltip.Trigger>
                <AssetImage
                  assetId={entry.assetId}
                  className="size-9 rounded border border-fg-bg10"
                  contentFit="cover"
                />
              </Tooltip.Trigger>
              <Tooltip.Content variant="custom">
                <ImageReferenceTooltipContent
                  imageAssetId={entry.assetId}
                  prompt={entry.label}
                />
              </Tooltip.Content>
            </Tooltip>
          ))}

          {missingReferenceLabels.length === 0 &&
          fallbackUsageLabelByPrimaryId.size === 0 ? null : (
            <FloatingMenuModal
              menu={
                <MissingReferenceWarningMenu
                  missingReferenceLabels={missingReferenceLabels}
                  fallbackUsageLabels={Array.from(
                    fallbackUsageLabelByPrimaryId.values(),
                  )}
                  quickActions={missingPromptActions}
                  onApplyQuickPrompt={applyQuickPrompt}
                />
              }
            >
              <RectButton
                variant="bare2"
                iconStart="circle-warning"
                className={`[--color-fg:var(--color-warning)]`}
              />
            </FloatingMenuModal>
          )}
        </View>

        <RectButton
          variant="bare2"
          onPress={() => {
            if (!canSend) {
              return;
            }

            const nextPrompt = draftPrompt;
            setDraftPrompt(``);
            lastPersistedDraftPromptRef.current = ``;
            void onGenerate(nextPrompt);
          }}
          disabled={!canSend}
        >
          {isGenerating ? `Generating...` : `Send`}
        </RectButton>
      </View>
    </View>
  );
}

function ImageReferenceTooltipContent({
  imageAssetId,
  prompt,
}: {
  imageAssetId: AssetId | null;
  prompt: string | null;
}) {
  return (
    <View className="w-[320px] overflow-hidden rounded-lg bg-bg">
      {imageAssetId == null ? null : (
        <AssetImage
          assetId={imageAssetId}
          className="h-[160px] w-[320px]"
          contentFit="cover"
        />
      )}
      <View className="gap-2 px-3 py-2">
        {prompt == null ? null : (
          <Text className="font-mono text-xs text-fg">{prompt}</Text>
        )}
        <Text className="font-sans text-xs text-fg-dim">
          Image and caption included in the prompt
        </Text>
      </View>
    </View>
  );
}

function ReferencePickerMenu({
  references,
  rowReferences,
  removedReferenceIds,
  disabledReferenceIds,
  fallbackUsageLabelByPrimaryId,
  onSetReferenceVisibleInRow,
}: {
  references: AiResolvedReference[];
  rowReferences: AiResolvedReference[];
  removedReferenceIds: ReadonlySet<string>;
  disabledReferenceIds: ReadonlySet<string>;
  fallbackUsageLabelByPrimaryId: Map<string, string>;
  onSetReferenceVisibleInRow: (referenceId: string, visible: boolean) => void;
} & FloatingMenuModalMenuProps) {
  const rowIds = new Set(rowReferences.map((reference) => reference.id));

  return (
    <View className="min-w-[290px] max-w-[360px] gap-2 rounded-xl bg-bg-high p-3">
      <Text className="font-sans text-[11px] uppercase text-fg-dim">
        Reference images
      </Text>

      {references.map((reference) => {
        const isInRow = rowIds.has(reference.id);
        const isDisabled = disabledReferenceIds.has(reference.id);
        const isRemoved = removedReferenceIds.has(reference.id);
        const status =
          reference.assetId == null
            ? `Missing`
            : isRemoved
              ? `Removed from row`
              : isInRow
                ? `In row`
                : `Available`;

        const roleLabel =
          reference.kind === `actor`
            ? `Actor`
            : reference.kind === `location`
              ? `Location`
              : `Reference`;

        return (
          <View
            key={reference.id}
            className="rounded-lg border border-fg-bg10 p-2"
          >
            <View className="flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="font-sans text-[13px] text-fg">
                  {reference.label}
                </Text>
                <Text className="font-sans text-[11px] text-fg-dim">
                  {roleLabel} • {status}
                  {isDisabled ? ` • Disabled in prompt` : ``}
                </Text>
                {fallbackUsageLabelByPrimaryId.has(reference.id) ? (
                  <Text className="font-sans text-[11px] text-fg-dim">
                    {fallbackUsageLabelByPrimaryId.get(reference.id)}
                  </Text>
                ) : null}
              </View>

              <RectButton
                variant="bare2"
                onPress={() => {
                  onSetReferenceVisibleInRow(reference.id, !isInRow);
                }}
              >
                {isInRow ? `Remove` : `Add`}
              </RectButton>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MissingReferenceWarningMenu({
  missingReferenceLabels,
  fallbackUsageLabels,
  quickActions,
  onApplyQuickPrompt,
  onRequestClose,
}: {
  missingReferenceLabels: string[];
  fallbackUsageLabels: string[];
  quickActions: AiQuickPromptAction[];
  onApplyQuickPrompt: (prompt: string) => void;
} & FloatingMenuModalMenuProps) {
  return (
    <View className="min-w-[300px] max-w-[360px] gap-2 rounded-xl bg-bg-high p-3">
      <Text className="font-sans text-[11px] uppercase text-fg-dim">
        Reference status
      </Text>

      {missingReferenceLabels.length === 0 ? null : (
        <View className="gap-1">
          <Text className="font-sans text-[12px] text-fg">
            Missing references
          </Text>
          {missingReferenceLabels.map((label) => (
            <Text key={label} className="font-sans text-[12px] text-fg-dim">
              • {label}
            </Text>
          ))}
        </View>
      )}

      {fallbackUsageLabels.length === 0 ? null : (
        <View className="gap-1">
          <Text className="font-sans text-[12px] text-fg">
            Fallbacks in use
          </Text>
          {fallbackUsageLabels.map((label) => (
            <Text key={label} className="font-sans text-[12px] text-fg-dim">
              • {label}
            </Text>
          ))}
        </View>
      )}

      {quickActions.length === 0 ? null : (
        <View className="gap-1 pt-1">
          <Text className="font-sans text-[12px] text-fg">
            Quick prompt actions
          </Text>
          {quickActions.map((action) => (
            <RectButton
              key={action.id}
              variant="bare2"
              className="justify-start"
              onPress={() => {
                onApplyQuickPrompt(action.prompt);
                onRequestClose?.();
              }}
            >
              {action.label}
            </RectButton>
          ))}
        </View>
      )}
    </View>
  );
}

function createThread(
  initialPrompt: string,
  title: string,
): AiImagePlaygroundThread {
  const nowIso = new Date().toISOString();
  return {
    id: nanoid(),
    title,
    draftPrompt: initialPrompt,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    messages: [],
  };
}

function createInitialPlaygroundState(
  initialPrompt: string,
): AiImagePlaygroundStateV1 {
  const firstThread = createThread(initialPrompt, `Idea 1`);
  return {
    version: 1,
    activeThreadId: firstThread.id,
    threads: [firstThread],
  };
}

function buildThreadTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return `Untitled`;
  }
  if (trimmed.length <= 24) {
    return trimmed;
  }
  return `${trimmed.slice(0, 24)}...`;
}

function parseAiImagePlaygroundState(
  raw: string | null | undefined,
  initialPrompt: string,
): AiImagePlaygroundStateV1 {
  if (raw == null || raw.trim().length === 0) {
    return createInitialPlaygroundState(initialPrompt);
  }

  try {
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      activeThreadId?: unknown;
      threads?: unknown;
    };

    if (parsed.version !== 1 || !Array.isArray(parsed.threads)) {
      return createInitialPlaygroundState(initialPrompt);
    }

    const threads: AiImagePlaygroundThread[] = [];

    for (const threadValue of parsed.threads) {
      if (typeof threadValue !== `object` || threadValue == null) {
        continue;
      }

      const threadObject = threadValue as Record<string, unknown>;
      if (
        typeof threadObject[`id`] !== `string` ||
        typeof threadObject[`title`] !== `string` ||
        typeof threadObject[`createdAtIso`] !== `string` ||
        typeof threadObject[`updatedAtIso`] !== `string`
      ) {
        continue;
      }

      const draftPrompt =
        typeof threadObject[`draftPrompt`] === `string`
          ? threadObject[`draftPrompt`]
          : ``;

      const rawMessages = Array.isArray(threadObject[`messages`])
        ? threadObject[`messages`]
        : [];

      const messages: AiImagePlaygroundMessage[] = [];
      for (const messageValue of rawMessages) {
        if (typeof messageValue !== `object` || messageValue == null) {
          continue;
        }

        const messageObject = messageValue as Record<string, unknown>;
        if (
          typeof messageObject[`id`] !== `string` ||
          (messageObject[`role`] !== `user` &&
            messageObject[`role`] !== `assistant`) ||
          typeof messageObject[`createdAtIso`] !== `string`
        ) {
          continue;
        }

        messages.push({
          id: messageObject[`id`],
          role: messageObject[`role`],
          text:
            typeof messageObject[`text`] === `string`
              ? messageObject[`text`]
              : undefined,
          assetId:
            typeof messageObject[`assetId`] === `string`
              ? (messageObject[`assetId`] as AssetId)
              : undefined,
          contextReferenceEntries: parseMessageContextReferenceEntries(
            messageObject[`contextReferenceEntries`],
          ),
          createdAtIso: messageObject[`createdAtIso`],
        });
      }

      threads.push({
        id: threadObject[`id`],
        title: threadObject[`title`],
        draftPrompt,
        createdAtIso: threadObject[`createdAtIso`],
        updatedAtIso: threadObject[`updatedAtIso`],
        messages: messages.slice(-MAX_AI_PLAYGROUND_MESSAGES_PER_THREAD),
      });
    }

    if (threads.length === 0) {
      return createInitialPlaygroundState(initialPrompt);
    }

    const activeThreadId =
      typeof parsed.activeThreadId === `string` &&
      threads.some((thread) => thread.id === parsed.activeThreadId)
        ? parsed.activeThreadId
        : (threads[0]?.id ?? null);

    if (activeThreadId == null) {
      return createInitialPlaygroundState(initialPrompt);
    }

    return {
      version: 1,
      activeThreadId,
      threads: threads.slice(-MAX_AI_PLAYGROUND_THREADS),
    };
  } catch {
    return createInitialPlaygroundState(initialPrompt);
  }
}

function parseMessageContextReferenceEntries(
  value: unknown,
): AiImageContextReferenceEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const entries: AiImageContextReferenceEntry[] = [];

  for (const item of value) {
    if (typeof item !== `object` || item == null) {
      continue;
    }

    const objectItem = item as Record<string, unknown>;
    if (
      typeof objectItem[`assetId`] !== `string` ||
      typeof objectItem[`label`] !== `string`
    ) {
      continue;
    }

    entries.push({
      assetId: objectItem[`assetId`] as AssetId,
      label: objectItem[`label`],
    });
  }

  return entries.length > 0 ? entries : undefined;
}

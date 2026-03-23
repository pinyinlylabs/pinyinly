import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { getAiImageStyleConfig } from "@/client/aiImageStyle";
import { trpc } from "@/client/trpc";
import { usePointerHoverCapability } from "@/client/ui/hooks/usePointerHoverCapability";
import type { UserSettingKeyInput } from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { AssetId } from "@/data/model";
import { aiImagePlaygroundSetting } from "@/data/userSettings";
import type {
  UserSetting,
  UserSettingImageEntity,
  UserSettingTextEntity,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { invariant } from "@pinyinly/lib/invariant";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AssetImage } from "./AssetImage";
import { RectButton } from "./RectButton";
import { TextInputMulti } from "./TextInputMulti";
import { Tooltip } from "./Tooltip";

type AiImagePlaygroundRole = `user` | `assistant`;

interface AiImagePlaygroundMessage {
  id: string;
  role: AiImagePlaygroundRole;
  text?: string;
  assetId?: AssetId;
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

/**
 * Declarative reference to an image setting that will be lazily resolved during AI generation.
 * Labels can be either static strings or fetched from a UserSettingTextEntity.
 */
export interface AiReferenceImageDeclaration {
  imageSetting: UserSetting<UserSettingImageEntity>;
  imageSettingKey: UserSettingKeyInput<UserSettingImageEntity>;
  label:
    | string
    | {
        setting: UserSetting<UserSettingTextEntity>;
        key: UserSettingKeyInput<UserSettingTextEntity>;
      };
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

  // Destructure up to 3 reference images
  const [aiReferenceImage1, aiReferenceImage2, aiReferenceImage3] =
    aiReferenceImages ?? [];

  invariant(
    (aiReferenceImages?.length ?? 0) <= 3,
    `A maximum of 3 reference images can be provided`,
  );

  // Fetch reference image data using static hook calls
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

  const activeThreadLatestAssistantImageAssetId =
    activeThread?.messages
      .slice()
      .reverse()
      .find(
        (message) => message.role === `assistant` && message.assetId != null,
      )?.assetId ?? null;
  const activeThreadId = activeThread?.id ?? null;
  const activeThreadMessageCount = activeThread?.messages.length ?? 0;

  const contextReferenceEntries: AiImageContextReferenceEntry[] = [];

  if (aiImageStyle != null) {
    const styleConfig = getAiImageStyleConfig(aiImageStyle);
    contextReferenceEntries.push({
      label: styleConfig.stylePrompt,
      assetId: styleConfig.assetId,
    });
  }

  const referenceSettings = [
    {
      declaration: aiReferenceImage1,
      imageSetting: reference1ImageSetting,
      labelSetting: reference1LabelSetting,
    },
    {
      declaration: aiReferenceImage2,
      imageSetting: reference2ImageSetting,
      labelSetting: reference2LabelSetting,
    },
    {
      declaration: aiReferenceImage3,
      imageSetting: reference3ImageSetting,
      labelSetting: reference3LabelSetting,
    },
  ];

  for (const { declaration, imageSetting, labelSetting } of referenceSettings) {
    const refImageId = imageSetting?.value?.imageId;
    if (declaration == null || refImageId == null) {
      continue;
    }
    const label =
      typeof declaration.label === `string`
        ? declaration.label
        : labelSetting?.value?.text;
    contextReferenceEntries.push({
      label: (label ?? `Reference image`).trim(),
      assetId: refImageId,
    });
  }

  if (activeThreadLatestAssistantImageAssetId != null) {
    contextReferenceEntries.push({
      label: `Previous generated image from this chat`,
      assetId: activeThreadLatestAssistantImageAssetId,
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

  return (
    <View className="h-[460px]">
      <View className="h-full flex-row items-stretch gap-4">
        <View className="h-full w-[120px] shrink-0 gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="pyly-body-subheading">Chats</Text>
            <RectButton
              variant="bare2"
              iconStart="add"
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
                      isPointerHoverCapable={isPointerHoverCapable}
                      isProcessing={isProcessing}
                      onChangeImage={onChangeImage}
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
              isLoadedFromSetting={isLoadedFromSetting}
              isProcessing={isProcessing}
              contextReferenceEntries={contextReferenceEntries}
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
  return (
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
  );
}

function AiImageAssistantMessage({
  message,
  isPointerHoverCapable,
  isProcessing,
  onChangeImage,
  className,
}: {
  message: AiImagePlaygroundMessage;
  isPointerHoverCapable: boolean;
  isProcessing: boolean;
  onChangeImage: (assetId: AssetId) => void;
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
          <RectButton
            variant="bare2"
            className="rounded bg-bg/80 text-[12px]"
            onPress={() => {
              onChangeImage(assetId);
            }}
            disabled={isProcessing}
          >
            Use image
          </RectButton>
        </View>
      </View>
    </View>
  );
}

function AiImagePromptComposer({
  draftPrompt: initialDraftPrompt,
  editable,
  isGenerating,
  isLoadedFromSetting,
  isProcessing,
  contextReferenceEntries,
  onPersistDraftPrompt,
  onGenerate,
}: {
  draftPrompt: string;
  editable: boolean;
  isGenerating: boolean;
  isLoadedFromSetting: boolean;
  isProcessing: boolean;
  contextReferenceEntries: AiImageContextReferenceEntry[];
  onPersistDraftPrompt: (prompt: string) => void;
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
          {contextReferenceEntries.map((entry) => (
            <Tooltip
              key={`${entry.assetId}-${entry.label}`}
              placement="top"
              sideOffset={6}
            >
              <Tooltip.Trigger className="rounded border border-fg-bg10">
                <AssetImage
                  assetId={entry.assetId}
                  className="size-9 rounded"
                  contentFit="cover"
                />
              </Tooltip.Trigger>
              <Tooltip.Content className="gap-2 p-2">
                <AssetImage
                  assetId={entry.assetId}
                  className="h-[110px] w-[180px] rounded border border-fg-bg10"
                  contentFit="cover"
                />
                <Text className="font-sans text-[12px] uppercase text-fg-dim">
                  Prompt context
                </Text>
                <Text className="font-sans text-[13px] text-fg-dim">
                  {entry.label}
                </Text>
              </Tooltip.Content>
            </Tooltip>
          ))}
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

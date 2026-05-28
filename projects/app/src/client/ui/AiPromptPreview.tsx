import { Text, View } from "react-native";
import { RectButton } from "./RectButton";
import type { ChatPromptMessage } from "@/server/lib/ai";

export type AiPromptPreviewSectionType = {
  title?: string;
  messages: ChatPromptMessage[];
};

export function AiPromptPreview({
  heading = `Prompt preview`,
  description,
  sections,
}: {
  heading?: string;
  description?: string;
  sections: readonly AiPromptPreviewSectionType[];
}) {
  return (
    <View className="gap-2">
      <Text className="pyly-body-subheading">{heading}</Text>
      {description == null ? null : (
        <Text className="font-sans text-[14px] text-fg-dim">{description}</Text>
      )}

      {sections.map((section, index) => (
        <View
          key={`${index}-${section.title ?? `default`}`}
          className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3"
        >
          {section.title == null ? null : (
            <Text
              className={`
                rounded bg-fg-bg10 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase
                tracking-wide text-fg-dim
              `}
            >
              {section.title}
            </Text>
          )}

          {section.messages.map((message, messageIndex) => (
            <PromptTextBlock
              key={messageIndex}
              label={message.role}
              text={message.content}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function PromptTextBlock({ label, text }: { label: string; text: string }) {
  const handleCopy = () => {
    void copyToClipboard(text);
  };

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="pyly-body-caption text-fg-dim">{label}</Text>
        <RectButton
          variant="bareDim"
          iconStart="copy"
          iconSize={12}
          onPress={handleCopy}
          className="size-6 rounded p-0 text-fg-dim"
        />
      </View>
      <Text
        selectable
        className="whitespace-pre-wrap font-mono text-[13px] text-fg"
      >
        {text}
      </Text>
    </View>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (text.length === 0) {
    return false;
  }

  const globalNavigator = globalThis.navigator;
  if (typeof globalNavigator === `undefined`) {
    return false;
  }

  if (typeof globalNavigator.clipboard.writeText !== `function`) {
    return false;
  }

  try {
    await globalNavigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

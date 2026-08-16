import { Text, View } from "react-native";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
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
        <Text className="font-sans text-[14px] text-muted-fg">
          {description}
        </Text>
      )}

      {sections.map((section, index) => (
        <View
          key={`${index}-${section.title ?? `default`}`}
          className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3"
        >
          {section.title == null ? null : (
            <Text
              className={`
                rounded bg-fg-bg10 px-2 py-0.5 font-sans text-[11px] font-semibold tracking-wide
                text-muted-fg uppercase
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
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="pyly-body-caption text-muted-fg">{label}</Text>
        <CopyToClipboardButton text={text} />
      </View>
      <Text
        selectable
        className="font-mono text-[13px] whitespace-pre-wrap text-fg"
      >
        {text}
      </Text>
    </View>
  );
}

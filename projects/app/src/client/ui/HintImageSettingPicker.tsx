import type {
  UserSettingImageEntity,
  UserSettingKeyInput,
} from "@/client/hooks/useUserSetting";
import { Text, View } from "react-native";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";

interface HintImageSettingPickerProps<T extends UserSettingImageEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  title?: string;
  description?: string;
  presetImageIds?: readonly string[];
  includeHistory?: boolean;
  previewHeight?: number;
  tileSize?: number;
  enablePasteDropZone?: boolean;
  onUploadError?: (error: string) => void;
  className?: string;
  imageClassName?: string;
}

const defaultTitle = `Choose an image`;

export function HintImageSettingPicker<T extends UserSettingImageEntity>({
  setting,
  settingKey,
  title = defaultTitle,
  description,
  presetImageIds = [],
  includeHistory = true,
  previewHeight = 200,
  tileSize = 64,
  enablePasteDropZone = false,
  onUploadError,
  className,
  imageClassName,
}: HintImageSettingPickerProps<T>) {
  return (
    <View className={className}>
      <View className="gap-1">
        {title.length === 0 ? null : (
          <Text className="pyly-body-subheading">{title}</Text>
        )}
        {description == null ? null : (
          <Text className="text-[14px] text-fg-dim">{description}</Text>
        )}
      </View>
      <InlineEditableSettingImage
        setting={setting}
        settingKey={settingKey}
        presetImageIds={presetImageIds}
        includeHistory={includeHistory}
        previewHeight={previewHeight}
        tileSize={tileSize}
        enablePasteDropZone={enablePasteDropZone}
        onUploadError={onUploadError}
        className={imageClassName}
      />
    </View>
  );
}

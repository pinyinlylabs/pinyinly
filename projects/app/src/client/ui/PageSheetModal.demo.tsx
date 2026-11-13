import { PageSheetModal } from "@/client/ui/PageSheetModal";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { Theme } from "@/client/ui/Theme";
import { View } from "@/client/ui/View";
import type { PylyThemeName } from "@/client/ui/Theme";
import { themeNames } from "@/client/ui/demo/utils";
import { useState } from "react";
import { useUniwind } from "uniwind";

export default function PageSheetModalDemo() {
  return (
    <View className="flex-1 flex-row flex-wrap items-start gap-4 p-4">
      <PageSheetModalExample label="Inherited" />
      <PageSheetModalExample label="Light" theme="light" />
      <PageSheetModalExample label="Dark" theme="dark" />
      {themeNames.map((theme) => (
        <PageSheetModalExample key={theme} label={theme} theme={theme} />
      ))}
    </View>
  );
}

function PageSheetModalExample({
  label,
  theme,
}: {
  label: string;
  theme?: PylyThemeName;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Theme theme={theme}>
      <View className="gap-2 bg-bg p-4">
        <Text className="text-fg">{label}</Text>
        <RectButton
          variant="filled"
          onPress={() => {
            setIsOpen(true);
          }}
        >
          Open sheet
        </RectButton>
        {isOpen ? (
          <PageSheetModal
            onDismiss={() => {
              setIsOpen(false);
            }}
            suspenseFallback={null}
          >
            {({ dismiss }) => <PageSheetModalContent dismiss={dismiss} />}
          </PageSheetModal>
        ) : null}
      </View>
    </Theme>
  );
}

function PageSheetModalContent({ dismiss }: { dismiss: () => void }) {
  const { theme } = useUniwind();

  return (
    <View className="flex-1 gap-4 bg-bg p-4">
      <Text className="text-fg">Modal theme: {theme}</Text>
      <RectButton variant="filled" onPress={dismiss}>
        Dismiss
      </RectButton>
    </View>
  );
}

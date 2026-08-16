import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { PageSheetModal } from "./PageSheetModal";
import { QuickSearchResults } from "./QuickSearchResults";
import { TextInputSingle } from "./TextInputSingle";

export function QuickSearchModal({
  devUiSnapshotMode,
  onDismiss,
}: {
  devUiSnapshotMode?: boolean;
  onDismiss: () => void;
}) {
  return (
    <PageSheetModal
      onDismiss={onDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={
        <Text className="font-sans text-muted-fg">Loading…</Text>
      }
    >
      {({ dismiss }) => <ModalContent onDismiss={dismiss} />}
    </PageSheetModal>
  );
}

function ModalContent({ onDismiss }: { onDismiss: () => void }) {
  const [query, setQuery] = useState(``);

  return (
    <View className="min-h-50 flex-1 bg-bg-high">
      <View className="h-12 flex-row items-center gap-2 border-b border-b-fg/10 px-4">
        <Icon icon="search" size={20} tintColorClassName="accent-muted-fg" />
        <TextInputSingle
          autoFocus
          placeholder="Search dictionary"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          className="flex-1"
          variant="bare"
        />
        <Pressable
          className="rounded bg-fg/10 px-1.5 py-1"
          onPress={() => {
            onDismiss();
          }}
        >
          <Text className="font-sans text-sm text-fg">ESC</Text>
        </Pressable>
      </View>

      <QuickSearchResults
        query={query}
        onChangeQuery={setQuery}
        onSelect={onDismiss}
      />
    </View>
  );
}

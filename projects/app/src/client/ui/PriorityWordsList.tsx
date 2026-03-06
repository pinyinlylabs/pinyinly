import { usePriorityWordsList } from "@/client/ui/hooks/usePriorityWordsList";
import { format } from "date-fns/format";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { RectButton } from "./RectButton";

export function PriorityWordsList() {
  const { words, isLoading, addWord, removeWord } = usePriorityWordsList();
  const [newWord, setNewWord] = useState(``);

  const handleAdd = () => {
    const trimmed = newWord.trim();
    if (trimmed.length === 0) {
      return;
    }
    addWord(trimmed);
    setNewWord(``);
  };

  return (
    <View className="gap-6">
      {/* Add new word section */}
      <View className="gap-3">
        <Text className="pyly-body-heading">Add a word</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={newWord}
            onChangeText={setNewWord}
            placeholder="Enter hanzi word..."
            onSubmitEditing={handleAdd}
            className="flex-1 rounded-lg border border-fg/10 bg-bg-high px-4 py-3 font-sans text-fg"
          />
          <RectButton
            variant="filled"
            iconStart="add-circled-filled"
            onPress={handleAdd}
            disabled={newWord.trim().length === 0}
          >
            Add
          </RectButton>
        </View>
        <Text className="pyly-body-caption text-fg-dim">
          Add words you encounter in daily life to prioritize them in practice.
        </Text>
      </View>

      {/* Words list */}
      <View className="gap-3">
        <Text className="pyly-body-heading">My Words ({words.length})</Text>

        {isLoading ? (
          <Text className="pyly-body-caption text-fg-dim">Loading...</Text>
        ) : words.length === 0 ? (
          <View className="rounded-lg bg-fg/5 p-6">
            <Text className="pyly-body text-center text-fg-dim">
              No priority words yet. Add words above to get started!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {words.map((item) => (
              <View
                key={item.word}
                className={`
                  flex-row items-center gap-3 rounded-lg border border-fg/10 bg-bg-high px-4 py-3
                `}
              >
                <Text className="text-2xl font-semibold text-fg-loud">
                  {item.word}
                </Text>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-fg-dim">
                    Added {format(item.createdAt, `MMM d, yyyy`)}
                  </Text>
                  {item.note == null ? null : (
                    <Text className="text-sm text-fg">{item.note}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => {
                    removeWord(item.word);
                  }}
                  className={`
                    rounded-lg p-2

                    hover:bg-fg/5
                  `}
                >
                  <Icon icon="close" size={16} className="text-fg-dim" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

import type { HanziText } from "@/data/model";
import {
  getUserHanziMeaningKeyParams,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useDb } from "./hooks/useDb";
import { useUserHanziMeaning } from "./hooks/useUserHanziMeaning";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { RectButton } from "./RectButton";

interface WikiUserMeaningsProps {
  hanzi: HanziText;
}

export function WikiUserMeanings({ hanzi }: WikiUserMeaningsProps) {
  const db = useDb();

  const { data: userMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
    [db.userDictionary, hanzi],
  );

  return (
    <View className="gap-6 px-4">
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[17px] font-semibold text-fg-loud">
            Your meanings
          </Text>
          <AddMeaningButton hanzi={hanzi} />
        </View>

        {userMeanings.length === 0 ? (
          <Text className="text-[14px] text-fg-dim">
            You haven&apos;t added any meanings yet. Add one to start
            practicing!
          </Text>
        ) : (
          <View className="gap-6">
            {userMeanings.map((meaning) => (
              <UserMeaningItem
                key={meaning.meaningKey}
                hanzi={hanzi}
                meaningKey={meaning.meaningKey}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function AddMeaningButton({ hanzi }: { hanzi: HanziText }) {
  const meaningKey = `u_${nanoid()}`;
  const { set } = useUserHanziMeaning({ hanzi, meaningKey });

  const handleAdd = useCallback(() => {
    set({ gloss: `New meaning` });
  }, [set]);

  return (
    <RectButton
      variant="bare"
      iconStart="add-circled-filled"
      iconSize={16}
      onPress={handleAdd}
    >
      Add meaning
    </RectButton>
  );
}

function UserMeaningItem({
  hanzi,
  meaningKey,
}: {
  hanzi: HanziText;
  meaningKey: string;
}) {
  const keyParams = getUserHanziMeaningKeyParams(hanzi, meaningKey);
  const { remove, value } = useUserHanziMeaning({ hanzi, meaningKey });
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    remove();
  }, [remove]);

  if (isRemoving || value == null) {
    return null;
  }

  return (
    <View className="gap-3 rounded-xl border border-fg/10 bg-bg-high p-4">
      {/* Header with delete button */}
      <View className="flex-row items-center justify-end">
        <RectButton
          variant="bare"
          iconStart="close"
          iconSize={16}
          className="text-fg-dim"
          onPress={handleRemove}
        />
      </View>

      {/* Gloss */}
      <View className="gap-1">
        <Text className="text-[12px] font-medium uppercase text-fg-dim">
          Meaning
        </Text>
        <InlineEditableSettingText
          variant="body"
          setting={userHanziMeaningGlossSetting}
          settingKey={keyParams}
          placeholder="Enter meaning..."
          multiline
        />
      </View>

      {/* Pinyin */}
      <View className="gap-1">
        <Text className="text-[12px] font-medium uppercase text-fg-dim">
          Pinyin
        </Text>
        <InlineEditableSettingText
          variant="body"
          setting={userHanziMeaningPinyinSetting}
          settingKey={keyParams}
          placeholder="Add pinyin (optional)"
        />
      </View>

      {/* Note */}
      <View className="gap-1">
        <Text className="text-[12px] font-medium uppercase text-fg-dim">
          Note
        </Text>
        <InlineEditableSettingText
          variant="body"
          setting={userHanziMeaningNoteSetting}
          settingKey={keyParams}
          placeholder="Add a note (optional)"
          multiline
        />
      </View>
    </View>
  );
}

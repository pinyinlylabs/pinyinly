import {
  useClientStorageMutation,
  useClientStorageQuery,
} from "@/client/hooks/useClientStorage";
import { ToggleButton } from "@/client/ui/ToggleButton";
import { Text, View } from "react-native";
import z from "zod/v4";

export default function DeveloperSettingsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="hhh-body-title">Developer</Text>
      </View>

      <View className="gap-2">
        <Text className="hhh-body-dt">Network</Text>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="hhh-body-heading">Slow queries</Text>
            <Text className="hhh-body-caption">
              Artificially increase local and network query latency by 1000 ms.
            </Text>
          </View>
          <View>
            <ClientSettingToggleButton settingName="settings.developer.slowQueries" />
          </View>
        </View>
      </View>
    </View>
  );
}

function ClientSettingToggleButton({ settingName }: { settingName: string }) {
  const [isActive, setIsActive] = useClientStorageBoolean(settingName);

  return (
    <ToggleButton
      isActive={isActive}
      onPress={() => {
        setIsActive((prev) => !prev);
      }}
    />
  );
}

const booleanDecodeSchema = z
  .string()
  .transform((x) => JSON.parse(x))
  .pipe(z.boolean());
const booleanEncodeSchema = z
  .boolean()
  .transform((value) => JSON.stringify(value));

function useClientStorageBoolean(
  settingName: string,
): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  const result = useClientStorageQuery(settingName);
  const mutate = useClientStorageMutation(settingName);

  const value = booleanDecodeSchema.safeParse(result.data).data ?? false;

  const setValue = (newValue: boolean | ((prev: boolean) => boolean)) => {
    if (typeof newValue === `function`) {
      newValue = newValue(value);
    }
    mutate.mutate(booleanEncodeSchema.parse(newValue));
  };

  return [value, setValue];
}

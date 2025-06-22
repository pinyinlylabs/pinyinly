import type { DeviceStorageToggleableEntity } from "@/client/deviceStorage";
import { useDeviceStorage } from "@/client/hooks/useDeviceStorage";
import { ToggleButton } from "@/client/ui/ToggleButton";

export function DeviceStorageToggleButton({
  entity,
}: {
  entity: DeviceStorageToggleableEntity;
}) {
  const { value, setValue } = useDeviceStorage(entity);

  return (
    <ToggleButton
      isActive={value?.enabled ?? false}
      onPress={() => {
        setValue((prev) => ({ enabled: !(prev?.enabled ?? false) }));
      }}
    />
  );
}

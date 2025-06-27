import type { DeviceStoreToggleableEntity } from "@/client/deviceStore";
import { useDeviceStore } from "@/client/hooks/useDeviceStore";
import { ToggleButton } from "@/client/ui/ToggleButton";

export function DeviceStoreToggleButton({
  entity,
}: {
  entity: DeviceStoreToggleableEntity;
}) {
  const { isLoading, value, setValue } = useDeviceStore(entity);

  return (
    <ToggleButton
      isActive={isLoading ? null : (value?.enabled ?? false)}
      onPress={() => {
        setValue((prev) => {
          const prevEnabled = prev?.enabled ?? false;
          return { ...prev, enabled: !prevEnabled };
        });
      }}
    />
  );
}

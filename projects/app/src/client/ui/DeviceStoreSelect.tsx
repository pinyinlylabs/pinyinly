import type {
  DeviceStoreEntity,
  DeviceStoreEntityInput,
  DeviceStoreEntityOutput,
} from "@/client/deviceStore";
import {
  useDeviceStoreMutation,
  useDeviceStoreSuspenseQuery,
} from "@/client/ui/hooks/useDeviceStore";
import { Select } from "@/client/ui/Select";
import type { SelectProps } from "@/client/ui/Select";
import { Text } from "@/client/ui/Text";

export interface DeviceStoreSelectProps<
  Entity extends DeviceStoreEntity,
  Value extends string,
> extends Omit<SelectProps<Value>, `value` | `onValueChange`> {
  entity: Entity;
  entityFromValue: (value: Value) => DeviceStoreEntityInput<Entity>;
  errorMessage?: string;
  valueFromEntity: (value: DeviceStoreEntityOutput<Entity>) => Value;
}

export function DeviceStoreSelect<
  Entity extends DeviceStoreEntity,
  Value extends string,
>({
  entity,
  entityFromValue,
  errorMessage = `Could not save this selection. Please try again.`,
  valueFromEntity,
  disabled,
  ...selectProps
}: DeviceStoreSelectProps<Entity, Value>) {
  const { data } = useDeviceStoreSuspenseQuery(entity);
  const mutation = useDeviceStoreMutation(entity);

  return (
    <>
      <Select
        {...selectProps}
        value={valueFromEntity(data)}
        onValueChange={(value) => {
          mutation.mutate(entityFromValue(value), {
            onError: (error) => {
              console.error(`Failed to save device store selection`, error);
            },
          });
        }}
        disabled={disabled === true || mutation.isPending}
      />
      {mutation.isError ? (
        <Text accessibilityRole="alert" className="pyly-body-caption">
          {errorMessage}
        </Text>
      ) : null}
    </>
  );
}

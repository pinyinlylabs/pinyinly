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
  Value extends string | null,
> extends Omit<SelectProps<string>, `options` | `value` | `onValueChange`> {
  entity: Entity;
  entityFromValue: (value: Value) => DeviceStoreEntityInput<Entity>;
  errorMessage?: string;
  options: readonly { value: Value; label: string }[];
  valueFromEntity: (value: DeviceStoreEntityOutput<Entity>) => Value;
}

export function DeviceStoreSelect<
  Entity extends DeviceStoreEntity,
  Value extends string | null,
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
  const value = valueFromEntity(data);
  const options = selectProps.options.map((option, index) => ({
    ...option,
    value: String(index),
  }));
  const selectedIndex = selectProps.options.findIndex(
    (option) => option.value === value,
  );

  return (
    <>
      <Select
        {...selectProps}
        options={options}
        value={selectedIndex < 0 ? undefined : String(selectedIndex)}
        onValueChange={(value) => {
          const index = Number(value);
          const selected = selectProps.options[index];
          if (selected == null) {
            throw new Error(`Unknown device store selection "${value}"`);
          }
          mutation.mutate(entityFromValue(selected.value), {
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

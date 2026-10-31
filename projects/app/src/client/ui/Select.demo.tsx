import { ExampleStack } from "@/client/ui/demo/components";
import { Select } from "@/client/ui/Select";
import { View } from "@/client/ui/View";
import { useState } from "react";

const options = [
  { value: `auto`, label: `Auto` },
  { value: `light`, label: `Light` },
  { value: `dark`, label: `Dark` },
] as const;

export default function SelectDemo() {
  const [value, setValue] = useState<(typeof options)[number][`value`]>(`auto`);

  return (
    <View className="flex-1 flex-row flex-wrap">
      <ExampleStack title="default">
        <Select
          accessibilityLabel="Color scheme"
          options={options}
          value={value}
          onValueChange={setValue}
          placeholder="Choose a color scheme"
        />
      </ExampleStack>
      <ExampleStack title="disabled">
        <Select
          accessibilityLabel="Disabled color scheme"
          options={options}
          value={value}
          onValueChange={setValue}
          placeholder="Choose a color scheme"
          disabled
        />
      </ExampleStack>
    </View>
  );
}

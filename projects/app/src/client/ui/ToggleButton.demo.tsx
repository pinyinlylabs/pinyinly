import { ExampleStack } from "@/client/ui/demo/helpers";
import { ToggleButton } from "@/client/ui/ToggleButton";
import { useState } from "react";

export default () => {
  const [isActive1, setIsActive1] = useState(false);
  const [isActive2, setIsActive2] = useState(true);
  return (
    <>
      <ExampleStack title="loading">
        <ToggleButton isActive={null} onPress={() => null} />
      </ExampleStack>
      <ExampleStack title="on">
        <ToggleButton
          isActive={isActive1}
          onPress={() => {
            setIsActive1((prev) => !prev);
          }}
        />
      </ExampleStack>
      <ExampleStack title="off">
        <ToggleButton
          isActive={isActive2}
          onPress={() => {
            setIsActive2((prev) => !prev);
          }}
        />
      </ExampleStack>
    </>
  );
};

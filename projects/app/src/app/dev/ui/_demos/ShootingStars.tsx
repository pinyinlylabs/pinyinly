import { ExampleStack } from "@/app/dev/ui/_helpers";
import { RectButton } from "@/client/ui/RectButton";
import { ShootingStars } from "@/client/ui/ShootingStars";
import { useState } from "react";
import { View } from "react-native";

export default () => {
  const [i, setI] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [play, setPlay] = useState(false);

  return (
    <View key={i} className="flex-row">
      <ExampleStack title="autoplay (125×75)" showFrame>
        <ShootingStars className="h-[75px] w-[125px]" play={true} />
      </ExampleStack>

      <View>
        <ExampleStack title="resizable (100×50)" showFrame>
          <ShootingStars
            style={{ width: 100 + growth, height: 50 + growth }}
            play={play}
          />
        </ExampleStack>
        <View className="shrink flex-row">
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev - 5);
            }}
          >
            Shrink
          </RectButton>
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev + 5);
            }}
          >
            Grow
          </RectButton>
        </View>
      </View>

      <ExampleStack title="manual (100×50)" showFrame>
        <ShootingStars className="h-[50px] w-[100px]" play={play} />
      </ExampleStack>

      <ExampleStack title="manual (100×50) success" showFrame>
        <ShootingStars
          className="theme-success h-[50px] w-[100px]"
          play={play}
        />
      </ExampleStack>

      <ExampleStack title="Controls" childrenClassName="items-center gap-2">
        <RectButton
          onPress={() => {
            setPlay((prev) => !prev);
          }}
        >
          {play ? `Stop` : `Play`}
        </RectButton>
        <RectButton
          onPress={() => {
            setI((prev) => prev + 1);
          }}
        >
          Re-render
        </RectButton>
      </ExampleStack>
    </View>
  );
};

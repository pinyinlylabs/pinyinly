import { TutorialDialogBox } from "@/client/ui/TutorialDialogBox";
import { View } from "react-native";

export default () => (
  <View className="w-[400px] gap-2">
    {[
      `…you know ==辶== means **walk or movement**, and ==力== means **strength**…`,
      `…lorem ipsum dolor sit ==amet==, consectetur **adipiscing elit**, sed {好:good} do eiusmod *tempor incididunt* ut labore et dolore magna aliqua…`,
      `…you ==辶== means **walk or movement**…`,
    ].map((text, i) => (
      <TutorialDialogBox key={i} text={text} onContinue={() => null} />
    ))}
  </View>
);

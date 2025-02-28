import { trpc } from "@/client/trpc";
import { RectButton2 } from "@/client/ui/RectButton2";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DevApiPage() {
  const insets = useSafeAreaInsets();
  const { mutateAsync: debugAnonymousError } =
    trpc.debug.anonymousError.useMutation();
  const { mutateAsync: debugAuthedError } =
    trpc.debug.authedError.useMutation();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <RectButton2
        onPress={() => {
          void debugAnonymousError();
        }}
      >
        debug error auth
      </RectButton2>
      <RectButton2
        onPress={() => {
          void debugAuthedError();
        }}
      >
        debug error anonymous
      </RectButton2>
    </View>
  );
}

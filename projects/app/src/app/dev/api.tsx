import { trpc } from "@/client/trpc";
import { RectButton } from "@/client/ui/RectButton";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DevApiPage() {
  const insets = useSafeAreaInsets();
  const { mutateAsync: anonymousThrowError } =
    trpc.debug.anonymousThrowError.useMutation();
  const { mutateAsync: authedThrowError } =
    trpc.debug.authedThrowError.useMutation();
  const { mutateAsync: anonymousLogError } =
    trpc.debug.anonymousLogError.useMutation();
  const { mutateAsync: authedLogError } =
    trpc.debug.authedLogError.useMutation();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="max-w-[600px]"></View>
      <RectButton
        onPress={() => {
          void anonymousThrowError();
        }}
      >
        anonymousThrowError
      </RectButton>
      <RectButton
        onPress={() => {
          void authedThrowError();
        }}
      >
        authedThrowError
      </RectButton>
      <RectButton
        onPress={() => {
          void anonymousLogError();
        }}
      >
        anonymousLogError
      </RectButton>
      <RectButton
        onPress={() => {
          void authedLogError();
        }}
      >
        authedLogError
      </RectButton>
    </View>
  );
}

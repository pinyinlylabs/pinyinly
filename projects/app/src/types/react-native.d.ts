import "react-native";

declare module "react-native" {
  interface ViewStyle {
    [key: `--${string}`]: string | number;
  }
}

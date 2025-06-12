import "react-native";

declare module "react-native" {
  interface ViewStyle {
    /**
     * Allow declaring custom CSS variables in React Native, e.g.
     *
     * @example
     * <View style={{"--my-variable": "value"}} />
     */
    [key: `--${string}`]: string | number;
  }
}

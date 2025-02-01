import { isRunningInExpoGo } from "expo";

// react-native-purchases uses native modules that don't work in Expo Go. It's
// useful to still be able to use Expo Go in the simulator for quick testing, so
// in that case we use a mock implementation.

export const revenueCat = isRunningInExpoGo()
  ? (
      require(
        `./revenueCat.hhh-expogo`,
      ) as typeof import("./revenueCat.hhh-expogo")
    ).revenueCat
  : (
      require(
        `./revenueCat.hhh-native`,
      ) as typeof import("./revenueCat.hhh-native")
    ).revenueCat;

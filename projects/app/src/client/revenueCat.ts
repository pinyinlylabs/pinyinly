import Purchases from "react-native-purchases";

export const revenueCat = {
  configure(opts: { apiKey: string; userId: string | null }) {
    Purchases.configure({ ...opts, diagnosticsEnabled: __DEV__ });
  },
};

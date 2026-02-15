import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function hapticImpactIfMobile() {
  if (Platform.OS === `ios` || Platform.OS === `android`) {
    // Calling impactAsync on an unsupported platform (e.g. web) throws an
    // exception and will crash the app.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      (error: unknown) => {
        console.error(`Could not run haptic impact.`, error);
      },
    );
  }
}

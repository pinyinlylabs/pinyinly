import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect } from "react";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Keep the splash screen visible while we fetch resources
//

// oxlint-disable-next-line unicorn/prefer-top-level-await
ExpoSplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error(`Could not prevent splash screen auto hide`, error);
});

// 'Splashscreen.setOptions' cannot be used in Expo Go. To customize the splash
// screen, you can use development builds. [Component Stack]
if (!isExpoGo) {
  // Set the animation options. This is optional.
  ExpoSplashScreen.setOptions({
    duration: 0,
    fade: false,
  });
}

export const SplashScreen = ({ children: _children }: { children?: never }) => {
  const [fontsLoaded, fontError] = useFonts({
    [`NationalPark`]: require(
      `../../assets/fonts/NationalPark/NationalPark-VariableFont_wght.ttf`,
    ),
    [`MiSansL3`]: require(`../../assets/fonts/MiSans/MiSansL3.subset.ttf`),
    [`MiSans`]: require(`../../assets/fonts/MiSans/MiSansVF.subset.ttf`),
    [`PinyinlyComponents`]: require(
      `../../assets/fonts/PinyinlyComponentsVF.subset.ttf`,
    ),
  });
  const isReady = fontsLoaded || fontError != null;

  useEffect(() => {
    if (isReady) {
      ExpoSplashScreen.hide();
    }
  }, [isReady]);

  return null;
};

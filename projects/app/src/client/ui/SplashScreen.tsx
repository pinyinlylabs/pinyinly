import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";

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
    [`MiSansL3`]: require(`../../assets/fonts/MiSansL3/MiSansL3.subset.ttf`),
    [`MiSans`]: require(`../../assets/fonts/MiSansVF/MiSansVF.subset.ttf`),
    [`LXGWWenKaiGB`]: require(
      `../../assets/fonts/LXGW_WenKai_GB/LXGWWenKaiGB-Regular.subset.ttf`,
    ),
    [`PinyinlyComponents`]: require(
      `../../assets/fonts/PinyinlyComponents/PinyinlyComponentsVF.subset.ttf`,
    ),
  });
  const isReady = fontsLoaded || fontError != null;

  useEffect(() => {
    if (isReady) {
      ExpoSplashScreen.hide();
      if (Platform.OS === `web`) {
        const startup = document.querySelector(`#pyly-startup`);
        const fill = startup?.querySelector(`#pyly-startup-progress > div`);
        if (
          fill == null ||
          window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
        ) {
          startup?.remove();
          return;
        }

        const animation = fill.animate(
          [
            { width: `${fill.getBoundingClientRect().width}px` },
            { width: `100%` },
          ],
          { duration: 250, easing: `ease-out`, fill: `forwards` },
        );
        const timeout = window.setTimeout(() => {
          startup?.remove();
        }, 400);
        return () => {
          window.clearTimeout(timeout);
          animation.cancel();
        };
      }
    }
  }, [isReady]);

  return null;
};

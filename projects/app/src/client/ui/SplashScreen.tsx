import { invariant } from "@pinyinly/lib/invariant";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Reanimated, { FadeOut } from "react-native-reanimated";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Keep the splash screen visible while we fetch resources
//
// eslint-disable-next-line unicorn/prefer-top-level-await
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

export const SplashScreen = ({}: { children?: never }) => {
  const [fontsLoaded, fontError] = useFonts({
    [`Karla`]: require(`@/assets/fonts/Karla.ttf`),
    [`NationalPark`]: require(
      `@/assets/fonts/NationalPark/NationalPark-VariableFont_wght.ttf`,
    ),
    [`MaShanZheng-Regular`]: require(`@/assets/fonts/MaShanZheng-Regular.ttf`),
    [`NotoSerifSC-Medium`]: require(`@/assets/fonts/NotoSerifSC-Medium.otf`),
  });
  const isReady = fontsLoaded || fontError != null; // (lottieLoaded || lottieError) &&

  const [hide, setHide] = useState(false);
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isReady) {
      ExpoSplashScreen.hide();

      // If something broke with the animation, hide immediately rather than
      // getting stuck on the splash screen and locking the whole app.
      if (animationRef.current == null) {
        setHide(true);
        return;
      }

      animationRef.current.play();

      // Safe-guard hide the splash screen after 5 seconds in case something
      // goes wrong with the animation.
      const timer = setTimeout(() => {
        setHide(true);
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isReady]);

  if (Platform.OS === `web`) {
    return null; // Skip splash screen on web
  }

  if (hide) {
    return null;
  }

  const splashSource = require(`@/assets/lottie/splash.lottie.json`);
  invariant(typeof splashSource !== `number`);

  return (
    <Reanimated.View exiting={FadeOut} className="absolute inset-0">
      <View className="size-full items-center justify-center bg-[#DE6447]">
        <LottieView
          loop={false}
          onAnimationFinish={() => {
            setHide(true);
          }}
          ref={animationRef}
          style={{
            width: `100%`,
            height: `100%`,
            alignSelf: `center`,
            justifyContent: `center`,
          }}
          source={splashSource}
        />
      </View>
    </Reanimated.View>
  );
};

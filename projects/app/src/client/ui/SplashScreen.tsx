import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Keep the splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync().catch((e: unknown) => {
  console.error(`Could not prevent splash screen auto hide`, e);
});

// 'Splashscreen.setOptions' cannot be used in Expo Go. To customize the splash
// screen, you can use development builds. [Component Stack]
if (!isExpoGo) {
  // Set the animation options. This is optional.
  ExpoSplashScreen.setOptions({
    duration: 1000,
    fade: true,
  });
}

export const SplashScreen = ({}: { children?: never }) => {
  const [fontsLoaded, fontError] = useFonts({
    [`Karla`]: require(`@/assets/fonts/Karla.ttf`),
    [`MaShanZheng-Regular`]: require(`@/assets/fonts/MaShanZheng-Regular.ttf`),
    [`NotoSerifSC-Medium`]: require(`@/assets/fonts/NotoSerifSC-Medium.otf`),
  });

  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setTimeout(() => {
        ExpoSplashScreen.hide();
      }, 1000);

      const timer = setTimeout(() => {
        setHide(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [fontsLoaded, fontError]);

  if (Platform.OS === `web`) {
    return null; // Skip splash screen on web
  }

  if (hide) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="absolute bottom-0 left-0 right-0 top-0"
    >
      <View className="h-full w-full items-center justify-center bg-[#DE6447]">
        {/* <Text className="text-text">
          {!fontsLoaded && !fontError ? `ready` : `loading`}
        </Text> */}

        <LottieView
          autoPlay
          // ref={animation}
          style={{
            width: 140 / 4,
            height: 40 / 4,
            alignSelf: `center`,
            justifyContent: `center`,
          }}
          source={require(`@/assets/lottie/splash.lottie.json`)}
        />
      </View>
    </Animated.View>
  );
};

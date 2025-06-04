import { RectButton2 } from "@/client/ui/RectButton2";
import { useWebsiteStore } from "@/client/website";
import { Link } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";

export default function WebsitePage() {
  const setIsBodyGetStartedVisible = useWebsiteStore(
    (s) => s.setIsBodyGetStartedVisible,
  );
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
    initialIsIntersecting: true,
  });

  useEffect(() => {
    setIsBodyGetStartedVisible(isIntersecting);
  }, [isIntersecting, setIsBodyGetStartedVisible]);

  return (
    <>
      <View
        className={`www-px-comfortable mb-[100px] h-screen items-center justify-center pt-[100px]`}
      >
        <View className="mb-[100px] items-center">
          <Text
            className={`
              www-text-hero text-center

              lg:text-left
            `}
          >
            Teach yourself Chinese.
          </Text>
        </View>

        <View className="w-[350px] items-stretch gap-2">
          <Link href="/learn" asChild>
            <RectButton2
              variant="filled"
              className="accent-theme2"
              ref={(el) => {
                //  RectButton2 is a <View> rather than a DOM element.
                ref(el as Element | null);
              }}
            >
              Get Started
            </RectButton2>
          </Link>

          <Link href="/learn" asChild>
            <RectButton2 variant="outline">
              I already have an account
            </RectButton2>
          </Link>
        </View>
      </View>

      <View className="www-px-comfortable min-h-[500px] w-full pt-[100px]">
        <View className="max-w-www-col gap-40 self-center">
          <View>
            <Text className="www-text-subtitle">Chinese characters</Text>
            <Text className="www-text-title mb-4">
              Crack the code of Chinese characters, one piece at a time.
            </Text>

            <Text className="www-text-body">
              Each character is a puzzle made up of visual building blocks and
              sounds. Instead of overwhelming you with entire characters, we
              break them down to their core elements—helping you grasp the
              meaning, structure, and pronunciation before putting it all
              together.
            </Text>
          </View>

          <View>
            <Text className="www-text-subtitle">Radicals</Text>
            <Text className="www-text-title mb-4">
              Recognize hundreds of radicals.
            </Text>

            <Text className="www-text-body">
              Each radical carries meaning, and we make them unforgettable by
              turning them into stories. By linking each radical to a vivid
              narrative, you’ll recognize and recall them effortlessly—building
              a solid base for mastering Chinese characters.
            </Text>
          </View>

          <View>
            <Text className="www-text-subtitle">Pinyin</Text>
            <Text className="www-text-title mb-4">
              Turn pinyin into second nature.
            </Text>

            <Text className="www-text-body">
              Every Chinese character is spoken as a single syllable, made up of
              an initial, a final, and a tone. We break these down and assign
              easy-to-remember names to each part, making pronunciation
              effortless and intuitive.
            </Text>
          </View>

          <View>
            <Text className="www-text-subtitle">Mnemonics</Text>
            <Text className="www-text-title mb-4">
              Make Chinese characters unforgettable.
            </Text>

            <Text className="www-text-body">
              Each character comes with a handcrafted story that ties together
              its components, pronunciation, and meaning. By turning abstract
              strokes into vivid narratives, we help you see, hear, and remember
              every character effortlessly—so learning feels natural and recall
              becomes instant.
            </Text>
          </View>

          <View>
            <Text className="www-text-subtitle">Your own pace</Text>
            <Text className="www-text-title mb-4">
              Master Chinese characters in the most efficient order.
            </Text>

            <Text className="www-text-body">
              Our curriculum is built from an in-depth analysis of thousands of
              characters, ensuring you learn them in the most logical and
              effective sequence. Covering every character in the HSK Chinese
              Proficiency Test, this method fast-tracks your
              understanding—helping you read basic sentences quickly and, by the
              end, recognize nearly every character in a newspaper.
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

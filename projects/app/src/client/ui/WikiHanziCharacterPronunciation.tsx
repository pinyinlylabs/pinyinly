import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { pinyinSoundsQuery } from "@/client/query";
import type { HanziText, PinyinSoundId, PinyinSyllable } from "@/data/model";
import { parsePinyinSyllable } from "@/data/pinyin";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";

export function WikiHanziCharacterPronunciation({
  hanzi,
  primaryPinyin: pinyin,
  gloss,
}: {
  gloss: string;
  hanzi: HanziText;
  primaryPinyin: PinyinSyllable;
}) {
  const parsedPinyin = parsePinyinSyllable(pinyin);
  const r = useReplicache();
  const { data: pinyinSounds } = useRizzleQueryPaged(pinyinSoundsQuery(r));

  const initialPinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.initialSoundId as PinyinSoundId);
  const finalPinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.finalSoundId as PinyinSoundId);
  const tonePinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.tone.toString() as PinyinSoundId);

  return (
    <View className="mt-4 gap-2">
      <View className="mx-4">
        <Text className="pyly-body-subheading">Memorize the pronunciation</Text>
      </View>

      <View className="mx-4 rounded-lg bg-fg/5">
        <View className="gap-4 p-4">
          <Text className="pyly-body">
            <Text className="pyly-bold">{hanzi}</Text> is pronounced
            {` `}
            <Text className="pyly-bold">{pinyin}</Text>.
          </Text>

          <Text className="pyly-body">
            Use a story about &ldquo;
            <Text className="pyly-bold">{gloss}</Text>
            &rdquo; to remember the initial, the final, and the tone of
            {` `}
            <Text className="pyly-bold">{pinyin}</Text>.
          </Text>
        </View>

        {parsedPinyin == null ? null : (
          <View className="gap-4 p-4">
            <View className="">
              <Text className="pyly-body text-center">
                <Text className="pyly-bold">{pinyin}</Text>
              </Text>
              <View className="px-[15%] py-2">
                <ThreeSplitLinesDown className="h-[10px] w-full" />
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.initialSoundId}
                  </Text>
                  {initialPinyinSound == null ? null : (
                    <ArrowToSoundName>
                      {initialPinyinSound.name}
                    </ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.finalSoundId}
                  </Text>
                  {finalPinyinSound == null ? null : (
                    <ArrowToSoundName>{finalPinyinSound.name}</ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.tone}
                    <Text className="align-super text-[10px]">
                      {ordinalSuffix(parsedPinyin.tone)}
                    </Text>
                  </Text>
                  {tonePinyinSound == null ? null : (
                    <ArrowToSoundName>{tonePinyinSound.name}</ArrowToSoundName>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
        {__DEV__ ? (
          <>
            <View className="h-[400px] w-full border-fg/50 bg-fg/50"></View>
            <View className="px-4 py-2">
              <Text className="pyly-body-caption text-fg">
                In the lavish, dimly lit Broadway Bathroom, a crucial
                business MEETING is violently interrupted. A neon-clad Hula
                Hooper, mistaking the tall-ceilinged space for a fitness studio,
                spins her giant hoop wildly, scattering papers and forcing the
                shocked attendees to immediately adjourn their makeshift
                conference.
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function ArrowToSoundName({ children }: { children: ReactNode }) {
  return (
    <>
      <DownArrow />
      <Text className="pyly-body pyly-ref text-center">{children}</Text>
    </>
  );
}

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }
  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
}

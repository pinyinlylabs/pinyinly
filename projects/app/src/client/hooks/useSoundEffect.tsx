import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import type { PylyAudioSource } from "@pinyinly/expo-audio-sprites/client";
import { isAudioSpriteSource } from "@pinyinly/expo-audio-sprites/client";
import type { AudioSource } from "expo-audio";
import { useAudioPlayer } from "expo-audio";
import { use } from "react";
import { Platform } from "react-native";
import { useEventCallback } from "../hooks/useEventCallback";
import { useLocalQuery } from "../hooks/useLocalQuery";

export type UseSoundEffect = (source: PylyAudioSource) => () => void;

const useSoundEffectExpoAudio: UseSoundEffect = (source) => {
  const player = useAudioPlayer(
    source == null || isAudioSpriteSource(source) ? null : source,
  );

  const play = useEventCallback(() => {
    player.play();
  });

  return play;
};

// Use the Web Audio API on web (instead of expo-audio's <audio> element) so
// that sound effects don't take Audio Focus and take control of the media keys
// on the OS.
const useSoundEffectWebApi: UseSoundEffect = (source) => {
  const audioContext = use(AudioContextProvider.Context);

  let duration: number | undefined;
  let start: number | undefined;
  let asset: AudioSource;
  if (isAudioSpriteSource(source)) {
    duration = source.duration;
    start = source.start;
    asset = source.asset;
  } else {
    asset = source;
  }
  const sourceUri = typeof asset === `string` ? asset : null;

  // Download and cache the audio buffer.
  const { data: audioBuffer } = useLocalQuery({
    queryKey: [`useSoundEffect`, sourceUri],
    queryFn: async () => {
      if (sourceUri == null) {
        console.error(`failed to resolve URI for audio source`, source);
        return null;
      }

      return await fetch(sourceUri)
        .then((res) => res.arrayBuffer())
        .then((arrayBuffer) => audioContext?.decodeAudioData(arrayBuffer));
    },
    // Don't refetch on browser blur->focus.
    staleTime: Infinity,
  });

  const play = useEventCallback(() => {
    if (audioBuffer != null && audioContext != null) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.addEventListener(`ended`, () => {
        source.disconnect();
      });

      const prepareAudioContext =
        audioContext.state === `running`
          ? Promise.resolve()
          : audioContext.resume();

      prepareAudioContext
        .then(() => {
          source.start(0, start, duration);
        })
        .catch((error: unknown) => {
          console.error(`Failed to resume audio context`, error);
        });
    }
  });

  return play;
};

export const useSoundEffect = Platform.select<UseSoundEffect>({
  web: useSoundEffectWebApi,
  default: useSoundEffectExpoAudio,
});

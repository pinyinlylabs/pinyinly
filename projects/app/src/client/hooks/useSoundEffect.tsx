import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";
import {
  isAudioSpriteSource,
  resolveAudioSource,
} from "@pinyinly/audio-sprites/client";
import { useAudioPlayer } from "expo-audio";
import { use } from "react";
import { Platform } from "react-native";
import { useEventCallback } from "../hooks/useEventCallback";
import { useFetchAudioBuffer } from "./useFetchAudioBuffer";

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
const useSoundEffectWebApi: UseSoundEffect = (src) => {
  const { uri, range: [start, duration] = [] } = resolveAudioSource(src);

  const audioContext = use(AudioContextProvider.Context);
  const { data: audioBuffer } = useFetchAudioBuffer(uri);

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

import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import { useEventCallback } from "@/client/ui/hooks/useEventCallback";
import { useUserSettingToggle } from "@/client/ui/hooks/useUserSettingToggle";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";
import {
  isAudioSpriteSource,
  resolveAudioSource,
} from "@pinyinly/audio-sprites/client";
import { soundEffectsUserToggleSetting } from "@/data/userSettings";
import { useAudioPlayer } from "expo-audio";
import { use } from "react";
import { Platform } from "react-native";
import { useFetchAudioBuffer } from "./useFetchAudioBuffer";

export type UseSoundEffect = (source: PylyAudioSource) => () => void;

const useSoundEffectExpoAudio: UseSoundEffect = (source) => {
  const player = useAudioPlayer(
    source == null || isAudioSpriteSource(source) ? null : source,
  );
  const { isLoading, isEnabled } = useUserSettingToggle(
    soundEffectsUserToggleSetting,
  );

  const play = useEventCallback(() => {
    if (isLoading || !isEnabled) {
      return;
    }

    player.play();
  });

  return play;
};

// Use the Web Audio API on web (instead of expo-audio's <audio> element) so
// that sound effects don't take Audio Focus and take control of the media keys
// on the OS.
const useSoundEffectWebApi: UseSoundEffect = (src) => {
  const resolved = resolveAudioSource(src);
  const uri = resolved?.uri;
  const [start, duration] = resolved?.range ?? [];

  const audioContext = use(AudioContextProvider.Context);
  const { data: audioBuffer } = useFetchAudioBuffer(uri ?? null);
  const { isLoading, isEnabled } = useUserSettingToggle(
    soundEffectsUserToggleSetting,
  );

  const play = useEventCallback(() => {
    if (isLoading || !isEnabled || resolved == null) {
      return;
    }

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

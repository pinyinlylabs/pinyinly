import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import type { PylyAudioSource } from "@pinyinly/expo-audio-sprites/client";
import { resolveAudioSource } from "@pinyinly/expo-audio-sprites/client";
import { use, useState } from "react";
import { Platform } from "react-native";
import { useEventCallback } from "../hooks/useEventCallback";
import { useFetchAudioBuffers } from "./useFetchAudioBuffer";

export type UseSoundEffectCycle = (sources: PylyAudioSource[]) => () => void;

const useSoundEffectCycleExpoAudio: UseSoundEffectCycle = () => {
  console.error(
    `useSoundEffectCycle is not yet implemented on native` satisfies HasNameOf<
      typeof useSoundEffectCycle
    >,
  );

  const play = useEventCallback(() => {
    console.error(`not implemented`);
  });

  return play;
};

// Use the Web Audio API on web (instead of expo-audio's <audio> element) so
// that sound effects don't take Audio Focus and take control of the media keys
// on the OS.
const useSoundEffectCycleWebApi: UseSoundEffectCycle = (sources) => {
  const resolvedSources = sources.map((source) => resolveAudioSource(source));

  // De-duplicate URIs so that we don't make any duplicate queries to
  // react-query, otherwise it will log a warning.
  const uniqueUris = [...new Set(resolvedSources.map((source) => source.uri))];
  const audioBuffers = useFetchAudioBuffers(uniqueUris);

  const uriToAudioBuffer = new Map<string, AudioBuffer | null>(
    uniqueUris.map((uri, i) => [uri, audioBuffers[i] ?? null]),
  );

  const [nextSourceIndex, setNextSourceIndex] = useState(0);
  const audioContext = use(AudioContextProvider.Context);

  const play = useEventCallback(() => {
    setNextSourceIndex((prev) => (prev + 1) % sources.length);

    const resolvedSource = resolvedSources[nextSourceIndex];

    if (audioContext == null || resolvedSource == null) {
      return;
    }

    const audioBuffer = uriToAudioBuffer.get(resolvedSource.uri);
    if (audioBuffer == null) {
      console.error(
        `Failed to retrieve audio buffer for ${resolvedSource.uri}`,
      );
      return;
    }
    const [start, duration] = resolvedSources[nextSourceIndex]?.range ?? [];

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
        console.error(`Failed to play audio`, error);
      });
  });

  return play;
};

export const useSoundEffectCycle = Platform.select<UseSoundEffectCycle>({
  web: useSoundEffectCycleWebApi,
  default: useSoundEffectCycleExpoAudio,
});

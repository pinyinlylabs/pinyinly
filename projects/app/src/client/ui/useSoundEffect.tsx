import { useQuery } from "@tanstack/react-query";
import { AudioSource, useAudioPlayer } from "expo-audio";
import { useEventCallback } from "./util";

const audioContext =
  typeof AudioContext === `undefined` ? null : new AudioContext();

export type UseSoundEffect = (source: AudioSource) => () => void;

const useSoundEffectExpoAudio: UseSoundEffect = (source) => {
  const player = useAudioPlayer(source);

  const play = useEventCallback(() => {
    player.play();
  });

  return play;
};

// Use the Web Audio API on web (instead of expo-audio's <audio> element) so
// that sound effects don't take Audio Focus and take control of the media keys
// on the OS.
const useSoundEffectWebApi: UseSoundEffect = (source) => {
  const sourceUri = typeof source === `string` ? source : null;

  // Download and cache the audio buffer.
  const { data: audioBuffer } = useQuery({
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
      source.onended = () => {
        source.disconnect();
      };
      source.start();
    }
  });

  return play;
};

export const useSoundEffect: UseSoundEffect =
  audioContext == null ? useSoundEffectWebApi : useSoundEffectExpoAudio;

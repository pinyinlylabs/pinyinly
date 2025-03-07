import { Audio, AVPlaybackSource } from "expo-av";
import { useMemo } from "react";
import { useEventCallback } from "./util";

export const useSoundEffect = (source: AVPlaybackSource) => {
  const soundObject = useMemo(
    () =>
      Audio.Sound.createAsync(
        source,
        undefined,
        // Keep the sound muted unless it's actually playing. Without this the
        // sound would take focus of keyboard media keys (play/pause,
        // next/previous).
        (status) => {
          if (status.isLoaded) {
            const targetIsMuted = !status.isPlaying;
            if (status.isMuted !== targetIsMuted) {
              soundObject
                .then(({ sound }) => sound.setIsMutedAsync(targetIsMuted))
                .catch((e: unknown) => {
                  console.error(
                    `Failed to async set sound isMuted to ${targetIsMuted}`,
                    e,
                  );
                });
            }
          }
        },
      ),
    [source],
  );

  const play = useEventCallback(() => {
    (async () => {
      const { sound } = await soundObject;
      void sound.playAsync().catch((e: unknown) => {
        console.error(`Failed in .playAsync()`, e);
      });
      // Unmuting the sound immediately to avoid the start being cut off because
      // `onPlaybackStatusUpdate` is async.
      void sound.setIsMutedAsync(false).catch((e: unknown) => {
        console.error(`Failed in .setIsMutedAsync(false)`, e);
      });
    })().catch((e: unknown) => {
      console.error(`Failed to play sound`, e);
    });
  });

  return play;
};

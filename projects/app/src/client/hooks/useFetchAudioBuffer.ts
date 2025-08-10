import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { use } from "react";
import { useFetchArrayBuffer } from "./useFetchArrayBuffer";

export const useFetchAudioBuffer = (uri: string): AudioBuffer | null => {
  const { data } = useFetchArrayBuffer({ variables: { uri } });
  const audioContext = use(AudioContextProvider.Context);

  const hasData = data != null;
  const hasAudioContext = audioContext != null;

  const { data: audioBuffer } = useSuspenseQuery({
    queryKey: [`audioBuffer`, uri, { hasData, hasAudioContext }],
    queryFn: async () => {
      if (hasData && hasAudioContext) {
        return await audioContext.decodeAudioData(data);
      }
      return null;
    },
    staleTime: Infinity,
  });

  return audioBuffer;
};

export const useFetchAudioBuffers = (
  uris: string[],
): readonly (AudioBuffer | null)[] => {
  const audioContext = use(AudioContextProvider.Context);

  const arrayBufferQueries = useSuspenseQueries({
    queries: uris.map((uri) => useFetchArrayBuffer.getOptions({ uri })),
  });

  const hasAudioContext = audioContext != null;
  const audioBufferQueries = useSuspenseQueries({
    queries: arrayBufferQueries.map(({ data: arrayBuffer }, i) => ({
      queryKey: [
        `audioBuffer`,
        uris[i],
        { hasData: arrayBuffer != null, hasAudioContext },
      ],
      queryFn: async () => {
        if (arrayBuffer != null && hasAudioContext) {
          return await audioContext.decodeAudioData(arrayBuffer);
        }
        return null;
      },
    })),
  });

  return audioBufferQueries.map((audioBufferQuery) => audioBufferQuery.data);
};

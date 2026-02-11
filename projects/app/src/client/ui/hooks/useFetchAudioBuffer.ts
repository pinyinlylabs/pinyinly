import { fetchAudioBufferQuery } from "@/client/query";
import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { use } from "react";

export const useFetchAudioBuffer = (uri: string | null) => {
  const audioContext = use(AudioContextProvider.Context);
  return useQuery(fetchAudioBufferQuery(uri, audioContext));
};

export const useFetchAudioBuffers = (
  uris: string[],
): readonly (AudioBuffer | null)[] => {
  const audioContext = use(AudioContextProvider.Context);
  return useSuspenseQueries({
    queries: uris.map((uri) => fetchAudioBufferQuery(uri, audioContext)),
    combine: (results) => {
      return results.map((result) => result.data);
    },
  });
};

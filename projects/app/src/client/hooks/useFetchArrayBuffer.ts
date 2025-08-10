import { createSuspenseQuery } from "react-query-kit";

export const useFetchArrayBuffer = createSuspenseQuery({
  queryKey: [`fetchArrayBuffer`],
  fetcher: async (variables: { uri: string | null }, { signal }) => {
    // Fetch and return the sound effect data
    if (variables.uri == null) {
      console.error(`failed to resolve URI for audio source`, variables.uri);
      return null;
    }

    return await fetch(variables.uri, { signal }).then((res) =>
      res.arrayBuffer(),
    );
  },
  staleTime: Infinity,
});

import { QueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useNewQueryClient() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            throwOnError: true,
          },
        },
      }),
  );
  return queryClient;
}

import { IS_CI } from "@/util/env";
import { QueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useNewQueryClient() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            throwOnError: true,
            retry: !IS_CI,
          },
        },
      }),
  );
  return queryClient;
}

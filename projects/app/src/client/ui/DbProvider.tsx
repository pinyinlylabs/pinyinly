import { makeDb } from "@/client/query";
import { trpc } from "@/client/trpc";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { useQueryClient } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { DbContext } from "./contexts";

function DbProvider({ children }: PropsWithChildren) {
  "use memo";
  const rizzle = useRizzle();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const db = makeDb(rizzle, {
    queryClient,
    listPasskeys:  async () => utils.client.auth.listPasskeys.query(),
  });

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

DbProvider.Context = DbContext;

export { DbProvider };

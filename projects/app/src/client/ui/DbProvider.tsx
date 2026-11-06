import { makeDb } from "@/client/db";
import { trpc } from "@/client/trpc";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import type { PropsWithChildren } from "react";
import { DbContext } from "./contexts";

function DbProvider({ children }: PropsWithChildren) {
  "use memo";
  const rizzle = useRizzle();
  const utils = trpc.useUtils();
  const db = makeDb(rizzle, {
    listPasskeys: async () => utils.client.auth.listPasskeys.query(),
  });

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

DbProvider.Context = DbContext;

export { DbProvider };

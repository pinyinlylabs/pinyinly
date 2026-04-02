import { makeDb } from "@/client/query";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import type { PropsWithChildren } from "react";
import { DbContext } from "./contexts";

function DbProvider({ children }: PropsWithChildren) {
  "use memo";
  const rizzle = useRizzle();
  const db = makeDb(rizzle);

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

DbProvider.Context = DbContext;

export { DbProvider };

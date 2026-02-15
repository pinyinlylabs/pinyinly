import { makeDb } from "@/client/query";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import type { PropsWithChildren } from "react";
import { DbContext } from "./contexts";

export const DbProvider = Object.assign(
  function DbProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const rizzle = useRizzle();
    const db = makeDb(rizzle);

    return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
  },
  { Context: DbContext },
);

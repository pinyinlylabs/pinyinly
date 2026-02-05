import { useReplicache } from "@/client/hooks/useReplicache";
import type { Db } from "@/client/query";
import { makeDb } from "@/client/query";
import type { PropsWithChildren } from "react";
import { createContext } from "react";

const Context = createContext<Db | null>(null);

export const DbProvider = Object.assign(
  function DbProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const rizzle = useReplicache();
    const db = makeDb(rizzle);

    return <Context.Provider value={db}>{children}</Context.Provider>;
  },
  { Context },
);

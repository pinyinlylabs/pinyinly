import type { Db } from "@/client/ui/DbProvider";
import { DbProvider } from "@/client/ui/DbProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useDb(): Db {
  const db = use(DbProvider.Context);
  invariant(
    db !== null,
    `useDb must be used within a DbProvider` satisfies HasNameOf<typeof useDb>,
  );
  return db;
}

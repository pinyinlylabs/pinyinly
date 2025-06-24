import { ReplicacheContext } from "@/client/ui/ReplicacheContext";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useReplicache() {
  const r = use(ReplicacheContext);
  invariant(r !== null);
  return r;
}

import { ReplicacheProvider } from "@/client/ui/ReplicacheProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useReplicache() {
  const r = use(ReplicacheProvider.Context);
  invariant(r !== null);
  return r;
}

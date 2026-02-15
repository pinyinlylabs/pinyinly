import { RizzleProvider } from "@/client/ui/RizzleProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useRizzle() {
  const r = use(RizzleProvider.Context);
  invariant(r !== null);
  return r;
}

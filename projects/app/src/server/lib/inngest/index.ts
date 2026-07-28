import { functions as actorFunctions } from "./actor";
import { functions as assetFunctions } from "./asset";
import { functions as debugFunctions } from "./debug";
import { functions as geminiFunctions } from "./gemini";
import { functions as healthCheckFunctions } from "./healthCheck";
import { functions as locationFunctions } from "./location";
import { functions as serverSyncFunctions } from "./serverSync";
import { functions as thoughtChainFunnelFunctions } from "./thoughtChainFunnel";
import type { InngestFunction } from "inngest";

export const functions: readonly InngestFunction.Like[] = [
  ...actorFunctions,
  ...assetFunctions,
  ...debugFunctions,
  ...healthCheckFunctions,
  ...locationFunctions,
  ...serverSyncFunctions,
  ...thoughtChainFunnelFunctions,
  ...geminiFunctions,
];

export { inngest } from "./client";

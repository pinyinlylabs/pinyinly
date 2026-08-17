import { functions as actorFunctions } from "./actor";
import { functions as assetFunctions } from "./asset";
import { functions as debugFunctions } from "./debug";
import { functions as geminiFunctions } from "./gemini";
import { functions as healthCheckFunctions } from "./healthCheck";
import { functions as locationFunctions } from "./location";
import { functions as pronunciationFunctions } from "./pronunciation";
import { functions as serverSyncFunctions } from "./serverSync";
import { functions as thoughtChainFunnelFunctions } from "./thoughtChainFunnel";
import type { InngestFunction } from "inngest";

export const functions: readonly InngestFunction.Like[] = [
  ...actorFunctions,
  ...assetFunctions,
  ...debugFunctions,
  ...geminiFunctions,
  ...healthCheckFunctions,
  ...locationFunctions,
  ...pronunciationFunctions,
  ...serverSyncFunctions,
  ...thoughtChainFunnelFunctions,
];

export { inngest } from "./client";

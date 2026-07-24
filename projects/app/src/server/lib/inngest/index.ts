import { functions as assetFunctions } from "./asset";
import { functions as debugFunctions } from "./debug";
import { functions as geminiFunctions } from "./gemini";
import { functions as healthCheckFunctions } from "./healthCheck";
import { functions as locationFunctions } from "./location";
import { functions as serverSyncFunctions } from "./serverSync";

export const functions = [
  ...assetFunctions,
  ...debugFunctions,
  ...healthCheckFunctions,
  ...locationFunctions,
  ...serverSyncFunctions,
  ...geminiFunctions,
];

export { inngest } from "./client";

import { functions as assetFunctions } from "./assets";
import { functions as debugFunctions } from "./debug";
import { functions as healthCheckFunctions } from "./healthCheck";
import { functions as locationFunctions } from "./location";
import { functions as serverSyncFunctions } from "./serverSync";

export const functions = [
  ...assetFunctions,
  ...debugFunctions,
  ...healthCheckFunctions,
  ...locationFunctions,
  ...serverSyncFunctions,
];

export { inngest } from "./client";

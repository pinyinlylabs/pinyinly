import { TEST_LICENSE_KEY } from "replicache";
import z from "zod";

const nonEmptyString = z.string().min(1);

export const replicacheLicenseKey = nonEmptyString
  // The special value `HHH_TEST_LICENSE_KEY` swaps to the test key from replicache.
  .transform((x) => (x === `HHH_TEST_LICENSE_KEY` ? TEST_LICENSE_KEY : x))
  .parse(process.env.EXPO_PUBLIC_REPLICACHE_LICENSE_KEY);

export const sentryDsn = nonEmptyString
  // Always require a DSN to be set to force environment variables to be
  // provided, but in the case of tests set it to an empty string to disable
  // sending events to Sentry.
  //
  // > … if it is initialized with an empty DSN, the SDK will not send any data
  // > over the network, such as captured exceptions.
  //
  // Source: https://docs.sentry.io/concepts/key-terms/dsn-explainer/
  .transform((x) => (x === `HHH_TEST_DSN` ? `` : x))
  .parse(process.env.EXPO_PUBLIC_SENTRY_DSN);

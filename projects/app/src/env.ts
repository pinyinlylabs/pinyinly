import { TEST_LICENSE_KEY } from "replicache";
import z from "zod";

const nonEmptyString = z.string().min(1);

export const replicacheLicenseKey = nonEmptyString
  // The special value `TEST_LICENSE_KEY` swaps to the test key from replicache.
  .transform((x) => (x === `TEST_LICENSE_KEY` ? TEST_LICENSE_KEY : x))
  .parse(process.env.EXPO_PUBLIC_REPLICACHE_LICENSE_KEY);

export const sentryDsn = nonEmptyString.parse(
  process.env.EXPO_PUBLIC_SENTRY_DSN,
);

const Sentry = require(`@sentry/node`);
const { captureConsoleIntegration } = require(`@sentry/core`);
// const { nodeProfilingIntegration } = require(`@sentry/profiling-node`);

Sentry.init({
  enabled: process.env.HHH_SENTRY_ENABLED !== `false`,
  debug: process.env.HHH_SENTRY_DEBUG === `true`,
  dsn: process.env.SENTRY_DSN, // Must be provided at runtime.
  integrations: [
    captureConsoleIntegration({ levels: [`warn`, `error`] }),
    // If there's an unhandled rejection then crash the process rather than
    // hanging indefinitely as this is more suitable for serverless environments.
    Sentry.onUnhandledRejectionIntegration({ mode: `strict` }),
    // nodeProfilingIntegration(),
  ],
  environment: process.env.HHH_SENTRY_ENVIRONMENT,
  tracesSampleRate: Number.parseFloat(
    process.env.HHH_SENTRY_TRACES_SAMPLE_RATE ?? `1`,
  ), // Keep in sync with the other Sentry.init()
  profilesSampleRate: Number.parseFloat(
    process.env.HHH_SENTRY_PROFILES_SAMPLE_RATE ?? `1`,
  ),
});

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);
const { waitUntil } = require(`@vercel/functions`);

const handler = createRequestHandler({
  // build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
  build: require(`path`).join(__dirname, `../dist/vercel/server`),
});

/** @type {import("@expo/server/adapter/vercel").RequestHandler} */
const vercelEntrypoint = async (req, res) => {
  try {
    await handler(req, res);
  } finally {
    waitUntil(flushSentry());
  }
};

/**
 * @param {number} ms
 */
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function flushSentry() {
  // Wait for Sentry to finish its span.
  await sleep(100);
  await Sentry.flush(5000);
}

module.exports = vercelEntrypoint;

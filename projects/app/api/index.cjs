const Sentry = require(`@sentry/node`);
const { captureConsoleIntegration } = require(`@sentry/core`);

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Must be provided at runtime.
  integrations: [
    captureConsoleIntegration(),
    // If there's an unhandled rejection then crash the process rather than
    // hanging indefinitely as this is more suitable for serverless environments.
    Sentry.onUnhandledRejectionIntegration({ mode: `strict` }),
  ],
  tracesSampleRate: 1, // Keep in sync with the other Sentry.init()
  profilesSampleRate: 1,
});

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);

module.exports = createRequestHandler({
  // build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
  build: require(`path`).join(__dirname, `../dist/vercel/server`),
});

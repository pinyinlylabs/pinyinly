const Sentry = require(`@sentry/node`);
const { captureConsoleIntegration } = require(`@sentry/core`);

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Must be provided at runtime.
  integrations: [captureConsoleIntegration()],
  tracesSampleRate: 1.0, // Keep in sync with the other Sentry.init()
});

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);

module.exports = createRequestHandler({
  // build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
  build: require(`path`).join(__dirname, `../dist/vercel/server`),
  mode: process.env.NODE_ENV,
});

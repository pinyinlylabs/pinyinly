const Sentry = require(`@sentry/node`);
const { captureConsoleIntegration } = require(`@sentry/core`);
// const { nodeProfilingIntegration } = require(`@sentry/profiling-node`);

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Must be provided at runtime.
  integrations: [
    captureConsoleIntegration(),
    //  nodeProfilingIntegration()
  ],
  tracesSampleRate: 1, // Keep in sync with the other Sentry.init()
  profilesSampleRate: 1,
});

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);

module.exports = createRequestHandler({
  // build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
  build: require(`path`).join(__dirname, `../dist/vercel/server`),
});

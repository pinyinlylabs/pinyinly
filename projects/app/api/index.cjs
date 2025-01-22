const Sentry = require(`@sentry/node`);
const { captureConsoleIntegration } = require(`@sentry/core`);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  integrations: [captureConsoleIntegration()],
  tracesSampleRate: 1.0, // Keep in sync with the other Sentry.init()
});

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);

module.exports = createRequestHandler({
  build: require(`path`).join(__dirname, `../dist/vercel/server`),
  mode: process.env.NODE_ENV,
});

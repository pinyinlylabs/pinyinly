// const Sentry = require(`@sentry/node`);
// const { captureConsoleIntegration } = require(`@sentry/core`);

// Sentry.init({
//   dsn: process.env.SENTRY_DSN, // Must be provided at runtime.
//   integrations: [captureConsoleIntegration()],
//   // tracesSampleRate: 1, // Keep in sync with the other Sentry.init()
//   // profilesSampleRate: 1,
//   debug: true,
// });

const { createRequestHandler } = require(`@expo/server/adapter/vercel`);

/** @type {import('@expo/server/adapter/vercel').RequestHandler} */
// eslint-disable-next-line unicorn/no-anonymous-default-export
module.exports = async (req, res) => {
  try {
    const handler = createRequestHandler({
      // build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
      build: require(`path`).join(__dirname, `../dist/vercel/server`),
    });

    await handler(req, res);
  } catch (error) {
    console.error(`error during @expo/server createRequestHandler`, error);
    res.writeHead(500, { "Content-Type": `text/plain` });
    res.end(`Internal Server Error`);
  }
};

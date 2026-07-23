let handlerPromise;
const serverless = require('serverless-http');

async function loadHandler() {
  // Netlify injects its environment variables directly. Loading dotenv here
  // makes the deployed function depend on a local-only package unnecessarily.
  const [environmentModule, appModule] = await Promise.all([
    import('../../src/config/environment.js'),
    import('../../app.js'),
  ]);

  environmentModule.assertRequiredEnvironment();
  return serverless(appModule.default);
}

// Netlify loads this .cjs entry point as CommonJS. Dynamic import keeps the
// existing Express backend in ES Modules without calling app.listen().
exports.handler = async (event, context) => {
  handlerPromise ??= loadHandler();
  const handler = await handlerPromise;
  return handler(event, context);
};

let handlerPromise;

async function loadHandler() {
  await import('dotenv/config');
  const [serverlessModule, environmentModule, appModule] = await Promise.all([
    import('serverless-http'),
    import('../../src/config/environment.js'),
    import('../../app.js'),
  ]);

  environmentModule.assertRequiredEnvironment();
  return serverlessModule.default(appModule.default);
}

// Netlify loads this .cjs entry point as CommonJS. Dynamic import keeps the
// existing Express backend in ES Modules without calling app.listen().
exports.handler = async (event, context) => {
  handlerPromise ??= loadHandler();
  const handler = await handlerPromise;
  return handler(event, context);
};

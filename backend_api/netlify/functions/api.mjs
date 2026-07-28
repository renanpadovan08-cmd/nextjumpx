import serverless from 'serverless-http';

import app from '../../app.js';
import { assertRequiredEnvironment } from '../../src/config/environment.js';

let serverlessHandler;

export async function handler(event, context) {
  assertRequiredEnvironment();
  serverlessHandler ??= serverless(app);
  return serverlessHandler(event, context);
}

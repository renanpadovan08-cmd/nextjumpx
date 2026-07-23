import 'dotenv/config';
import serverless from 'serverless-http';
import { assertRequiredEnvironment } from '../../src/config/environment.js';

// The .mjs extension makes Netlify execute this handler as an ES module.
// The local entry point remains backend_api/server.js.
assertRequiredEnvironment();
const { default: app } = await import('../../app.js');

export const handler = serverless(app);

import 'dotenv/config';
import serverless from 'serverless-http';
import { assertRequiredEnvironment } from '../../src/config/environment.js';

// Netlify executes this file as a serverless function, so do not call
// app.listen() here. The local entry point remains backend_api/server.js.
assertRequiredEnvironment();
const { default: app } = await import('../../app.js');

export const handler = serverless(app);

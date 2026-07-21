import cors from 'cors';
import express from 'express';
import routes from './src/routes/index.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';

const app = express();
const origins = (process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/', (_req, res) => res.json({ name: 'ZenBarber API', status: 'ok' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;

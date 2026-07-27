import cors from 'cors';
import express from 'express';
import routes from './src/routes/index.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
import { isCorsOriginAllowed } from './src/services/corsPolicy.js';

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (isCorsOriginAllowed(origin)) return callback(null, true);

    const error = new Error('Não permitido pelo CORS');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/', (_req, res) => res.json({ name: 'ZenBarber API', status: 'ok' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;

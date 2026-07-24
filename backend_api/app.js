import cors from 'cors';
import express from 'express';
import routes from './src/routes/index.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';

const app = express();
const origins = (process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);
    
    // Verifica se a origem está na lista do .env ou se é localhost
    const isAllowed = origins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/', (_req, res) => res.json({ name: 'ZenBarber API', status: 'ok' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;

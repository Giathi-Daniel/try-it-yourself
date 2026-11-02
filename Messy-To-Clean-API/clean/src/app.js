import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ordersRouter } from './orders.js';
import { errorHandler } from './errors.js';

export const app = express();

app.use(helmet());                          // safe HTTP headers
app.use(express.json({ limit: '10kb' }));   // no giant bodies
app.use(rateLimit({ windowMs: 60_000, limit: 100 }));

app.use('/api', ordersRouter);
app.use(errorHandler);                      // always last

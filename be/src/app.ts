import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import  walletRoutes from './routes/wallet.routes';
import  categoryRoutes from './routes/category.routes';
import  transactionRoutes from './routes/transaction.routes';

if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

// --------------- BigInt serialization (safe — no monkey-patch) ---------------
const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value;

const app = express();

// --------------- Trust proxy (Render / load balancer) ---------------
app.set('trust proxy', 1);

// --------------- JSON serialization ---------------
app.set('json replacer', bigIntReplacer);

// --------------- Security ---------------
app.use(helmet({
  contentSecurityPolicy: false, // allow OCR image preview & inline styles
  crossOriginEmbedderPolicy: false,
}));

// --------------- CORS ---------------
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --------------- Body parser ---------------
app.use(express.json({ limit: '10mb' })); // OCR can send large payloads
app.use(express.urlencoded({ extended: true }));

// --------------- Rate limiting ---------------

// Auth endpoints — brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts, try again later', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

//app.use('/api/v1/auth/login', authRoutes);
//app.use('/api/v1/auth/register', authRoutes);
//app.use('/api/v1/auth/refresh', authRoutes);
//app.use('/api', authRoutes);

// --------------- Health check (cron-job.org ping) ---------------
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// --------------- Routes (mount here) ---------------
 app.use('/api/v1/auth', authRoutes);
 app.use('/api/v1/wallets', walletRoutes);
 app.use('/api/v1/categories', categoryRoutes);
 app.use('/api/v1/transactions', transactionRoutes);
// app.use('/api/v1/ocr', ocrRoutes);
// app.use('/api/v1/budgets', budgetRoutes);
// app.use('/api/v1/goals', goalRoutes);
// app.use('/api/v1/recurring', recurringRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
// app.use('/api/v1/export', exportRoutes);

// --------------- 404 fallback ---------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// --------------- Global error handler ---------------
app.use(errorHandler);

export default app;
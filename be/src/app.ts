import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import walletRoutes from './routes/wallet.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import ocrRoutes from './routes/ocr.routes';
import budgetRoutes from './routes/budget.routes';
import recurringIncomeRoutes, { internalRecurringIncomeRoutes } from './routes/recurringIncome.routes';
import goalRoutes from './routes/goal.routes';
import recurringRuleRoutes, { internalRecurringRuleRoutes } from './routes/recurringRule.routes';
import exportRoutes from './routes/export.routes';
import notificationRoutes from './routes/notification.routes';
import { socketService, AuthenticatedSocket } from './services/socket.service';
import { verifyAccessToken } from './utils/jwt';

if (!(BigInt.prototype as unknown as Record<string, unknown>).toJSON) {
  (BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// --------------- Body parser ---------------
app.use(express.json({ limit: '10mb' })); // OCR can send large payloads
app.use(express.urlencoded({ extended: true }));

// --------------- Rate limiting ---------------

// Auth endpoints — general protection (login has a stricter limiter in routes)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
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

// --------------- Health check (cron-job.org ping) ---------------
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// --------------- Routes (mount here) ---------------
// Bypassed cron routes to prevent automated engine dropouts
app.use('/api/v1/recurring', internalRecurringRuleRoutes);
app.use('/api/v1/recurring-incomes', internalRecurringIncomeRoutes);

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/wallets', apiLimiter, walletRoutes);
app.use('/api/v1/categories', apiLimiter, categoryRoutes);
app.use('/api/v1/transactions', apiLimiter, transactionRoutes);
app.use('/api/v1/ocr', apiLimiter, ocrRoutes);
app.use('/api/v1/budgets', apiLimiter, budgetRoutes);
app.use('/api/v1/goals', apiLimiter, goalRoutes);
app.use('/api/v1/recurring-incomes', apiLimiter, recurringIncomeRoutes);
app.use('/api/v1/recurring', apiLimiter, recurringRuleRoutes);
app.use('/api/v1/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/v1/export', apiLimiter, exportRoutes);
app.use('/api/v1/notifications', apiLimiter, notificationRoutes);

// --------------- 404 fallback ---------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// --------------- Global error handler ---------------
app.use(errorHandler);

// ─── HTTP Server & Socket.IO ───

// Bọc Express bằng HTTP Server để Socket.IO dùng chung cổng
const httpServer = http.createServer(app);

// Khởi tạo Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

// Auth Middleware cho Socket qua JWT
io.use((socket: Socket, next: (err?: Error) => void) => {
  try {
    // Lấy token từ handshake hoặc header
    const authToken = socket.handshake.auth?.token as string | undefined;
    const headerToken = socket.handshake.headers.authorization?.split(' ')[1];
    const token = authToken ?? headerToken;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const result = verifyAccessToken(token);
    if (!result.ok) {
      return next(new Error(`Authentication failed: ${result.error}`));
    }

    // Strict token type check rule to verify decoded payload explicitly corresponds to access token identity
    if (result.payload.type !== 'access') {
      return next(new Error('Authentication failed: Invalid token type'));
    }

    // Gán userId vào session socket
    (socket as AuthenticatedSocket).userId = result.payload.userId;
    next();
  } catch {
    next(new Error('Socket authentication error'));
  }
});

// Xử lý connection
io.on('connection', (socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket;
  const { userId } = authSocket;

  // Đăng ký client
  socketService.registerClient(userId, socket.id);

  // Inbound packet rate limiter guard against packet flood attacks
  let packetCount = 0;
  let windowStart = Date.now();
  const windowMs = 10000;
  const maxPackets = 50;

  socket.use((_event: any, next: (err?: Error) => void) => {
    const now = Date.now();
    if (now - windowStart > windowMs) {
      packetCount = 1;
      windowStart = now;
      return next();
    }

    packetCount += 1;
    if (packetCount > maxPackets) {
      return next(new Error('Rate limit exceeded'));
    }

    next();
  });

  socket.on('error', (err: Error) => {
    if (err && err.message === 'Rate limit exceeded') {
      socket.disconnect(true);
    }
  });

  // Xóa client khi disconnect
  socket.on('disconnect', () => {
    socketService.unregisterClient(socket.id);
  });
});

// Init SocketService
socketService.init(io);

export { httpServer };
export default app;
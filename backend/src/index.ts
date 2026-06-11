import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { memorialsRouter } from './routes/memorials.js';
import { memoriesRouter } from './routes/memories.js';
import { lifeMomentsRouter } from './routes/life-moments.js';
import { interactionsRouter } from './routes/interactions.js';
import { contactRouter } from './routes/contact.js';
import { searchRouter } from './routes/search.js';
import { profileRouter } from './routes/profile.js';
import { usersRouter } from './routes/users.js';
import { csrfProtection } from './middleware/csrf.js';
import { AppError, errorHandler } from './middleware/error.js';
import { startUnverifiedAccountCleanupJob } from './jobs/cleanup-unverified-accounts.js';
import fs from 'fs';
import path from 'path';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const resolvedUploadDir = path.resolve(uploadDir);
const isProduction = process.env.NODE_ENV === 'production';

function normalizeOrigin(rawOrigin: string): string | null {
  const value = rawOrigin.trim();
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

fs.mkdirSync(resolvedUploadDir, { recursive: true });

// ── CORS (must come before helmet) ──
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://dennisvoutos.github.io',
  'https://memento-mori-fe.onrender.com',
  'https://mymementomori.com',
  'https://www.mymementomori.com',
];
const envAllowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter((origin): origin is string => Boolean(origin));
const allowedOrigins = new Set(
  [...defaultAllowedOrigins, ...envAllowedOrigins]
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin))
);

if (!isProduction) {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://localhost:5174');
}

app.use((req, _res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    next(new AppError(400, 'CORS origin is invalid'));
    return;
  }

  if (!allowedOrigins.has(normalizedOrigin)) {
    next(new AppError(403, 'CORS origin not allowed'));
    return;
  }

  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400,
  })
);

// ── Security ──
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },   // allow cross-origin popups
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow loading resources
    contentSecurityPolicy: false,                          // disable CSP for API
  })
);
// ── Rate Limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// ── Parsing ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', csrfProtection);

// ── Logging ──
app.use(morgan('dev'));

// ── Static uploads (dev only — production uses R2 signed URLs) ──
if (!isProduction) {
  app.use('/uploads', (req, res, next) => {
    const hasDotfileSegment = req.path
      .split('/')
      .filter(Boolean)
      .some((segment) => segment.startsWith('.'));

    if (hasDotfileSegment) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    next();
  });

  app.use(
    '/uploads',
    express.static(resolvedUploadDir, {
      dotfiles: 'ignore',
      index: false,
      fallthrough: false,
      maxAge: '1d',
    })
  );
}

// ── Health check ──
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'memento-mori-api' });
});
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', authRouter);
app.use('/api/memorials', memorialsRouter);
app.use('/api/memorials', memoriesRouter);
app.use('/api/memorials', lifeMomentsRouter);
app.use('/api/memorials', interactionsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/search', searchRouter);
app.use('/api/profile', profileRouter);
app.use('/api/users', usersRouter);

// ── Error handler ──
app.use(errorHandler);

startUnverifiedAccountCleanupJob();

app.listen(PORT, () => {
  console.log(`🕯️  Memento Mori API running on http://localhost:${PORT}`);
});

export default app;

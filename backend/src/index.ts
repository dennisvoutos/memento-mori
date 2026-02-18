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
import { errorHandler } from './middleware/error.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ──
app.use(helmet());
// Allow specific frontend origins (support common dev ports)
(() => {
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://dennisvoutos.github.io',
  ];
  const envOrigin = process.env.FRONTEND_URL;
  const allowedOrigins = envOrigin ? [envOrigin, ...defaultOrigins] : defaultOrigins;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser requests like curl/postman (no origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );
})();

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

// ── Logging ──
app.use(morgan('dev'));

// ── Static uploads (dev) ──
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

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

// ── Error handler ──
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🕯️  Memento Mori API running on http://localhost:${PORT}`);
});

export default app;

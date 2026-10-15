require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const clinicianRoutes = require('./routes/clinician');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── Rate Limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login/registration attempts from this IP, please try again after 15 minutes.' }
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Limit each IP to 60 assessment submissions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many assessment submissions from this IP, please try again later.' }
});

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'https://neura-care-woad.vercel.app',
  'https://neuracare.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/neura-care.*\.vercel\.app$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/assessment/submit', submitLimiter);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/clinician', clinicianRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'NeuraCare API' }));

// ── MongoDB + Start ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 NeuraCare API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting without DB — assessment history won\'t work');
    app.listen(PORT, () => console.log(`🚀 NeuraCare API running on port ${PORT} (no DB)`));
  });

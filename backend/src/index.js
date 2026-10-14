require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const clinicianRoutes = require('./routes/clinician');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'https://neuracare.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    // Allow for development/previews
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/clinician', clinicianRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'NeuraCare API' }));

// ── MongoDB + Start ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, {
    tlsAllowInvalidCertificates: true,
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

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const receiptRoutes = require('./routes/receipt.routes');
const documentRoutes = require('./routes/document.routes');
const mileageRoutes = require('./routes/mileage.routes');
const caRoutes = require('./routes/ca.routes');
const reportRoutes = require('./routes/report.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const taxRoutes = require('./routes/tax.routes');
const taxCaseRoutes = require('./routes/taxCase.routes');
const clientPortalRoutes = require('./routes/clientPortal.routes');
const documentRequestRoutes = require('./routes/documentRequest.routes');
const taxCaseTimelineRoutes = require('./routes/taxCaseTimeline.routes');
const taxCaseNoteRoutes = require('./routes/taxCaseNote.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Connect to MongoDB
console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS setup
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.MOBILE_APP_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Optional: handle preflight explicitly
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sanitizers / protections
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-requests', documentRequestRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/tax-cases', taxCaseRoutes);
app.use('/api/tax-case-timeline', taxCaseTimelineRoutes);
app.use('/api/tax-case-notes', taxCaseNoteRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ') || 'none set'}`);
});
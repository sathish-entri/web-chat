require('dotenv').config();
const dns = require('dns');
// Set DNS servers to bypass restricted local DNS settings for SRV resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('Could not set custom DNS servers, using system default:', e.message);
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/error');
const initializeSocket = require('./src/services/socketService');

// Routes
const authRoutes = require('./src/routes/auth');
const websiteRoutes = require('./src/routes/websites');
const conversationRoutes = require('./src/routes/conversations');
const widgetRoutes = require('./src/routes/widget');
const botRoutes = require('./src/routes/bot');
const analyticsRoutes = require('./src/routes/analytics');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      '*', // allow widget from any origin
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible in routes
app.set('io', io);

// Initialize socket events
initializeSocket(io);

// ─── MIDDLEWARE ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow widget to load from different origins
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins (widget can be embedded anywhere)
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Widget rate limit (more permissive for public widget)
const widgetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
});
app.use('/api/widget', widgetLimiter);

// ─── STATIC FILES ───
// Serve widget files with CORS headers
app.use('/widget', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
}, express.static(path.join(__dirname, '../widget')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 WebChat API is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── ERROR HANDLER ───
app.use(errorHandler);

// ─── 404 ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  🚀 WebChat Server Running            ║
  ║  Port: ${PORT}                           ║
  ║  Env:  ${process.env.NODE_ENV || 'development'}                    ║
  ╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = { app, server };

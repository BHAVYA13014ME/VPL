const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const passport = require('./utils/passport');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const gamificationRoutes = require('./routes/gamification');
const profileRoutes = require('./routes/profile');
const dashboardRoutes = require('./routes/dashboard');
const leaderboardRoutes = require('./routes/leaderboard');
const quizRoutes = require('./routes/quizzes');
const callRoutes = require('./routes/calls');

// Import middleware
const auth = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import socket handlers
const socketHandler = require('./utils/socketHandler');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (requestOrigin, callback) => {
      // Accept all origins — security handled via auth tokens
      callback(null, requestOrigin || '*');
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
});

// Security middleware

// CORS - allow all origins (API is secured via JWT)
const corsOptions = {
  origin: true,  // reflect request origin - works for any domain
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  // handle preflight for all routes

// Helmet after CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Rate limiting - more permissive during development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests for development, 100 for production
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
app.use(passport.initialize());

// Static files with CORS headers for video streaming
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Enable range requests for video streaming
    res.set('Accept-Ranges', 'bytes');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set proper content type for videos
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.ogg')) {
      res.set('Content-Type', 'video/ogg');
    } else if (filePath.endsWith('.pdf')) {
      res.set('Content-Type', 'application/pdf');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    }
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes); // Add singular route for user operations
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/calls', callRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Virtual Learning Platform API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO connection handling
socketHandler(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// MongoDB connection
const { connectDB } = require('./db');
connectDB()
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => { console.error('❌ MongoDB connection error:', err); process.exit(1); });

const PORT = process.env.PORT || 5000;

// Add process error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack:', reason.stack);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, just log it
});

const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${PORT} already in use — attempting to free it...`);
      const { execSync } = require('child_process');
      try {
        if (process.platform === 'win32') {
          const out = execSync(`netstat -ano | findstr :${PORT}`).toString();
          out.split('\n')
            .filter(l => l.includes('LISTENING'))
            .forEach(line => {
              const pid = line.trim().split(/\s+/).pop();
              if (pid && pid !== '0') {
                try { execSync(`taskkill /PID ${pid} /F`); console.log(`  Killed PID ${pid}`); } catch (_) {}
              }
            });
        } else {
          execSync(`fuser -k ${PORT}/tcp`);
        }
        console.log(`🔄 Retrying on port ${PORT} in 1s...`);
        server.removeAllListeners('error');
        setTimeout(startServer, 1000);
      } catch (killErr) {
        console.error('❌ Could not free port:', killErr.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Server listen error:', err);
      process.exit(1);
    }
  });
};

startServer();

module.exports = { app, server, io };

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('./shared/utils/logger');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// All global middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost development servers
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.CLIENT_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom route forwarding function
const forwardRequest = async (req, res, targetUrl) => {
  try {
    logger.info(`Forwarding ${req.method} ${req.path} to ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: `${targetUrl}${req.path}`,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host
      },
      data: req.body,
      timeout: 30000
    });
    
    logger.info(`Received response from ${targetUrl} for ${req.path}: ${response.status}`);
    
    // Forward the response
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error(`Forwarding error for ${req.path}:`, error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({ error: 'Service temporarily unavailable' });
    }
  }
};

// User service routes
app.all('/api/users/*', async (req, res) => {
  await forwardRequest(req, res, process.env.USER_SERVICE_URL || 'http://user-service:3001');
});

// Auth service routes
app.all('/api/auth/*', async (req, res) => {
  await forwardRequest(req, res, process.env.AUTH_SERVICE_URL || 'http://auth-service:3002');
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Service discovery endpoint
app.get('/services', (req, res) => {
  res.json({
    services: {
      user: process.env.USER_SERVICE_URL || 'http://user-service:3001',
      auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3002'
    }
  });
});

// Protected routes (require authentication)
app.use('/api/protected', authenticateToken, async (req, res) => {
  await forwardRequest(req, res, process.env.USER_SERVICE_URL || 'http://user-service:3001');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`User Service URL: ${process.env.USER_SERVICE_URL || 'http://user-service:3001'}`);
  logger.info(`Auth Service URL: ${process.env.AUTH_SERVICE_URL || 'http://auth-service:3002'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 
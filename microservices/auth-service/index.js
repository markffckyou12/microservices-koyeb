const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('./shared/utils/logger');
const database = require('./shared/utils/database');
const redis = require('./shared/utils/redis');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '1h';

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost development servers and production domain
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://new3-seven-beta.vercel.app',
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation schemas
const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required()
});

const passwordChangeSchema = Joi.object({
  userId: Joi.number().required(),
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { identifier, password } = value;
    // Find user by username or email
    const result = await database.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [identifier]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    const user = result.rows[0];
    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    // Generate JWT
    const token = jwt.sign({ userId: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    // Store session in DB
    await database.query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + interval \'1 hour\')', [user.id, token]);
    logger.info('User logged in', { userId: user.id, identifier });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password change endpoint
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { error, value } = passwordChangeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { userId, currentPassword, newPassword } = value;
    // Find user
    const result = await database.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    // Compare current password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    // Update password
    await database.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);
    // Invalidate all sessions for this user
    await database.query('UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1', [userId]);
    logger.info('Password changed', { userId });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation endpoint
app.post('/api/auth/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      res.json({ valid: true, user: decoded });
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Initialize services and start server
async function startServer() {
  try {
    await database.connect();
    logger.info('Database connected');
    await redis.connect();
    logger.info('Redis connected');
    app.listen(PORT, () => {
      logger.info(`Auth Service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.close();
  await redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.close();
  await redis.close();
  process.exit(0);
});

startServer(); 
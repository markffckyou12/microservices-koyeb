const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Joi = require('joi');
const logger = require('./shared/utils/logger');
const database = require('./shared/utils/database');
const redis = require('./shared/utils/redis');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation schemas
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().max(50).optional(),
  last_name: Joi.string().max(50).optional()
});

const userUpdateSchema = Joi.object({
  first_name: Joi.string().max(50).optional(),
  last_name: Joi.string().max(50).optional(),
  email: Joi.string().email().optional()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// User registration endpoint
app.post('/api/users/register', async (req, res) => {
  try {
    // Debug logging
    logger.info('Registration request received', { 
      method: req.method, 
      path: req.path, 
      headers: req.headers,
      body: req.body,
      ip: req.ip 
    });

    // Validate input
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password, first_name, last_name } = value;

    // Check if user already exists
    const existingUser = await database.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash the password before storing
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (password is hashed here)
    const result = await database.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name, created_at',
      [username, email, passwordHash, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    // Publish user registration event
    await redis.publish('user.registered', {
      userId: user.id,
      username: user.username,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    logger.info('User registered successfully', { userId: user.id, username });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at
      }
    });
  } catch (error) {
    logger.error('User registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile endpoint
app.get('/api/users/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await database.query(
      'SELECT id, username, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ user });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile endpoint
app.put('/api/users/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { error, value } = userUpdateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if user exists
    const existingUser = await database.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (value.first_name !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(value.first_name);
    }

    if (value.last_name !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(value.last_name);
    }

    if (value.email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await database.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [value.email, userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(value.email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount} 
      RETURNING id, username, email, first_name, last_name, created_at, updated_at
    `;

    const result = await database.query(updateQuery, updateValues);
    const user = result.rows[0];

    // Publish user update event
    await redis.publish('user.updated', {
      userId: user.id,
      updatedFields: Object.keys(value),
      timestamp: new Date().toISOString()
    });

    logger.info('User profile updated', { userId: user.id });

    res.json({
      message: 'User profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users endpoint (for admin purposes)
app.get('/api/users', async (req, res) => {
  try {
    const result = await database.query(
      'SELECT id, username, email, first_name, last_name, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Get all users error:', error);
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
    // Connect to database
    await database.connect();
    logger.info('Database connected');

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connected');

    // Start server
    app.listen(PORT, () => {
      logger.info(`User Service started on port ${PORT}`);
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
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost development servers and production domain
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://new3-seven-beta.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTable();
  }
});

// Create users table
function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Users table ready.');
    }
  });
}

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').optional().trim().isLength({ min: 1 })
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name must not be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format')
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Legacy endpoints (for backward compatibility)
app.post('/api/register', validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }

      if (row) {
        return res.status(400).json({ 
          success: false, 
          message: 'User already exists' 
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
      db.run(sql, [email, hashedPassword, name || null], function(err) {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error creating user' 
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: this.lastID, email },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          token,
          user: {
            id: this.lastID,
            email,
            name: name || null
          }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Microservice-compatible endpoints
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (row) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
      db.run(sql, [email, hashedPassword, `${first_name || ''} ${last_name || ''}`.trim() || null], function(err) {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({ error: 'Error creating user' });
        }

        res.status(201).json({
          message: 'User registered successfully',
          user: {
            id: this.lastID,
            username: email.split('@')[0], // Use email prefix as username
            email,
            first_name: first_name || null,
            last_name: last_name || null,
            created_at: new Date().toISOString()
          }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Legacy login endpoint
app.post('/api/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Microservice-compatible login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by email (identifier can be email)
    db.get('SELECT * FROM users WHERE email = ?', [identifier], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.email.split('@')[0], email: user.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.email.split('@')[0],
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Microservice-compatible profile endpoint
app.get('/api/users/profile/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;

  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse name into first_name and last_name
    const nameParts = (user.name || '').split(' ');
    const first_name = nameParts[0] || null;
    const last_name = nameParts.slice(1).join(' ') || null;

    res.json({
      user: {
        id: user.id,
        username: user.email.split('@')[0],
        email: user.email,
        first_name,
        last_name,
        created_at: user.created_at,
        updated_at: user.created_at // SQLite doesn't have updated_at, use created_at
      }
    });
  });
});

// Microservice-compatible profile update endpoint
app.put('/api/users/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { first_name, last_name, email } = req.body;

    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is being updated and if it's already taken by another user
      if (email) {
        db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, existingUser) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Server error' });
          }

          if (existingUser) {
            return res.status(409).json({ error: 'Email already taken by another user' });
          }

          // Proceed with update
          updateProfile();
        });
      } else {
        // No email update, proceed directly
        updateProfile();
      }

      function updateProfile() {
        // Build update query dynamically
        let updateFields = [];
        let updateValues = [];

        if (first_name !== undefined || last_name !== undefined) {
          const fullName = `${first_name || ''} ${last_name || ''}`.trim();
          updateFields.push('name = ?');
          updateValues.push(fullName || null);
        }

        if (email !== undefined) {
          updateFields.push('email = ?');
          updateValues.push(email);
        }

        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(userId);
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

        db.run(sql, updateValues, function(err) {
          if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ error: 'Error updating profile' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Return updated user data
          res.json({
            user: {
              id: userId,
              username: email ? email.split('@')[0] : undefined,
              email: email || undefined,
              first_name,
              last_name,
              updated_at: new Date().toISOString()
            }
          });
        });
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Microservice-compatible password change endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    // Validation
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Find user
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Compare current password
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password
      db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, userId], function(err) {
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({ error: 'Error updating password' });
        }

        res.json({ message: 'Password changed successfully' });
      });
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile endpoint (protected)
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });
  });
});

// Update profile endpoint (protected)
app.put('/api/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const userId = req.user.userId;
    const { name, email } = req.body;

    // Check if email is being updated and if it's already taken by another user
    if (email) {
      db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
          });
        }

        if (row) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email already taken by another user' 
          });
        }

        // Proceed with update
        updateProfile();
      });
    } else {
      // No email update, proceed directly
      updateProfile();
    }

    function updateProfile() {
      // Build update query dynamically
      let updateFields = [];
      let updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }

      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No fields to update' 
        });
      }

      updateValues.push(userId);
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(sql, updateValues, function(err) {
        if (err) {
          console.error('Error updating profile:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error updating profile' 
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }

        // Get updated user data
        db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error retrieving updated profile' 
            });
          }

          // Generate new token if email was updated
          let newToken = null;
          if (email !== undefined) {
            newToken = jwt.sign(
              { userId: user.id, email: user.email },
              JWT_SECRET,
              { expiresIn: '24h' }
            );
          }

          res.json({
            success: true,
            message: 'Profile updated successfully',
            token: newToken, // Only included if email was updated
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              created_at: user.created_at
            }
          });
        });
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Change password endpoint (protected)
app.put('/api/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Get current user data
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Verify current password
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], function(err) {
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error updating password' 
          });
        }

        res.json({
          success: true,
          message: 'Password changed successfully'
        });
      });
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
}); 
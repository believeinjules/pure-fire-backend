import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../middleware/adminAuth.js';
import db from '../database/init.js';

export const adminAuthController = {
  // Admin login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = User.findByEmail(email);

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = User.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      User.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(user.id, refreshToken, expiresAt.toISOString());

      // Remove sensitive data
      delete user.password_hash;

      res.json({
        user,
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Verify refresh token
      const decoded = verifyToken(refreshToken);

      if (!decoded || decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check if refresh token exists in database
      const tokenRecord = db.prepare(`
        SELECT * FROM refresh_tokens
        WHERE token = ? AND expires_at > datetime('now')
      `).get(refreshToken);

      if (!tokenRecord) {
        return res.status(401).json({ error: 'Refresh token expired or invalid' });
      }

      // Get user
      const user = User.findById(decoded.id);

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);

      res.json({
        accessToken: newAccessToken,
        expiresIn: 900
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  },

  // Logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Remove refresh token from database
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  // Get current user info
  async me(req, res) {
    try {
      const user = User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      const user = User.findByEmail(req.user.email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = User.verifyPassword(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      User.updatePassword(user.id, newPassword);

      // Invalidate all refresh tokens for this user
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);

      res.json({ message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
};


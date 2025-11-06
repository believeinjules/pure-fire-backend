import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

export const adminAuditController = {
  // Get audit logs with filtering
  async getLogs(req, res) {
    try {
      const { limit = 100, offset = 0, userId, entityType, startDate, endDate } = req.query;

      const logs = AuditLog.findAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userId ? parseInt(userId) : undefined,
        entityType,
        startDate,
        endDate
      });

      res.json({
        logs,
        count: logs.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  },

  // Get logs for a specific entity
  async getEntityLogs(req, res) {
    try {
      const { entityType, entityId } = req.params;

      const logs = AuditLog.findByEntity(entityType, entityId);

      res.json({
        logs,
        count: logs.length,
        entityType,
        entityId
      });
    } catch (error) {
      console.error('Get entity logs error:', error);
      res.status(500).json({ error: 'Failed to fetch entity logs' });
    }
  },

  // Get audit statistics
  async getStats(req, res) {
    try {
      const stats = AuditLog.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Get audit stats error:', error);
      res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
  }
};

export const adminUserController = {
  // Get all users
  async getAll(req, res) {
    try {
      const users = User.findAll();
      res.json({ users, count: users.length });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Create new user
  async create(req, res) {
    try {
      const { email, password, fullName, role = 'content_editor' } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      if (!['admin', 'content_editor'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin or content_editor' });
      }

      const existingUser = User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const newUser = User.create({ email, password, fullName, role });

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

  // Update user role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'content_editor'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Prevent user from changing their own role
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      User.updateRole(id, role);

      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  },

  // Toggle user active status
  async toggleActive(req, res) {
    try {
      const { id } = req.params;

      // Prevent user from deactivating themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      User.toggleActive(id);

      res.json({ message: 'User status toggled successfully' });
    } catch (error) {
      console.error('Toggle active error:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  },

  // Delete user
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Prevent user from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      User.delete(id);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
};


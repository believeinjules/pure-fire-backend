import { APIKey } from '../models/APIKey.js';
import { logManual } from '../middleware/auditLog.js';

export const apiKeyController = {
  // Create new API key (admin only)
  async create(req, res) {
    try {
      const { name, permissions, expiresInDays } = req.body;

      if (!name || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ 
          error: 'Name and permissions array are required' 
        });
      }

      // Validate permissions
      const validPermissions = ['ai:train', 'ai:query', 'products:read', '*'];
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPerms.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid permissions',
          invalid: invalidPerms,
          valid: validPermissions
        });
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expiresInDays) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expiresInDays);
        expiresAt = expDate.toISOString();
      }

      const apiKey = APIKey.create({
        name,
        permissions,
        createdBy: req.user.id,
        expiresAt
      });

      // Log the creation
      logManual(req, {
        action: 'CREATE_API_KEY',
        entityType: 'api_key',
        entityId: String(apiKey.id),
        changes: { name, permissions, expiresAt }
      });

      res.status(201).json({
        message: 'API key created successfully. Save this key securely - it will not be shown again.',
        apiKey: {
          id: apiKey.id,
          key: apiKey.key, // Only shown once!
          name: apiKey.name,
          permissions: apiKey.permissions,
          expires_at: apiKey.expires_at
        }
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  },

  // Get all API keys
  async getAll(req, res) {
    try {
      const keys = APIKey.findAll();
      res.json({ apiKeys: keys, count: keys.length });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  },

  // Revoke API key
  async revoke(req, res) {
    try {
      const { id } = req.params;

      APIKey.revoke(id);

      // Log the revocation
      logManual(req, {
        action: 'REVOKE_API_KEY',
        entityType: 'api_key',
        entityId: id,
        changes: { revoked: true }
      });

      res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error('Revoke API key error:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  },

  // Delete API key
  async delete(req, res) {
    try {
      const { id } = req.params;

      APIKey.delete(id);

      // Log the deletion
      logManual(req, {
        action: 'DELETE_API_KEY',
        entityType: 'api_key',
        entityId: id,
        changes: { deleted: true }
      });

      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }
};


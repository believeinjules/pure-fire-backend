import db from '../database/init.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class APIKey {
  /**
   * Generate a secure API key
   */
  static generateKey() {
    return 'pfn_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new API key
   */
  static create({ name, permissions, createdBy, expiresAt }) {
    const key = this.generateKey();
    const keyHash = bcrypt.hashSync(key, 10);

    const stmt = db.prepare(`
      INSERT INTO api_keys (key_hash, name, permissions, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const permissionsJson = JSON.stringify(permissions);
    const result = stmt.run(keyHash, name, permissionsJson, createdBy, expiresAt);

    return {
      id: result.lastInsertRowid,
      key, // Return the plain key only once
      name,
      permissions,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };
  }

  /**
   * Verify an API key
   */
  static verify(key) {
    const keys = db.prepare('SELECT * FROM api_keys WHERE is_active = 1').all();

    for (const apiKey of keys) {
      if (bcrypt.compareSync(key, apiKey.key_hash)) {
        // Check if expired
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
          return null;
        }

        // Update last used
        db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey.id);

        return {
          id: apiKey.id,
          name: apiKey.name,
          permissions: JSON.parse(apiKey.permissions)
        };
      }
    }

    return null;
  }

  /**
   * Get all API keys (without the actual keys)
   */
  static findAll() {
    const stmt = db.prepare(`
      SELECT id, name, permissions, is_active, created_by, created_at, last_used, expires_at
      FROM api_keys
      ORDER BY created_at DESC
    `);

    return stmt.all().map(key => ({
      ...key,
      permissions: JSON.parse(key.permissions)
    }));
  }

  /**
   * Revoke an API key
   */
  static revoke(id) {
    const stmt = db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Delete an API key
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
    stmt.run(id);
  }
}


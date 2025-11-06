import db from '../database/init.js';

export class AuditLog {
  static create({ userId, userEmail, action, entityType, entityId, changes, ipAddress, userAgent }) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, changes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const changesJson = typeof changes === 'string' ? changes : JSON.stringify(changes);
    
    const result = stmt.run(
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      changesJson,
      ipAddress,
      userAgent
    );

    return result.lastInsertRowid;
  }

  static findAll({ limit = 100, offset = 0, userId, entityType, startDate, endDate } = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static findByEntity(entityType, entityId) {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(entityType, entityId);
  }

  static getStats() {
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
    
    const recentActivity = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY action
    `).all();

    const topUsers = db.prepare(`
      SELECT user_email, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY user_email
      ORDER BY count DESC
      LIMIT 10
    `).all();

    return {
      totalLogs,
      recentActivity,
      topUsers
    };
  }
}


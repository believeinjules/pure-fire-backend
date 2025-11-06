import { AuditLog } from '../models/AuditLog.js';

/**
 * Middleware to automatically log admin actions
 */
export function logAction(action, entityType) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = req.params.id || req.body.id || data.id || 'unknown';
          
          AuditLog.create({
            userId: req.user.id,
            userEmail: req.user.email,
            action,
            entityType,
            entityId: String(entityId),
            changes: {
              body: req.body,
              params: req.params,
              query: req.query
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          console.error('Failed to log audit entry:', error);
        }
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

/**
 * Manually log an action (for use in controllers)
 */
export function logManual(req, { action, entityType, entityId, changes }) {
  try {
    AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      action,
      entityType,
      entityId: String(entityId),
      changes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}


import { APIKey } from '../models/APIKey.js';
import rateLimit from 'express-rate-limit';

/**
 * Middleware to verify API key
 */
export function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyData = APIKey.verify(apiKey);

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.apiKey = keyData;
  next();
}

/**
 * Middleware to check if API key has specific permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('*')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        granted: req.apiKey.permissions
      });
    }

    next();
  };
}

/**
 * Strict rate limiter for AI training endpoints
 */
export const aiTrainingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each API key to 100 requests per hour
  message: 'Too many requests from this API key, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key as the rate limit key
    return req.headers['x-api-key'] || req.ip;
  }
});

/**
 * Extra strict rate limiter for sensitive operations
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per 15 minutes
  message: 'Rate limit exceeded for sensitive operations.',
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});


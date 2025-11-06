import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-immediately';
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to verify JWT token for admin routes
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check if user still exists and is active
  const user = User.findById(decoded.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  req.user = decoded;
  next();
}

// Middleware to check if user has admin role
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      requiredRole: 'admin',
      currentRole: req.user.role
    });
  }
  next();
}

// Middleware to check if user can edit products (admin or content_editor)
export function canEditProducts(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'content_editor') {
    return res.status(403).json({ error: 'Insufficient permissions to edit products' });
  }
  next();
}

// Middleware to check if user can edit prices (admin only)
export function canEditPrices(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Only administrators can edit prices',
      requiredRole: 'admin',
      currentRole: req.user.role
    });
  }
  next();
}


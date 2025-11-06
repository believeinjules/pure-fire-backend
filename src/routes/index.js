import express from 'express';
import { signup, login, logout, getProfile } from '../controllers/authController.js';
import { createOrder, getOrders, getOrder, updateOrderStatus } from '../controllers/ordersController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import adminRoutes from './admin.js';
import aiRoutes from './ai.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/profile', authenticate, getProfile);

// Order routes
router.post('/orders', optionalAuth, createOrder);
router.get('/orders', authenticate, getOrders);
router.get('/orders/:orderNumber', optionalAuth, getOrder);
router.patch('/orders/:orderNumber/status', updateOrderStatus);

// Admin routes
router.use('/admin', adminRoutes);

// AI training routes (requires API key)
router.use('/ai', aiRoutes);

export default router;


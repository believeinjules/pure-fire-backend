import express from 'express';
import { adminAuthController } from '../controllers/adminAuthController.js';
import { adminProductController } from '../controllers/adminProductController.js';
import { bulkUploadController } from '../controllers/bulkUploadController.js';
import { adminAuditController, adminUserController } from '../controllers/adminAuditController.js';
import { apiKeyController } from '../controllers/apiKeyController.js';
import { authenticateAdmin, requireAdmin, canEditProducts, canEditPrices } from '../middleware/adminAuth.js';
import { logAction } from '../middleware/auditLog.js';

const router = express.Router();

// ===== Authentication Routes (no auth required) =====
router.post('/auth/login', adminAuthController.login);
router.post('/auth/refresh', adminAuthController.refreshToken);
router.post('/auth/logout', adminAuthController.logout);

// ===== Protected Routes (require authentication) =====

// Current user
router.get('/auth/me', authenticateAdmin, adminAuthController.me);
router.post('/auth/change-password', authenticateAdmin, adminAuthController.changePassword);

// Product Management
router.get('/products', authenticateAdmin, canEditProducts, adminProductController.getAll);
router.get('/products/:id', authenticateAdmin, canEditProducts, adminProductController.getOne);

// Product updates (content editors can edit descriptions, admins can edit everything)
router.put('/products/:id', authenticateAdmin, canEditProducts, logAction('UPDATE_PRODUCT', 'product'), adminProductController.update);

// Price updates (admin only)
router.patch('/products/:id/price', authenticateAdmin, canEditPrices, logAction('UPDATE_PRICE', 'product'), adminProductController.updatePrice);

// Stock updates (both roles)
router.patch('/products/:id/stock', authenticateAdmin, canEditProducts, logAction('UPDATE_STOCK', 'product'), adminProductController.updateStock);

// Create/delete products (admin only)
router.post('/products', authenticateAdmin, requireAdmin, logAction('CREATE_PRODUCT', 'product'), adminProductController.create);
router.delete('/products/:id', authenticateAdmin, requireAdmin, logAction('DELETE_PRODUCT', 'product'), adminProductController.delete);

// Bulk Upload (admin only)
router.post('/bulk/preview', authenticateAdmin, canEditPrices, bulkUploadController.preview);
router.post('/bulk/apply', authenticateAdmin, canEditPrices, bulkUploadController.apply);
router.get('/bulk/template', authenticateAdmin, bulkUploadController.template);
router.get('/bulk/export', authenticateAdmin, bulkUploadController.export);

// Audit Logs (admin only)
router.get('/audit/logs', authenticateAdmin, requireAdmin, adminAuditController.getLogs);
router.get('/audit/logs/:entityType/:entityId', authenticateAdmin, requireAdmin, adminAuditController.getEntityLogs);
router.get('/audit/stats', authenticateAdmin, requireAdmin, adminAuditController.getStats);

// User Management (admin only)
router.get('/users', authenticateAdmin, requireAdmin, adminUserController.getAll);
router.post('/users', authenticateAdmin, requireAdmin, adminUserController.create);
router.patch('/users/:id/role', authenticateAdmin, requireAdmin, adminUserController.updateRole);
router.patch('/users/:id/toggle-active', authenticateAdmin, requireAdmin, adminUserController.toggleActive);
router.delete('/users/:id', authenticateAdmin, requireAdmin, adminUserController.delete);

// API Key Management (admin only)
router.get('/api-keys', authenticateAdmin, requireAdmin, apiKeyController.getAll);
router.post('/api-keys', authenticateAdmin, requireAdmin, apiKeyController.create);
router.patch('/api-keys/:id/revoke', authenticateAdmin, requireAdmin, apiKeyController.revoke);
router.delete('/api-keys/:id', authenticateAdmin, requireAdmin, apiKeyController.delete);

export default router;


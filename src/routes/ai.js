import express from 'express';
import { verifyAPIKey, requirePermission, aiTrainingRateLimiter, sensitiveOperationLimiter } from '../middleware/apiKeyAuth.js';
import { Product } from '../models/Product.js';

const router = express.Router();

// All AI routes require API key authentication
router.use(verifyAPIKey);

/**
 * Get products for AI training
 * Requires: ai:train or ai:query or products:read permission
 */
router.get(
  '/training/products',
  aiTrainingRateLimiter,
  requirePermission('products:read'),
  async (req, res) => {
    try {
      const products = Product.findAll();
      
      // Return structured data for AI training
      const trainingData = products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        type: p.product_type,
        dosages: p.dosageOptions.map(d => ({
          size: d.size,
          capsules: d.capsules,
          price_usd: d.price_usd,
          price_eur: d.price_eur
        })),
        in_stock: p.in_stock
      }));

      res.json({
        products: trainingData,
        count: trainingData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI training products error:', error);
      res.status(500).json({ error: 'Failed to fetch training data' });
    }
  }
);

/**
 * Query product information for AI assistant
 * Requires: ai:query permission
 */
router.post(
  '/query/product',
  aiTrainingRateLimiter,
  requirePermission('ai:query'),
  async (req, res) => {
    try {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID required' });
      }

      const product = Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ product });
    } catch (error) {
      console.error('AI query error:', error);
      res.status(500).json({ error: 'Query failed' });
    }
  }
);

/**
 * Batch query products for AI
 * Requires: ai:query permission
 * Extra rate limiting for batch operations
 */
router.post(
  '/query/batch',
  sensitiveOperationLimiter,
  requirePermission('ai:query'),
  async (req, res) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Product IDs array required' });
      }

      if (productIds.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 products per batch request' });
      }

      const products = productIds
        .map(id => Product.findById(id))
        .filter(p => p !== null);

      res.json({
        products,
        requested: productIds.length,
        found: products.length
      });
    } catch (error) {
      console.error('AI batch query error:', error);
      res.status(500).json({ error: 'Batch query failed' });
    }
  }
);

/**
 * Health check for AI services
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Training API',
    timestamp: new Date().toISOString(),
    apiKey: req.apiKey.name
  });
});

export default router;


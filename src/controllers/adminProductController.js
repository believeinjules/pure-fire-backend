import { Product } from '../models/Product.js';
import { logManual } from '../middleware/auditLog.js';

export const adminProductController = {
  // Get all products
  async getAll(req, res) {
    try {
      const products = Product.findAll();
      res.json({ products, count: products.length });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  },

  // Get single product
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const product = Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ product });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  },

  // Update product price (admin only)
  async updatePrice(req, res) {
    try {
      const { id } = req.params;
      const { dosageIndex = 0, priceUSD, priceEUR } = req.body;

      if (priceUSD === undefined && priceEUR === undefined) {
        return res.status(400).json({ error: 'At least one price (USD or EUR) is required' });
      }

      const oldProduct = Product.findById(id);
      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = Product.updatePrice(
        id,
        dosageIndex,
        priceUSD !== undefined ? priceUSD : oldProduct.dosageOptions[dosageIndex].price_usd,
        priceEUR !== undefined ? priceEUR : oldProduct.dosageOptions[dosageIndex].price_eur
      );

      // Log the change
      logManual(req, {
        action: 'UPDATE_PRICE',
        entityType: 'product',
        entityId: id,
        changes: {
          old: oldProduct.dosageOptions[dosageIndex],
          new: updatedProduct.dosageOptions[dosageIndex]
        }
      });

      res.json({ 
        message: 'Price updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update price error:', error);
      res.status(500).json({ error: error.message || 'Failed to update price' });
    }
  },

  // Update product stock status
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { inStock } = req.body;

      if (inStock === undefined) {
        return res.status(400).json({ error: 'inStock field is required' });
      }

      const oldProduct = Product.findById(id);
      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = Product.updateStock(id, inStock);

      // Log the change
      logManual(req, {
        action: 'UPDATE_STOCK',
        entityType: 'product',
        entityId: id,
        changes: {
          old: { in_stock: oldProduct.in_stock },
          new: { in_stock: updatedProduct.in_stock }
        }
      });

      res.json({ 
        message: 'Stock status updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({ error: 'Failed to update stock status' });
    }
  },

  // Update product details (description, image, etc.)
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const oldProduct = Product.findById(id);
      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = Product.update(id, updates);

      // Log the change
      logManual(req, {
        action: 'UPDATE_PRODUCT',
        entityType: 'product',
        entityId: id,
        changes: {
          fields: Object.keys(updates),
          updates
        }
      });

      res.json({ 
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  },

  // Create new product
  async create(req, res) {
    try {
      const productData = req.body;

      // Validate required fields
      if (!productData.id || !productData.name || !productData.category || !productData.productType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Set default disclaimer based on product type
      if (!productData.disclaimer) {
        if (productData.productType === 'research') {
          productData.disclaimer = 'This product is for laboratory research use only. Not for human or veterinary consumption. This product is not a drug, supplement, or cosmetic and has not been evaluated by the FDA.';
        } else {
          productData.disclaimer = '*These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.';
        }
      }

      const newProduct = Product.create(productData);

      // Log the creation
      logManual(req, {
        action: 'CREATE_PRODUCT',
        entityType: 'product',
        entityId: newProduct.id,
        changes: { product: newProduct }
      });

      res.status(201).json({ 
        message: 'Product created successfully',
        product: newProduct
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: error.message || 'Failed to create product' });
    }
  },

  // Delete product
  async delete(req, res) {
    try {
      const { id } = req.params;

      const product = Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      Product.delete(id);

      // Log the deletion
      logManual(req, {
        action: 'DELETE_PRODUCT',
        entityType: 'product',
        entityId: id,
        changes: { deletedProduct: product }
      });

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
};


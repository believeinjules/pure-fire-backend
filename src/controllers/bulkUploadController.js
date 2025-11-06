import { Product } from '../models/Product.js';
import { logManual } from '../middleware/auditLog.js';

/**
 * Parse CSV content into array of objects
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }

  return data;
}

/**
 * Validate CSV data format
 */
function validateCSVData(data) {
  const errors = [];
  const validProducts = [];

  data.forEach((row, index) => {
    const lineNum = index + 2; // +2 because index 0 is line 2 (after header)

    if (!row.id) {
      errors.push(`Line ${lineNum}: Missing product ID`);
      return;
    }

    const update = { id: row.id };

    // Validate price_usd
    if (row.price_usd !== undefined && row.price_usd !== '') {
      const priceUSD = parseFloat(row.price_usd);
      if (isNaN(priceUSD) || priceUSD < 0) {
        errors.push(`Line ${lineNum}: Invalid price_usd "${row.price_usd}"`);
      } else {
        update.price_usd = priceUSD;
      }
    }

    // Validate price_eur
    if (row.price_eur !== undefined && row.price_eur !== '') {
      const priceEUR = parseFloat(row.price_eur);
      if (isNaN(priceEUR) || priceEUR < 0) {
        errors.push(`Line ${lineNum}: Invalid price_eur "${row.price_eur}"`);
      } else {
        update.price_eur = priceEUR;
      }
    }

    // Validate in_stock
    if (row.in_stock !== undefined && row.in_stock !== '') {
      const inStockStr = row.in_stock.toLowerCase();
      if (inStockStr === 'true' || inStockStr === '1' || inStockStr === 'yes') {
        update.in_stock = true;
      } else if (inStockStr === 'false' || inStockStr === '0' || inStockStr === 'no') {
        update.in_stock = false;
      } else {
        errors.push(`Line ${lineNum}: Invalid in_stock value "${row.in_stock}". Use true/false, 1/0, or yes/no`);
      }
    }

    // Check if product exists
    const product = Product.findById(row.id);
    if (!product) {
      errors.push(`Line ${lineNum}: Product "${row.id}" not found`);
      return;
    }

    if (Object.keys(update).length > 1) { // More than just 'id'
      validProducts.push(update);
    }
  });

  return { validProducts, errors };
}

export const bulkUploadController = {
  // Preview CSV upload
  async preview(req, res) {
    try {
      const { csvContent } = req.body;

      if (!csvContent) {
        return res.status(400).json({ error: 'CSV content is required' });
      }

      const data = parseCSV(csvContent);
      const { validProducts, errors } = validateCSVData(data);

      res.json({
        totalRows: data.length,
        validUpdates: validProducts.length,
        errors,
        preview: validProducts.slice(0, 10), // Show first 10 for preview
        hasErrors: errors.length > 0
      });
    } catch (error) {
      console.error('CSV preview error:', error);
      res.status(400).json({ error: error.message || 'Failed to parse CSV' });
    }
  },

  // Apply CSV upload
  async apply(req, res) {
    try {
      const { csvContent, force = false } = req.body;

      if (!csvContent) {
        return res.status(400).json({ error: 'CSV content is required' });
      }

      const data = parseCSV(csvContent);
      const { validProducts, errors } = validateCSVData(data);

      if (errors.length > 0 && !force) {
        return res.status(400).json({
          error: 'CSV contains errors. Set force=true to apply valid rows only.',
          errors,
          validUpdates: validProducts.length
        });
      }

      // Apply bulk updates
      Product.bulkUpdate(validProducts);

      // Log the bulk upload
      logManual(req, {
        action: 'BULK_UPLOAD',
        entityType: 'product',
        entityId: 'multiple',
        changes: {
          totalRows: data.length,
          appliedUpdates: validProducts.length,
          errors: errors.length,
          products: validProducts.map(p => p.id)
        }
      });

      res.json({
        message: 'Bulk upload completed successfully',
        totalRows: data.length,
        appliedUpdates: validProducts.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('CSV apply error:', error);
      res.status(500).json({ error: error.message || 'Failed to apply CSV updates' });
    }
  },

  // Download CSV template
  async template(req, res) {
    try {
      const csvTemplate = `id,price_usd,price_eur,in_stock
prime-peptide-protect,49.99,46.99,true
prime-peptide-brain,49.99,46.99,true
# Add more products...
# in_stock values: true/false, 1/0, yes/no
# Leave price fields empty to keep current prices`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="product_update_template.csv"');
      res.send(csvTemplate);
    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  },

  // Export current products to CSV
  async export(req, res) {
    try {
      const products = Product.findAll();
      
      let csv = 'id,name,category,product_type,price_usd,price_eur,in_stock\n';
      
      products.forEach(product => {
        const firstDosage = product.dosageOptions[0] || {};
        csv += `${product.id},"${product.name}",${product.category},${product.product_type},${firstDosage.price_usd || ''},${firstDosage.price_eur || ''},${product.in_stock ? 'true' : 'false'}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export products' });
    }
  }
};


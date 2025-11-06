import db from '../database/init.js';

export class Product {
  static findAll() {
    const products = db.prepare(`
      SELECT * FROM products ORDER BY name
    `).all();

    // Attach dosage options to each product
    products.forEach(product => {
      product.dosageOptions = this.getDosageOptions(product.id);
    });

    return products;
  }

  static findById(id) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (product) {
      product.dosageOptions = this.getDosageOptions(id);
    }
    return product;
  }

  static getDosageOptions(productId) {
    return db.prepare(`
      SELECT size, capsules, price_usd, price_eur
      FROM product_dosages
      WHERE product_id = ?
    `).all(productId);
  }

  static create(productData) {
    const { id, name, description, category, productType, disclaimer, image, supplementFacts, dosageOptions } = productData;

    const stmt = db.prepare(`
      INSERT INTO products (id, name, description, category, product_type, disclaimer, image, supplement_facts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description, category, productType, disclaimer, image, supplementFacts);

    // Insert dosage options
    if (dosageOptions && dosageOptions.length > 0) {
      const dosageStmt = db.prepare(`
        INSERT INTO product_dosages (product_id, size, capsules, price_usd, price_eur)
        VALUES (?, ?, ?, ?, ?)
      `);

      dosageOptions.forEach(option => {
        dosageStmt.run(id, option.size, option.capsules, option.price.USD, option.price.EUR);
      });
    }

    return this.findById(id);
  }

  static updatePrice(id, dosageIndex, priceUSD, priceEUR) {
    const dosages = this.getDosageOptions(id);
    if (dosageIndex >= dosages.length) {
      throw new Error('Invalid dosage index');
    }

    const dosage = dosages[dosageIndex];
    
    const stmt = db.prepare(`
      UPDATE product_dosages
      SET price_usd = ?, price_eur = ?
      WHERE product_id = ? AND size = ?
    `);

    stmt.run(priceUSD, priceEUR, id, dosage.size);

    // Update product timestamp
    db.prepare('UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return this.findById(id);
  }

  static updateStock(id, inStock) {
    const stmt = db.prepare(`
      UPDATE products
      SET in_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(inStock ? 1 : 0, id);
    return this.findById(id);
  }

  static update(id, updates) {
    const allowedFields = ['name', 'description', 'category', 'image', 'supplement_facts'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
  }

  static bulkUpdate(updates) {
    const transaction = db.transaction((items) => {
      items.forEach(item => {
        if (item.price_usd !== undefined || item.price_eur !== undefined) {
          // Update first dosage option price by default
          const dosages = this.getDosageOptions(item.id);
          if (dosages.length > 0) {
            const stmt = db.prepare(`
              UPDATE product_dosages
              SET price_usd = COALESCE(?, price_usd),
                  price_eur = COALESCE(?, price_eur)
              WHERE product_id = ? AND size = ?
            `);
            stmt.run(item.price_usd, item.price_eur, item.id, dosages[0].size);
          }
        }

        if (item.in_stock !== undefined) {
          this.updateStock(item.id, item.in_stock);
        }
      });
    });

    transaction(updates);
  }
}


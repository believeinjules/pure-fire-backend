import db from '../models/database.js';
import { generateOrderNumber } from '../utils/auth.js';

/**
 * Create a new order
 */
export const createOrder = (req, res) => {
  try {
    const { items, subtotal, shipping, tax, total, currency, shippingAddress, notes } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!subtotal || !total) {
      return res.status(400).json({ error: 'Missing price information' });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Start transaction
    const insertOrder = db.transaction((orderData, orderItems, addressData) => {
      // Insert shipping address if provided
      let addressId = null;
      if (addressData && req.userId) {
        const addressResult = db.prepare(`
          INSERT INTO addresses (user_id, address_line1, address_line2, city, state, postal_code, country)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.userId,
          addressData.address_line1,
          addressData.address_line2 || null,
          addressData.city,
          addressData.state || null,
          addressData.postal_code,
          addressData.country
        );
        addressId = addressResult.lastInsertRowid;
      }

      // Insert order
      const orderResult = db.prepare(`
        INSERT INTO orders (
          user_id, order_number, status,
          subtotal_usd, subtotal_eur,
          shipping_usd, shipping_eur,
          tax_usd, tax_eur,
          total_usd, total_eur,
          currency, shipping_address_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.userId || null,
        orderData.orderNumber,
        'pending',
        orderData.subtotal.USD || 0,
        orderData.subtotal.EUR || 0,
        orderData.shipping.USD || 0,
        orderData.shipping.EUR || 0,
        orderData.tax.USD || 0,
        orderData.tax.EUR || 0,
        orderData.total.USD,
        orderData.total.EUR,
        orderData.currency,
        addressId,
        orderData.notes || null
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, dosage, quantity, price_usd, price_eur)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of orderItems) {
        insertItem.run(
          orderId,
          item.id,
          item.name,
          item.dosage,
          item.quantity,
          item.price.USD,
          item.price.EUR
        );
      }

      return { orderId, orderNumber: orderData.orderNumber };
    });

    const result = insertOrder(
      {
        orderNumber,
        subtotal,
        shipping,
        tax,
        total,
        currency,
        notes
      },
      items,
      shippingAddress
    );

    res.status(201).json({
      message: 'Order created successfully',
      orderId: result.orderId,
      orderNumber: result.orderNumber
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

/**
 * Get user's order history
 */
export const getOrders = (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orders = db.prepare(`
      SELECT 
        o.*,
        a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(req.userId);

    // Get items for each order
    const ordersWithItems = orders.map(order => {
      const items = db.prepare(`
        SELECT * FROM order_items WHERE order_id = ?
      `).all(order.id);

      return { ...order, items };
    });

    res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

/**
 * Get a specific order
 */
export const getOrder = (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = db.prepare(`
      SELECT 
        o.*,
        a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE o.order_number = ?
    `).get(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    if (req.userId && order.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items
    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all(order.id);

    res.json({ order: { ...order, items } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

/**
 * Update order status (admin only - simplified for now)
 */
export const updateOrderStatus = (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, paymentIntentId, paymentStatus } = req.body;

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (paymentIntentId) {
      updates.push('payment_intent_id = ?');
      values.push(paymentIntentId);
    }

    if (paymentStatus) {
      updates.push('payment_status = ?');
      values.push(paymentStatus);
    }

    updates.push('updated_at = datetime("now")');
    values.push(orderNumber);

    db.prepare(`
      UPDATE orders 
      SET ${updates.join(', ')}
      WHERE order_number = ?
    `).run(...values);

    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};


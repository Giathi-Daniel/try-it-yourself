import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { HttpError } from './errors.js';

// Only whole, positive numbers get through.
const orderSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(100),
});

export const ordersRouter = Router();

ordersRouter.post('/orders', requireAuth, async (req, res) => {
  const { productId, qty } = orderSchema.parse(req.body);
  const order = await placeOrder(req.user.id, productId, qty);
  res.status(201).json(order);
});

// All or nothing: a transaction, with ? placeholders
// so user input is never part of the SQL text.
async function placeOrder(userId, productId, qty) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[product]] = await conn.query(
      'SELECT id, price_cents FROM products WHERE id = ?',
      [productId],
    );
    if (!product) throw new HttpError(404, 'Product not found');

    const total = product.price_cents * qty;   // money in cents

    // check and take the money in one atomic step
    const [paid] = await conn.query(
      `UPDATE users SET balance_cents = balance_cents - ?
       WHERE id = ? AND balance_cents >= ?`,
      [total, userId, total],
    );
    if (paid.affectedRows === 0) {
      throw new HttpError(402, 'Not enough balance');
    }

    const [result] = await conn.query(
      `INSERT INTO orders (user_id, product_id, qty, total_cents)
       VALUES (?, ?, ?, ?)`,
      [userId, productId, qty, total],
    );
    await conn.commit();
    return { id: result.insertId, productId, qty, totalCents: total };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

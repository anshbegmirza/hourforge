const express = require('express');
const { pool } = require('../../config/db');
const { requireAuth } = require('../../middleware/requireAuth');
const { decodeId } = require('../../utils/publicId');
const { publicCustomer } = require('../../utils/publicModels');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM customers WHERE user_id = ? ORDER BY company_name',
      [req.user.id]
    );
    return res.json({ customers: rows.map(publicCustomer) });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const companyName = String(req.body?.companyName || '').trim();
    if (!companyName) {
      return res.status(400).json({ message: 'companyName is required.' });
    }

    const street = String(req.body?.street || '');
    const houseNumber = String(req.body?.houseNumber || '');
    const postalCode = Number(req.body?.postalCode) || 0;
    const city = String(req.body?.city || '');

    const [result] = await pool.query(
      `INSERT INTO customers
        (user_id, company_name, street, house_number, postal_code, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, companyName, street, houseNumber, postalCode, city]
    );
    const [rows] = await pool.query(
      'SELECT * FROM customers WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id]
    );
    return res.status(201).json({ customer: publicCustomer(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = decodeId(req.params.id);
    if (id == null) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const companyName = String(req.body?.companyName || '').trim();
    if (!companyName) {
      return res.status(400).json({ message: 'companyName is required.' });
    }

    const [result] = await pool.query(
      `UPDATE customers SET
        company_name = ?, street = ?, house_number = ?, postal_code = ?, city = ?
       WHERE id = ? AND user_id = ?`,
      [
        companyName,
        String(req.body?.street || ''),
        String(req.body?.houseNumber || ''),
        Number(req.body?.postalCode) || 0,
        String(req.body?.city || ''),
        id,
        req.user.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM customers WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    return res.json({ customer: publicCustomer(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = decodeId(req.params.id);
    if (id == null) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const [result] = await pool.query(
      'DELETE FROM customers WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM customers WHERE user_id = ?', [req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = { customersRouter: router };

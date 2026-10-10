const express = require('express');
const { pool } = require('../../config/db');
const { requireAuth } = require('../../middleware/requireAuth');
const { decodeId } = require('../../utils/publicId');
const { publicEmployee } = require('../../utils/publicModels');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE user_id = ? ORDER BY name',
      [req.user.id]
    );
    return res.json({ employees: rows.map(publicEmployee) });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'name is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO employees (user_id, name) VALUES (?, ?)',
      [req.user.id, name]
    );
    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id]
    );
    return res.status(201).json({ employee: publicEmployee(rows[0]) });
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

    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'name is required.' });
    }

    const [result] = await pool.query(
      'UPDATE employees SET name = ? WHERE id = ? AND user_id = ?',
      [name, id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    return res.json({ employee: publicEmployee(rows[0]) });
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
      'DELETE FROM employees WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM employees WHERE user_id = ?', [req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = { employeesRouter: router };

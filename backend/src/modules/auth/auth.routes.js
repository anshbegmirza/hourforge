const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../../config/db');
const { requireAuth } = require('../../middleware/requireAuth');
const { rateLimitLogin } = require('../../middleware/rateLimitLogin');
const { encodeId } = require('../../utils/publicId');
const { publicUser } = require('../../utils/publicModels');

const router = express.Router();
const loginLimiter = rateLimitLogin();

function signToken(userRow) {
  return jwt.sign(
    { user_id: encodeId(userRow.id) },
    process.env.JWT_SECRET || 'change-me-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

async function findByLogin(login) {
  const value = String(login || '').trim().toLowerCase();
  if (!value) return null;
  if (value.includes('@')) {
    return findByEmail(value);
  }
  return findByUsername(value);
}

async function findByGoogleId(googleId) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  );
  return rows[0] || null;
}

router.post('/register', loginLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');
    const preferredLang = ['en', 'de', 'fr'].includes(req.body?.preferredLang)
      ? req.body.preferredLang
      : null;

    if (!name || !email.includes('@') || password.length < 6) {
      return res.status(400).json({
        message: 'Name, valid email, and password (min 6 chars) are required.',
        code: 'VALIDATION',
      });
    }

    if (username && username.length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters.',
        code: 'VALIDATION',
      });
    }

    if (await findByEmail(email)) {
      return res.status(409).json({ message: 'Email already registered.', code: 'DUPLICATE' });
    }
    if (username && (await findByUsername(username))) {
      return res.status(409).json({ message: 'Username already taken.', code: 'DUPLICATE' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (email, username, password_hash, name, preferred_lang)
       VALUES (?, ?, ?, ?, ?)`,
      [email, username || null, hash, name, preferredLang]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];

    return res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or username already registered.', code: 'DUPLICATE' });
    }
    return next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const login = String(
      req.body?.login ?? req.body?.email ?? req.body?.username ?? ''
    ).trim();
    const password = String(req.body?.password || '');

    if (!login || !password) {
      return res.status(400).json({
        message: 'Email or username, and password are required.',
      });
    }

    const user = await findByLogin(login);
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Incorrect login or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Incorrect login or password.' });
    }

    return res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const mode = process.env.APP_MODE === 'prod' ? 'prod' : 'test';

    let email = '';
    let name = '';
    let googleId = null;

    const idToken = req.body?.id_token ?? req.body?.idToken;
    if (idToken && clientId) {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: String(idToken),
        audience: clientId,
      });
      const payload = ticket.getPayload();
      email = String(payload.email || '').toLowerCase();
      name = String(payload.name || payload.email || 'Google User');
      googleId = payload.sub || null;
    } else if (mode === 'test') {
      email = String(req.body?.email || '').trim().toLowerCase();
      name = String(req.body?.name || 'Google User').trim();
      googleId = email ? `test:${email}` : null;
    } else {
      return res.status(503).json({ message: 'Google sign-in is not configured.' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'A valid Google account email is required.' });
    }

    let user = googleId ? await findByGoogleId(googleId) : null;
    if (!user) {
      user = await findByEmail(email);
    }

    if (!user) {
      const [result] = await pool.query(
        `INSERT INTO users (email, password_hash, name, google_id)
         VALUES (?, NULL, ?, ?)`,
        [email, name, googleId]
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = rows[0];
    } else if (googleId && !user.google_id) {
      await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
      user.google_id = googleId;
    }

    return res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const preferredLang = req.body?.preferredLang;
    if (preferredLang != null && !['en', 'de', 'fr'].includes(preferredLang)) {
      return res.status(400).json({ message: 'preferredLang must be en, de, or fr.' });
    }

    const name = req.body?.name != null ? String(req.body.name).trim() : null;

    if (preferredLang != null) {
      await pool.query('UPDATE users SET preferred_lang = ? WHERE id = ?', [
        preferredLang,
        req.user.id,
      ]);
    }
    if (name) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = { authRouter: router };

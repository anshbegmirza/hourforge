function rateLimitLogin({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        message: 'Too many login attempts. Try again later.',
        code: 'RATE_LIMITED',
      });
    }
    return next();
  };
}

module.exports = { rateLimitLogin };

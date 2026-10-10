const jwt = require('jsonwebtoken');
const { decodeId } = require('../utils/publicId');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required.', code: 'UNAUTHORIZED' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
    const userId = decodeId(payload.user_id ?? payload.userId);

    if (userId == null) {
      return res.status(401).json({ message: 'Invalid or expired token.', code: 'UNAUTHORIZED' });
    }

    req.user = { id: userId };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.', code: 'UNAUTHORIZED' });
  }
}

module.exports = { requireAuth };

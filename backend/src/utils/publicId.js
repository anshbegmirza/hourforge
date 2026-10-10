const Hashids = require('hashids/cjs');

const hashids = new Hashids(
  process.env.HASHIDS_SALT || 'hourforge-public-id-salt',
  10
);

function encodeId(id) {
  if (id === null || id === undefined) {
    return null;
  }
  return hashids.encode(Number(id));
}

function decodeId(publicId) {
  if (!publicId && publicId !== 0) {
    return null;
  }
  if (typeof publicId === 'number') {
    return publicId;
  }
  const decoded = hashids.decode(String(publicId));
  if (!decoded.length) {
    return null;
  }
  return decoded[0];
}

module.exports = { encodeId, decodeId };

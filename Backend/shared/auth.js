import crypto from 'node:crypto';
import { ForbiddenError } from './errors.js';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireInternalKey(expectedKey = () => process.env.INTERNAL_KEY) {
  return (req, _res, next) => {
    const key = typeof expectedKey === 'function' ? expectedKey() : expectedKey;
    const provided = req.get('x-internal-key');
    if (!key || !safeEqual(provided, key)) {
      return next(new ForbiddenError('Invalid or missing internal key'));
    }
    return next();
  };
}

export function requireDevToken(expectedToken = () => process.env.DEV_TOKEN) {
  return (req, _res, next) => {
    const token = typeof expectedToken === 'function' ? expectedToken() : expectedToken;
    const provided = req.get('x-dev-token');
    if (!token || !safeEqual(provided, token)) {
      return next(new ForbiddenError('Invalid or missing dev token'));
    }
    return next();
  };
}

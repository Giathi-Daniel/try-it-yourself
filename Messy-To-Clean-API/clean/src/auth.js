import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { HttpError } from './errors.js';

// Who is calling? Read it from a signed token, not the body.
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing token');
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    });
    req.user = { id: Number(payload.sub) };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  next();
}

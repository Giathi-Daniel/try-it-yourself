import { ZodError } from 'zod';

// An error that already knows its HTTP status.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// One place turns every error into a safe JSON response.
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid input',
      details: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);   // the details stay in your logs
  res.status(500).json({ error: 'Something went wrong' });
}

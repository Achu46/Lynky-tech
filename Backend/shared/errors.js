import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code, message, details = {}) {
    super(409, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request input',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      });
    }

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
        ...err.details
      });
    }

    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'INVALID_JSON',
        message: 'Malformed JSON body'
      });
    }

    logger?.error('Unhandled error', {
      path: req.path,
      method: req.method,
      error: err?.message || String(err)
    });

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  };
}

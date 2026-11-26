import { ValidationError } from './errors.js';

export function parseWithSchema(schema, value, label = 'input') {
  const res = schema.safeParse(value);
  if (!res.success) {
    throw new ValidationError(`Invalid ${label}`, {
      issues: res.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    });
  }
  return res.data;
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

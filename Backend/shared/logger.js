const SECRET_KEYS = new Set([
  'authorization',
  'x-internal-key',
  'x-dev-token',
  'gemini_api_key',
  'internal_key',
  'dev_token',
  'database_url',
  'apikey',
  'api_key',
  'token',
  'password',
  'secret'
]);

function redactString(str) {
  let out = str;
  const secrets = [
    process.env.GEMINI_API_KEY,
    process.env.INTERNAL_KEY,
    process.env.DEV_TOKEN,
    process.env.DATABASE_URL
  ].filter((v) => v && v.length > 3);

  for (const s of secrets) {
    out = out.split(s).join('[REDACTED]');
  }
  out = out.replace(/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi, 'postgres://[REDACTED]@');
  out = out.replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]');
  return out;
}

export function redact(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

export function createLogger(serviceName) {
  const write = (level, message, meta) => {
    const entry = {
      ts: new Date().toISOString(),
      level,
      service: serviceName,
      msg: redactString(String(message))
    };
    if (meta && Object.keys(meta).length > 0) {
      entry.meta = redact(meta);
    }
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
    debug: (msg, meta) => {
      if (process.env.LOG_LEVEL === 'debug') write('debug', msg, meta);
    }
  };
}

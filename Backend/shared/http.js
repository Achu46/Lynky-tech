import { AppError } from './errors.js';

export async function serviceFetch(baseUrl, path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    internalKey = process.env.INTERNAL_KEY,
    timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 10000)
  } = options;

  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const reqHeaders = {
    ...headers
  };

  if (internalKey) {
    reqHeaders['x-internal-key'] = internalKey;
  }

  let payload;
  if (body !== undefined) {
    reqHeaders['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: payload,
    signal: AbortSignal.timeout(timeoutMs)
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return { status: res.status, ok: res.ok, data };
}

export async function serviceFetchOrThrow(baseUrl, path, options = {}) {
  const result = await serviceFetch(baseUrl, path, options);
  if (!result.ok) {
    throw new AppError(
      result.status,
      result.data?.error || 'UPSTREAM_ERROR',
      result.data?.message || `Upstream request failed with status ${result.status}`,
      result.data || {}
    );
  }
  return result.data;
}

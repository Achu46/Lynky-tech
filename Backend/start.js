import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const catalogPort = process.env.CATALOG_PORT || '3001';
const orderPort = process.env.ORDER_PORT || '3002';
const assistantPort = process.env.ASSISTANT_PORT || '3003';
const gatewayPort = process.env.PORT || '3000';

const sharedEnv = {
  ...process.env,
  CATALOG_PORT: catalogPort,
  ORDER_PORT: orderPort,
  ASSISTANT_PORT: assistantPort,
  PORT: gatewayPort,
  CATALOG_URL: process.env.CATALOG_URL || `http://127.0.0.1:${catalogPort}`,
  ORDER_URL: process.env.ORDER_URL || `http://127.0.0.1:${orderPort}`,
  ASSISTANT_URL: process.env.ASSISTANT_URL || `http://127.0.0.1:${assistantPort}`
};

const children = [];
let shuttingDown = false;

function startProcess(name, scriptPath) {
  const child = spawn(process.execPath, [path.join(__dirname, scriptPath)], {
    env: sharedEnv,
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[start] ${name} exited unexpectedly (code=${code}, signal=${signal})`);
      shutdown(code || 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 500).unref();
}

async function waitForHealth(url, label, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${label} failed healthcheck at ${url}`);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  startProcess('catalog-service', 'services/catalog-service/src/index.js');
  startProcess('order-service', 'services/order-service/src/index.js');
  startProcess('assistant-service', 'services/assistant-service/src/index.js');

  await Promise.all([
    waitForHealth(sharedEnv.CATALOG_URL, 'catalog-service'),
    waitForHealth(sharedEnv.ORDER_URL, 'order-service'),
    waitForHealth(sharedEnv.ASSISTANT_URL, 'assistant-service')
  ]);

  startProcess('gateway', 'gateway/src/index.js');
}

main().catch((err) => {
  console.error('[start] Failed to start services:', err.message);
  shutdown(1);
});

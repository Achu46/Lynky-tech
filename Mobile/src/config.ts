/**
 * Single constant for the Pocket Operator backend base URL.
 * - Production / Railway: https://your-service.up.railway.app
 * - Android Emulator (local backend): http://10.0.2.2:3000
 * - Physical Android device on LAN: http://<your-lan-ip>:3000
 */
export const BACKEND_URL = 'https://lynky-tech-production.up.railway.app';

export const AGENT_TIMEOUT_MS = 35000;
export const DEFAULT_TIMEOUT_MS = 15000;

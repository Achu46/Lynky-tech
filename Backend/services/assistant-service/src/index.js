import 'dotenv/config';
import { createLogger, getPool } from '@pocket-operator/shared';
import { createAssistantApp } from './app.js';

const port = Number(process.env.ASSISTANT_PORT || 3003);
const logger = createLogger('assistant-service');
const app = createAssistantApp({ pool: getPool(), logger });

app.listen(port, () => {
  logger.info(`assistant-service listening on port ${port}`);
});

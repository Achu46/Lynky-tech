import 'dotenv/config';
import { createLogger } from '@pocket-operator/shared';
import { createGatewayApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const logger = createLogger('gateway');
const app = createGatewayApp({ logger });

app.listen(port, '0.0.0.0', () => {
  logger.info(`gateway listening on port ${port}`);
});

import 'dotenv/config';
import { createLogger, getPool } from '@pocket-operator/shared';
import { createOrderApp } from './app.js';

const port = Number(process.env.ORDER_PORT || 3002);
const logger = createLogger('order-service');
const app = createOrderApp({ pool: getPool(), logger });

app.listen(port, () => {
  logger.info(`order-service listening on port ${port}`);
});

import 'dotenv/config';
import { createLogger, getPool } from '@pocket-operator/shared';
import { createCatalogApp } from './app.js';

const port = Number(process.env.CATALOG_PORT || 3001);
const logger = createLogger('catalog-service');
const app = createCatalogApp({ pool: getPool(), logger });

app.listen(port, () => {
  logger.info(`catalog-service listening on port ${port}`);
});

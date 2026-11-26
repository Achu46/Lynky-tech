import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool, withTransaction } from '@pocket-operator/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CATALOG_PATH = path.join(__dirname, 'seed', 'catalog.json');

export async function seedCatalog(pool = getPool(), catalogPath = DEFAULT_CATALOG_PATH) {
  const raw = await fs.readFile(catalogPath, 'utf8');
  const data = JSON.parse(raw);

  await withTransaction(pool, async (client) => {
    await client.query('TRUNCATE TABLE dishes, restaurants');

    for (const r of data.restaurants) {
      await client.query(
        `INSERT INTO restaurants (id, name, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [r.id, r.name, r.latitude, r.longitude]
      );
    }

    for (const d of data.dishes) {
      await client.query(
        `INSERT INTO dishes (id, restaurant_id, name, is_vegetarian, price, is_available, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          d.id,
          d.restaurant_id,
          d.name,
          Boolean(d.is_vegetarian),
          d.price,
          d.is_available !== false,
          d.description ?? ''
        ]
      );
    }
  });

  return {
    restaurants: data.restaurants.length,
    dishes: data.dishes.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedCatalog()
    .then((counts) => {
      console.log(`Seeded ${counts.restaurants} restaurants and ${counts.dishes} dishes.`);
      return closePool();
    })
    .catch(async (err) => {
      console.error('Seed failed:', err.message);
      await closePool().catch(() => {});
      process.exit(1);
    });
}

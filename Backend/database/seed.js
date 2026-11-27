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
  const items = data.items || data.dishes || [];
  const restaurants = data.restaurants || [];

  await withTransaction(pool, async (client) => {
    await client.query('TRUNCATE TABLE dishes, restaurants');

    if (restaurants.length > 0) {
      const rValues = [];
      const rPlaceholders = restaurants.map((r, i) => {
        const base = i * 4;
        rValues.push(r.id, r.name, r.latitude, r.longitude);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });
      await client.query(
        `INSERT INTO restaurants (id, name, latitude, longitude)
         VALUES ${rPlaceholders.join(', ')}`,
        rValues
      );
    }

    if (items.length > 0) {
      const dValues = [];
      const dPlaceholders = items.map((d, i) => {
        const base = i * 7;
        const isVegetarian = d.vegetarian !== undefined ? d.vegetarian : d.is_vegetarian;
        const isAvailable = d.available !== undefined ? d.available : d.is_available;
        dValues.push(
          d.id,
          d.restaurant_id,
          d.name,
          Boolean(isVegetarian),
          d.price,
          isAvailable !== false,
          d.description ?? ''
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      });
      await client.query(
        `INSERT INTO dishes (id, restaurant_id, name, is_vegetarian, price, is_available, description)
         VALUES ${dPlaceholders.join(', ')}`,
        dValues
      );
    }
  });

  return {
    restaurants: restaurants.length,
    dishes: items.length
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

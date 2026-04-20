import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { config } from "./config.js";
import { SHIRT_CATALOG } from "./packCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, "../db/schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query(schema);
  await ensureInventorySchema();
  await seedInventory();
}

async function ensureInventorySchema() {
  await pool.query(`
    ALTER TABLE pulls
    ADD COLUMN IF NOT EXISTS copies_total INTEGER
  `);

  for (const shirt of SHIRT_CATALOG) {
    await pool.query(
      `
        UPDATE pulls
        SET copies_total = $2
        WHERE copies_total IS NULL AND shirt_key = $1
      `,
      [shirt.key, shirt.totalCount],
    );
  }

  await pool.query(`
    UPDATE pulls
    SET copies_total = 1
    WHERE copies_total IS NULL
  `);

  await pool.query(`
    ALTER TABLE pulls
    ALTER COLUMN copies_total SET NOT NULL
  `);
}

async function seedInventory() {
  for (const shirt of SHIRT_CATALOG) {
    await pool.query(
      `
        INSERT INTO inventory (
          shirt_key,
          shirt_name,
          tier,
          rarity_rank,
          total_count,
          remaining_count
        )
        VALUES ($1, $2, $3, $4, $5, $5)
        ON CONFLICT (shirt_key)
        DO UPDATE SET
          shirt_name = EXCLUDED.shirt_name,
          tier = EXCLUDED.tier,
          rarity_rank = EXCLUDED.rarity_rank,
          total_count = EXCLUDED.total_count
      `,
      [
        shirt.key,
        shirt.name,
        shirt.tier,
        shirt.rarityRank,
        shirt.totalCount,
      ],
    );
  }
}

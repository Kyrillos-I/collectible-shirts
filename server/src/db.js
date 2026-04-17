import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { config } from "./config.js";

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
}


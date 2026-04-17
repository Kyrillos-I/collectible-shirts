import { initializeDatabase, pool } from "./db.js";

async function resetDatabase() {
  await initializeDatabase();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deletedPulls = await client.query("DELETE FROM pulls");
    const restoredUsers = await client.query(
      "UPDATE users SET packs_available = 1",
    );

    await client.query("COMMIT");

    console.log(
      `Database reset complete: deleted ${deletedPulls.rowCount} pull(s), restored packs for ${restoredUsers.rowCount} user(s).`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch((error) => {
  console.error("database reset error", error);
  process.exit(1);
});

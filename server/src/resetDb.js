import { initializeDatabase, pool } from "./db.js";
import { SHIRT_CATALOG } from "./packCatalog.js";

async function resetDatabase() {
  await initializeDatabase();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deletedPulls = await client.query("DELETE FROM pulls");
    const restoredUsers = await client.query(
      "UPDATE users SET packs_available = 1",
    );
    let resetInventoryRows = 0;

    for (const shirt of SHIRT_CATALOG) {
      const inventoryResult = await client.query(
        `
          UPDATE inventory
          SET
            shirt_name = $2,
            tier = $3,
            rarity_rank = $4,
            total_count = $5,
            remaining_count = $5
          WHERE shirt_key = $1
        `,
        [
          shirt.key,
          shirt.name,
          shirt.tier,
          shirt.rarityRank,
          shirt.totalCount,
        ],
      );

      resetInventoryRows += inventoryResult.rowCount;
    }

    await client.query("COMMIT");

    console.log(
      `Database reset complete: deleted ${deletedPulls.rowCount} pull(s), restored packs for ${restoredUsers.rowCount} user(s), reset ${resetInventoryRows} inventory row(s).`,
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

export const SHIRT_CATALOG = [
  {
    key: "dark-mode",
    name: "Gold Shirt",
    tier: "dark-mode",
    tierLabel: "Gold Shirt",
    rarityRank: 1,
    totalCount: 1,
    accent: "#ffd54d",
  },
  {
    key: "purple-mode",
    name: "Purple Shirt",
    tier: "purple-mode",
    tierLabel: "Purple Shirt",
    rarityRank: 2,
    totalCount: 3,
    accent: "#8f5bff",
  },
  {
    key: "blue-mode",
    name: "Blue Shirt",
    tier: "blue-mode",
    tierLabel: "Blue Shirt",
    rarityRank: 3,
    totalCount: 5,
    accent: "#4285f4",
  },
  {
    key: "scarlet-mode",
    name: "Scarlet Shirt",
    tier: "scarlet-mode",
    tierLabel: "Scarlet Shirt",
    rarityRank: 4,
    totalCount: 18,
    accent: "#cc0033",
  },
  {
    key: "basic-mode",
    name: "Basic Shirt",
    tier: "basic-mode",
    tierLabel: "Basic Shirt",
    rarityRank: 5,
    totalCount: 29,
    accent: "#f1f1f1",
  },
];

export const TOTAL_PACK_COUNT = SHIRT_CATALOG.reduce(
  (sum, shirt) => sum + shirt.totalCount,
  0,
);

export const SHIRT_BY_KEY = Object.fromEntries(
  SHIRT_CATALOG.map((shirt) => [shirt.key, shirt]),
);

export function getLimitedLabel(totalCount) {
  return `${totalCount} of ${TOTAL_PACK_COUNT}`;
}

export function pickInventoryShirt(rows) {
  const availableRows = rows.filter((row) => Number(row.remaining_count) > 0);
  const remainingTotal = availableRows.reduce(
    (sum, row) => sum + Number(row.remaining_count),
    0,
  );

  if (remainingTotal < 1) {
    return null;
  }

  let roll = Math.floor(Math.random() * remainingTotal);

  for (const row of availableRows) {
    roll -= Number(row.remaining_count);

    if (roll < 0) {
      return row;
    }
  }

  return availableRows.at(-1) ?? null;
}

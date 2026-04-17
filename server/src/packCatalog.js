export const PACK_ODDS = [
  {
    key: "dark-mode",
    name: "Gold Shirt",
    tier: "dark-mode",
    tierLabel: "Gold Tier",
    rarityRank: 1,
    probability: 0.01,
    probabilityLabel: "1%",
    accent: "#ffd54d",
  },
  {
    key: "purple-mode",
    name: "Purple Shirt",
    tier: "purple-mode",
    tierLabel: "Purple Mode",
    rarityRank: 2,
    probability: 0.05,
    probabilityLabel: "5%",
    accent: "#8f5bff",
  },
  {
    key: "blue-mode",
    name: "Blue Shirt",
    tier: "blue-mode",
    tierLabel: "Blue Mode",
    rarityRank: 3,
    probability: 0.1,
    probabilityLabel: "10%",
    accent: "#4285f4",
  },
  {
    key: "scarlet-mode",
    name: "Scarlet Shirt",
    tier: "scarlet-mode",
    tierLabel: "Scarlet Mode",
    rarityRank: 4,
    probability: 0.3,
    probabilityLabel: "30%",
    accent: "#cc0033",
  },
  {
    key: "basic-mode",
    name: "Basic Shirt",
    tier: "basic-mode",
    tierLabel: "Basic",
    rarityRank: 5,
    probability: 0.54,
    probabilityLabel: "54%",
    accent: "#f1f1f1",
  },
];

export function rollPack() {
  const roll = Math.random();
  let cursor = 0;

  for (const shirt of PACK_ODDS) {
    cursor += shirt.probability;

    if (roll <= cursor) {
      return shirt;
    }
  }

  return PACK_ODDS.at(-1);
}

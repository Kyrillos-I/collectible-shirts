CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  packs_available INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS login_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS login_codes_user_id_created_at_idx
  ON login_codes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pulls (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shirt_key TEXT NOT NULL,
  shirt_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  rarity_rank INTEGER NOT NULL,
  copies_total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pulls_rarity_created_at_idx
  ON pulls(rarity_rank ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory (
  shirt_key TEXT PRIMARY KEY,
  shirt_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  rarity_rank INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  remaining_count INTEGER NOT NULL
);

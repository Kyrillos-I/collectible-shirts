import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

import { config } from "./config.js";
import { initializeDatabase, pool } from "./db.js";
import {
  getLimitedLabel,
  pickInventoryShirt,
  SHIRT_BY_KEY,
  TOTAL_PACK_COUNT,
} from "./packCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

const SESSION_COOKIE = "collectible_shirts_session";
const RUTGERS_EMAIL_REGEX =
  /^[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*rutgers\.edu$/i;
const leaderboardClients = new Set();

const app = express();
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: config.cookieSameSite,
  secure: config.cookieSecure,
};

app.set("trust proxy", 1);
app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");

    if (!origin) {
      callback(null, { origin: false, credentials: true });
      return;
    }

    const allowedOrigins = new Set([config.clientUrl, getRequestOrigin(req)]);

    if (allowedOrigins.has(origin)) {
      callback(null, { origin, credentials: true });
      return;
    }

    callback(new Error("Origin not allowed"));
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/request-code", async (req, res) => {
  const fullName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = normalizeEmail(req.body?.email);

  if (fullName.length < 2) {
    res.status(400).json({ error: "Enter your full name." });
    return;
  }

  if (!RUTGERS_EMAIL_REGEX.test(email)) {
    res
      .status(400)
      .json({ error: "Use a Rutgers email ending in rutgers.edu." });
    return;
  }

  const code = createVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(
    Date.now() + config.loginCodeTtlMinutes * 60 * 1000,
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        INSERT INTO users (full_name, email)
        VALUES ($1, $2)
        ON CONFLICT (email)
        DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id, full_name, email
      `,
      [fullName, email],
    );

    const user = userResult.rows[0];

    await client.query(
      `
        UPDATE login_codes
        SET consumed_at = NOW()
        WHERE user_id = $1 AND consumed_at IS NULL
      `,
      [user.id],
    );

    await client.query(
      `
        INSERT INTO login_codes (user_id, code_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, codeHash, expiresAt],
    );

    await client.query("COMMIT");

    await sendVerificationCode({
      email,
      fullName,
      code,
    });

    res.json({
      ok: true,
      expiresInMinutes: config.loginCodeTtlMinutes,
      developmentCode:
        !config.resendApiKey || !config.resendFromEmail ? code : undefined,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("request-code error", error);
    res.status(500).json({ error: "Unable to send the verification code." });
  } finally {
    client.release();
  }
});

app.post("/api/auth/verify-code", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

  if (!RUTGERS_EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Enter a valid Rutgers email." });
    return;
  }

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Enter the six-digit code." });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [email],
    );

    if (!userResult.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Start by requesting a login code." });
      return;
    }

    const userId = userResult.rows[0].id;

    const codeResult = await client.query(
      `
        SELECT id, code_hash, expires_at
        FROM login_codes
        WHERE user_id = $1
          AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    if (!codeResult.rowCount) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Request a new code and try again." });
      return;
    }

    const loginCode = codeResult.rows[0];

    if (new Date(loginCode.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "That code expired. Request a new one." });
      return;
    }

    if (hashVerificationCode(code) !== loginCode.code_hash) {
      await client.query("ROLLBACK");
      res.status(401).json({ error: "That code does not match." });
      return;
    }

    await client.query(
      `
        UPDATE login_codes
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [loginCode.id],
    );

    await client.query(
      `
        UPDATE users
        SET is_verified = TRUE,
            last_login_at = NOW()
        WHERE id = $1
      `,
      [userId],
    );

    const viewer = await fetchViewer(client, userId);

    await client.query("COMMIT");

    setSessionCookie(res, viewer);
    res.json({ ok: true, user: viewer });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("verify-code error", error);
    res.status(500).json({ error: "Unable to verify the code." });
  } finally {
    client.release();
  }
});

app.get("/api/auth/session", async (req, res) => {
  const session = readSession(req);

  if (!session) {
    res.json({ user: null });
    return;
  }

  try {
    const viewer = await fetchViewer(pool, session.userId);
    res.json({ user: viewer ?? null });
  } catch (error) {
    console.error("session error", error);
    res.status(500).json({ error: "Unable to load the session." });
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.json({ ok: true });
});

app.post("/api/packs/open", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id, packs_available
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [req.userId],
    );

    if (!userResult.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found." });
      return;
    }

    const user = userResult.rows[0];

    if (user.packs_available <= 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Your pack has already been opened." });
      return;
    }

    const inventoryResult = await client.query(
      `
        SELECT
          shirt_key,
          shirt_name,
          tier,
          rarity_rank,
          total_count,
          remaining_count
        FROM inventory
        ORDER BY rarity_rank ASC
        FOR UPDATE
      `,
    );

    const shirt = pickInventoryShirt(inventoryResult.rows);

    if (!shirt) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "All 56 packs have been opened." });
      return;
    }

    await client.query(
      `
        UPDATE inventory
        SET remaining_count = remaining_count - 1
        WHERE shirt_key = $1
      `,
      [shirt.shirt_key],
    );

    const pullResult = await client.query(
      `
        INSERT INTO pulls (
          user_id,
          shirt_key,
          shirt_name,
          tier,
          rarity_rank,
          copies_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, shirt_key, shirt_name, tier, rarity_rank, copies_total, created_at
      `,
      [
        req.userId,
        shirt.shirt_key,
        shirt.shirt_name,
        shirt.tier,
        shirt.rarity_rank,
        shirt.total_count,
      ],
    );

    await client.query(
      `
        UPDATE users
        SET packs_available = packs_available - 1
        WHERE id = $1
      `,
      [req.userId],
    );

    const viewer = await fetchViewer(client, req.userId);
    const leaderboard = await fetchLeaderboard(client);

    await client.query("COMMIT");

    broadcastLeaderboard(leaderboard);
    setSessionCookie(res, viewer);
    res.json({
      ok: true,
      pull: serializePull(pullResult.rows[0]),
      user: viewer,
      leaderboard,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("open-pack error", error);
    res.status(500).json({ error: "Unable to open the pack right now." });
  } finally {
    client.release();
  }
});

app.get("/api/leaderboard", async (_req, res) => {
  try {
    const leaderboard = await fetchLeaderboard(pool);
    res.json(leaderboard);
  } catch (error) {
    console.error("leaderboard error", error);
    res.status(500).json({ error: "Unable to load the leaderboard." });
  }
});

app.get("/api/leaderboard/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

  leaderboardClients.add(res);

  try {
    const leaderboard = await fetchLeaderboard(pool);
    writeSsePayload(res, leaderboard);
  } catch (error) {
    console.error("leaderboard stream init error", error);
  }

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    leaderboardClients.delete(res);
  });
});

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

initializeDatabase()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.log(`API listening on http://localhost:${config.port}`);
    });

    const shutdown = async () => {
      server.close();
      await pool.end();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((error) => {
    console.error("database init error", error);
    process.exit(1);
  });

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function createVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function hashVerificationCode(code) {
  return crypto
    .createHash("sha256")
    .update(`${code}:${config.jwtSecret}`)
    .digest("hex");
}

function createDisplayHandle(email) {
  const localPart = email.split("@")[0] ?? "collector";
  return localPart
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function setSessionCookie(res, viewer) {
  const token = jwt.sign({ userId: viewer.id }, config.jwtSecret, {
    expiresIn: "7d",
  });

  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function getRequestOrigin(req) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0].trim() || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function requireAuth(req, res, next) {
  const session = readSession(req);

  if (!session?.userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  req.userId = session.userId;
  next();
}

async function sendVerificationCode({ email, fullName, code }) {
  if (!resend || !config.resendFromEmail) {
    console.log(`[dev-mailer] ${email} -> ${code}`);
    return;
  }

  await resend.emails.send({
    from: config.resendFromEmail,
    to: [email],
    subject: "Your Mystery Apparel verification code",
    html: `
      <div style="font-family: Arial, sans-serif; background: #131313; color: #ffffff; padding: 24px;">
        <p style="margin: 0 0 12px; color: #cc0033; font-size: 18px; letter-spacing: 1px;">Mystery Apparel</p>
        <p style="margin: 0 0 16px;">Hi ${escapeHtml(fullName)},</p>
        <p style="margin: 0 0 16px;">Use this code to sign in:</p>
        <p style="margin: 0 0 16px; font-size: 32px; font-weight: 700; letter-spacing: 8px;">${code}</p>
        <p style="margin: 0; color: #e5bdbc;">This code expires in ${config.loginCodeTtlMinutes} minutes.</p>
      </div>
    `,
  });
}

async function fetchViewer(db, userId) {
  const result = await db.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.packs_available,
        u.created_at,
        p.id AS pull_id,
        p.shirt_key,
        p.shirt_name,
        p.tier,
        p.rarity_rank,
        p.copies_total,
        p.created_at AS pull_created_at
      FROM users u
      LEFT JOIN LATERAL (
        SELECT id, shirt_key, shirt_name, tier, rarity_rank, copies_total, created_at
        FROM pulls
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE u.id = $1
    `,
    [userId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  const inventorySummary = await fetchInventorySummary(db);

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    displayHandle: createDisplayHandle(row.email),
    packsAvailable: row.packs_available,
    packsRemaining: inventorySummary.packsRemaining,
    soldOut: inventorySummary.packsRemaining < 1,
    memberSince: row.created_at,
    latestPull: row.pull_id
      ? serializePull({
          id: row.pull_id,
          shirt_key: row.shirt_key,
          shirt_name: row.shirt_name,
          tier: row.tier,
          rarity_rank: row.rarity_rank,
          copies_total: row.copies_total,
          created_at: row.pull_created_at,
        })
      : null,
  };
}

async function fetchLeaderboard(db) {
  const result = await db.query(
    `
      SELECT
        p.id,
        p.shirt_key,
        p.shirt_name,
        p.tier,
        p.rarity_rank,
        p.copies_total,
        p.created_at,
        u.full_name,
        u.email
      FROM pulls p
      INNER JOIN users u ON u.id = p.user_id
      ORDER BY p.rarity_rank ASC, p.created_at DESC
      LIMIT 50
    `,
  );

  const entries = result.rows.map((row, index) =>
    serializeLeaderboardEntry(row, index),
  );

  return {
    entries,
    packsRemaining: await fetchPacksRemaining(db),
    topEntry: entries[0] ?? null,
  };
}

function serializeLeaderboardEntry(row, index) {
  const shirt = SHIRT_BY_KEY[row.shirt_key];

  return {
    id: row.id,
    rank: index + 1,
    fullName: row.full_name,
    displayHandle: createDisplayHandle(row.email),
    pulledAt: row.created_at,
    shirt: {
      ...serializePull(row),
      tierLabel: shirt?.tierLabel ?? row.shirt_name,
      accent: shirt?.accent ?? "#ffffff",
    },
  };
}

function serializePull(row) {
  const shirt = SHIRT_BY_KEY[row.shirt_key];
  const copiesTotal = Number(shirt?.totalCount ?? row.copies_total);

  return {
    id: row.id,
    shirtKey: row.shirt_key,
    shirtName: shirt?.name ?? row.shirt_name,
    tier: row.tier,
    rarityRank: row.rarity_rank,
    copiesTotal,
    limitedLabel: getLimitedLabel(copiesTotal),
    tierLabel: shirt?.tierLabel ?? row.shirt_name,
    accent: shirt?.accent ?? "#ffffff",
    createdAt: row.created_at,
  };
}

async function fetchPacksRemaining(db) {
  const result = await db.query(
    `
      SELECT COALESCE(SUM(remaining_count), 0) AS packs_remaining
      FROM inventory
    `,
  );

  return Number(result.rows[0]?.packs_remaining ?? 0);
}

async function fetchInventorySummary(db) {
  const packsRemaining = await fetchPacksRemaining(db);

  return {
    packsRemaining,
    totalPacks: TOTAL_PACK_COUNT,
  };
}

function broadcastLeaderboard(payload) {
  for (const client of leaderboardClients) {
    writeSsePayload(client, payload);
  }
}

function writeSsePayload(client, payload) {
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

import dotenv from "dotenv";

dotenv.config();

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/collectible_shirts";
const DEFAULT_JWT_SECRET = "change-me";
const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const config = {
  nodeEnv,
  isProduction,
  port: Number.parseInt(process.env.PORT ?? "3001", 10),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
  loginCodeTtlMinutes: Number.parseInt(
    process.env.LOGIN_CODE_TTL_MINUTES ?? "10",
    10,
  ),
  cookieSecure: parseBoolean(process.env.COOKIE_SECURE) ?? isProduction,
  cookieSameSite: normalizeSameSite(process.env.COOKIE_SAME_SITE) ?? "lax",
};

validateConfig(config);

function parseBoolean(value) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error("COOKIE_SECURE must be set to true or false.");
}

function normalizeSameSite(value) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (["lax", "strict", "none"].includes(normalized)) {
    return normalized;
  }

  throw new Error("COOKIE_SAME_SITE must be one of: lax, strict, none.");
}

function validateConfig(currentConfig) {
  const errors = [];

  if (
    currentConfig.cookieSameSite === "none" &&
    currentConfig.cookieSecure !== true
  ) {
    errors.push(
      "COOKIE_SECURE must be true when COOKIE_SAME_SITE is set to none.",
    );
  }

  if (currentConfig.isProduction) {
    if (
      !process.env.DATABASE_URL ||
      currentConfig.databaseUrl === DEFAULT_DATABASE_URL
    ) {
      errors.push("DATABASE_URL must be set to a real production database.");
    }

    if (
      !process.env.JWT_SECRET ||
      currentConfig.jwtSecret === DEFAULT_JWT_SECRET
    ) {
      errors.push("JWT_SECRET must be set to a strong production secret.");
    }

    if (!currentConfig.resendApiKey || !currentConfig.resendFromEmail) {
      errors.push(
        "RESEND_API_KEY and RESEND_FROM_EMAIL must be set in production.",
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

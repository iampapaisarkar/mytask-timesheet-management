import crypto from "crypto";
import moment from "moment";
import Auth from "#auth";
import models from "../models/index.js";

const { TrackingAuthTokens } = models;

const TOKEN_PREFIX = "mttrk_";
const DEFAULT_TTL_DAYS = 90;

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

function generateRawToken() {
  const bytes = crypto.randomBytes(32).toString("base64url");
  return `${TOKEN_PREFIX}${bytes}`;
}

function normalizePlatform(platform) {
  const p = String(platform || "")
    .trim()
    .toLowerCase();
  if (p === "ios" || p === "android") return p;
  return p || null;
}

export function isMobilePlatform(platform) {
  const p = normalizePlatform(platform);
  return p === "ios" || p === "android";
}

/**
 * Revoke prior active tokens for user (+ platform), issue a new opaque token.
 * Returns plaintext once — only the hash is stored.
 */
export async function issueTrackingToken(userId, { platform } = {}) {
  const plat = normalizePlatform(platform);
  const now = moment().utc();
  const expiresAt = now.clone().add(DEFAULT_TTL_DAYS, "days").toDate();
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const tokenPrefix = raw.slice(0, 12);

  const where = {
    user_id: userId,
    revoked_at: null,
  };
  if (plat) {
    where.platform = plat;
  }

  await TrackingAuthTokens.update(
    { revoked_at: now.toDate() },
    { where },
  );

  await TrackingAuthTokens.create({
    user_id: userId,
    token_hash: tokenHash,
    token_prefix: tokenPrefix,
    platform: plat,
    expires_at: expiresAt,
    revoked_at: null,
    last_used_at: null,
    created_at: now.toDate(),
  });

  return {
    tracking_token: raw,
    tracking_token_expires_at: expiresAt.toISOString(),
  };
}

/**
 * Verify opaque tracking token; return user or null.
 */
export async function verifyTrackingToken(raw) {
  if (!raw || typeof raw !== "string" || !raw.startsWith(TOKEN_PREFIX)) {
    return { success: false, code: "TRACKING_TOKEN_INVALID", message: "Invalid tracking token" };
  }

  const tokenHash = hashToken(raw);
  const row = await TrackingAuthTokens.findOne({
    where: { token_hash: tokenHash },
  });

  if (!row) {
    return { success: false, code: "TRACKING_TOKEN_INVALID", message: "Invalid tracking token" };
  }

  if (row.revoked_at) {
    return { success: false, code: "TRACKING_TOKEN_REVOKED", message: "Tracking token revoked" };
  }

  if (row.expires_at && moment(row.expires_at).isBefore(moment())) {
    return { success: false, code: "TRACKING_TOKEN_EXPIRED", message: "Tracking token expired" };
  }

  const userResponse = await Auth.getUser(row.user_id);
  if (!userResponse?.success || !userResponse.user) {
    return { success: false, code: "TRACKING_TOKEN_INVALID", message: "Unauthorized" };
  }

  // Fire-and-forget last_used touch
  TrackingAuthTokens.update(
    { last_used_at: moment().utc().toDate() },
    { where: { id: row.id } },
  ).catch(() => undefined);

  return {
    success: true,
    user: userResponse.user,
    tokenRow: row,
  };
}

export async function revokeTrackingTokens(userId, { platform } = {}) {
  const where = {
    user_id: userId,
    revoked_at: null,
  };
  const plat = normalizePlatform(platform);
  if (plat) {
    where.platform = plat;
  }

  await TrackingAuthTokens.update(
    { revoked_at: moment().utc().toDate() },
    { where },
  );

  return { success: true };
}

export async function maybeIssueForMobileLogin(userId, platform) {
  if (!isMobilePlatform(platform)) {
    return null;
  }
  return issueTrackingToken(userId, { platform });
}

export default {
  issueTrackingToken,
  verifyTrackingToken,
  revokeTrackingTokens,
  maybeIssueForMobileLogin,
  isMobilePlatform,
  TOKEN_PREFIX,
};

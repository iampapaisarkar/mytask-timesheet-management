import { createHash } from "crypto";
import admin from "firebase-admin";
import models from "../models/index.js";
const {
  Users,
  UserSessions,
  SystemRoles,
  UserSystemRoles,
  FirebaseProviders,
  UserTimezones,
  Organisations,
  UserOrganisationRoles,
  OrganisationRoles,
} = models;
import { fn, col, literal, Op } from "sequelize";
import moment from "moment";
import redisUtils from "../utils/redis.utils.js";
import externalApiLogService from "../service/external-api-log.service.js";
import { resolveAuditOrganisation } from "../service/audit/audit-context.service.js";

const AUTH_CACHE_PREFIX = "auth:claims:";
const AUTH_CACHE_MAX_SEC = 300;

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function mapFirebaseAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/id-token-expired") {
    return { code: "AUTH_EXPIRED", message: "Firebase ID token expired" };
  }
  if (code === "auth/id-token-revoked") {
    return { code: "AUTH_REVOKED", message: "Firebase ID token revoked" };
  }
  if (code === "auth/user-disabled") {
    return { code: "AUTH_DISABLED", message: "Firebase user is disabled" };
  }
  if (
    code === "auth/argument-error" ||
    code === "auth/invalid-id-token" ||
    code === "auth/project-not-found"
  ) {
    return { code: "AUTH_INVALID", message: "Invalid Firebase ID token" };
  }
  return { code: "AUTH_INVALID", message: "Invalid or expired session" };
}

/**
 * Log real Firebase Admin Auth verifyIdToken calls (not Redis cache hits).
 * Fire-and-forget — never block auth.
 */
function logFirebaseVerifyIdToken({
  user,
  organisation,
  success,
  durationMs,
  error,
  feature = "Verify ID Token",
}) {
  void externalApiLogService
    .storeExternalApiCallLog(
      user || null,
      organisation || null,
      "Firebase",
      "firebase.auth.verifyIdToken",
      "POST",
      { feature },
      "application/json",
      success
        ? { success: true, statusCode: 200 }
        : {
            success: false,
            statusCode: 401,
            error: error?.code || error?.message || null,
          },
      {
        apiName: "Firebase Auth Admin",
        feature,
        success: Boolean(success),
        statusCode: success ? 200 : 401,
        durationMs,
        error: success ? null : error,
        technicalMessage: success
          ? null
          : String(error?.message || error?.code || "verifyIdToken failed"),
      },
    )
    .catch(() => {});
}

async function resolveOrgForAuthLog(options = {}, userId = null) {
  if (options.organisation?.id) {
    return options.organisation;
  }
  if (options.orgCode) {
    const org = await Organisations.findOne({
      where: { code: String(options.orgCode) },
      attributes: ["id", "code"],
      raw: true,
    }).catch(() => null);
    if (org) return org;
  }
  return resolveAuditOrganisation(null, userId);
}

class Auth {
  static _req = null;

  static async attempt(email) {
    try {
      const userRes = await Users.findOne({
        attributes: ["id"],
        where: { email: email },
        raw: true,
      });

      if (!userRes) {
        return {
          success: false,
          message: "Email not matched!",
        };
      }

      const response = await this.getUser(userRes.id);

      if (!response.success) {
        return {
          success: false,
          message: response.message,
        };
      }
      const user = response.user;
      return {
        success: true,
        user: user,
      };
    } catch (error) {
      console.error("Auth.attempt error:", error);
      return {
        success: false,
        message: "Something went wrong in authenctication",
      };
    }
  }

  /**
   * Cryptographic ID token verification (Firebase Admin).
   * Prefer this for login/signup and request auth.
   */
  static async verifyFirebaseToken(token) {
    const startedAt = Date.now();
    try {
      if (!token) {
        return { success: false, code: "AUTH_MISSING", message: "Token missing" };
      }
      const decoded = await admin.auth().verifyIdToken(token, true);
      logFirebaseVerifyIdToken({
        success: true,
        durationMs: Date.now() - startedAt,
        feature: "Login Verify ID Token",
      });
      return {
        success: true,
        data: { users: [{ localId: decoded.uid, email: decoded.email }] },
        decoded,
      };
    } catch (error) {
      const mapped = mapFirebaseAuthError(error);
      logFirebaseVerifyIdToken({
        success: false,
        durationMs: Date.now() - startedAt,
        error: { code: mapped.code, message: mapped.message },
        feature: "Login Verify ID Token",
      });
      return { success: false, ...mapped };
    }
  }

  static async resolveUserIdFromUid(uid) {
    if (!uid) return null;
    const byProvider = await FirebaseProviders.findOne({
      attributes: ["user_id"],
      where: { uid },
      raw: true,
    });
    if (byProvider?.user_id) return Number(byProvider.user_id);

    const byUser = await Users.findOne({
      attributes: ["id"],
      where: { firebase_user_id: uid },
      raw: true,
    });
    return byUser?.id ? Number(byUser.id) : null;
  }

  /**
   * Verify Firebase ID token + resolve local user.
   * Uses Redis claims cache keyed by token hash (never skips crypto without prior verify).
   */
  static async verifyIdTokenAndResolveUser(token, options = {}) {
    if (!token) {
      return {
        success: false,
        code: "AUTH_MISSING",
        message: "Token missing",
      };
    }

    const tokenHash = hashToken(token);
    const cacheKey = `${AUTH_CACHE_PREFIX}${tokenHash}`;

    try {
      const cached = await redisUtils.getCache(cacheKey).catch(() => null);
      if (cached?.userId && cached?.uid) {
        if (cached.revoked) {
          return {
            success: false,
            code: "AUTH_REVOKED",
            message: "Session revoked",
          };
        }
        const userResponse = await this.getUser(cached.userId);
        if (!userResponse.success) {
          return {
            success: false,
            code: "AUTH_USER_NOT_FOUND",
            message: userResponse.message || "User not found",
          };
        }
        if (options.touchSession !== false) {
          void this.touchSession(cached.userId, tokenHash, options.meta);
        }
        return {
          success: true,
          user: userResponse.user,
          uid: cached.uid,
          tokenHash,
          fromCache: true,
        };
      }

      let decoded;
      const verifyStartedAt = Date.now();
      try {
        decoded = await admin.auth().verifyIdToken(token, true);
      } catch (err) {
        const mapped = mapFirebaseAuthError(err);
        const organisation = await resolveOrgForAuthLog(options, null);
        logFirebaseVerifyIdToken({
          organisation,
          success: false,
          durationMs: Date.now() - verifyStartedAt,
          error: { code: mapped.code, message: mapped.message },
          feature: options.logFeature || "Verify ID Token",
        });
        return { success: false, ...mapped };
      }

      const uid = decoded.uid;
      const userId = await this.resolveUserIdFromUid(uid);
      if (!userId) {
        return {
          success: false,
          code: "AUTH_USER_NOT_FOUND",
          message: "User not found",
        };
      }

      const revoked = await UserSessions.findOne({
        where: {
          user_id: userId,
          token_hash: tokenHash,
          revoked_at: { [Op.ne]: null },
        },
        attributes: ["id"],
        raw: true,
      }).catch(() => null);
      if (revoked) {
        return {
          success: false,
          code: "AUTH_REVOKED",
          message: "Session revoked",
        };
      }

      const exp = Number(decoded.exp) || 0;
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(
        1,
        Math.min(AUTH_CACHE_MAX_SEC, exp > now ? exp - now : AUTH_CACHE_MAX_SEC),
      );
      await redisUtils
        .setCacheEx(cacheKey, { uid, userId, exp }, ttl)
        .catch(() => null);

      const userResponse = await this.getUser(userId);
      if (!userResponse.success) {
        return {
          success: false,
          code: "AUTH_USER_NOT_FOUND",
          message: userResponse.message || "User not found",
        };
      }

      if (options.touchSession !== false) {
        void this.touchSession(userId, tokenHash, options.meta);
      }

      // Only log real Firebase Admin calls (cache misses), with org attribution
      void (async () => {
        const organisation = await resolveOrgForAuthLog(options, userId);
        logFirebaseVerifyIdToken({
          user: userResponse.user,
          organisation,
          success: true,
          durationMs: Date.now() - verifyStartedAt,
          feature: options.logFeature || "Verify ID Token",
        });
      })();

      return {
        success: true,
        user: userResponse.user,
        uid,
        tokenHash,
        decoded,
        fromCache: false,
      };
    } catch (error) {
      console.error("verifyIdTokenAndResolveUser error:", error);
      return {
        success: false,
        code: "AUTH_INVALID",
        message: "Session is invalid or expired",
      };
    }
  }

  /** @deprecated Prefer verifyIdTokenAndResolveUser — kept for call-site compatibility */
  static async verifyToken(token) {
    const result = await this.verifyIdTokenAndResolveUser(token, {
      touchSession: true,
    });
    if (!result.success) {
      return { success: false, message: result.message, code: result.code };
    }
    return { success: true, user: result.user, tokenHash: result.tokenHash };
  }

  static async createSession(userId, token, meta = {}) {
    try {
      const currentUTCTime = moment().utc().format();
      const tokenHash = hashToken(token);
      const expireAt = moment().utc().add(2, "hours").format();

      const existing = await UserSessions.findOne({
        where: { user_id: userId, token_hash: tokenHash },
      });

      if (existing) {
        await existing.update({
          revoked_at: null,
          last_activity_at: currentUTCTime,
          expire_at: expireAt,
          platform: meta.platform || existing.platform,
          user_agent: meta.user_agent || existing.user_agent,
          token: null,
        });
      } else {
        await UserSessions.create({
          user_id: userId,
          token: null,
          token_hash: tokenHash,
          expire_at: expireAt,
          created_at: currentUTCTime,
          last_activity_at: currentUTCTime,
          revoked_at: null,
          platform: meta.platform || null,
          user_agent: meta.user_agent || null,
        });
      }
      return { success: true, tokenHash };
    } catch (error) {
      console.error("Auth.createSession error:", error);
      return {
        success: false,
        message: "Something went wrong in session creation!",
      };
    }
  }

  static async touchSession(userId, tokenHash, meta = {}) {
    try {
      const now = moment().utc();
      const row = await UserSessions.findOne({
        where: { user_id: userId, token_hash: tokenHash },
      });
      if (!row || row.revoked_at) return;
      const last = row.last_activity_at
        ? moment.utc(row.last_activity_at)
        : null;
      if (last && now.diff(last, "minutes") < 5) return;
      await row.update({
        last_activity_at: now.format(),
        expire_at: now.clone().add(2, "hours").format(),
        ...(meta.platform ? { platform: meta.platform } : {}),
        ...(meta.user_agent ? { user_agent: meta.user_agent } : {}),
      });
    } catch {
      /* non-fatal */
    }
  }

  static async destroySession(token) {
    try {
      if (!token) return { success: false };
      const tokenHash = hashToken(token);
      const now = moment().utc().format();

      const [count] = await UserSessions.update(
        { revoked_at: now },
        {
          where: {
            token_hash: tokenHash,
            revoked_at: null,
          },
        },
      );

      // Legacy rows that still store raw token
      await UserSessions.update(
        { revoked_at: now },
        { where: { token, revoked_at: null } },
      );

      await redisUtils.delCache(`${AUTH_CACHE_PREFIX}${tokenHash}`).catch(() => null);

      return { success: true, count };
    } catch (error) {
      console.error("Auth.destroySession error:", error);
      return {
        success: false,
        message: "Something went wrong in session destroy!",
      };
    }
  }

  /** @deprecated Use verifyIdTokenAndResolveUser — resolves user after verify */
  static async getUserByToken(token) {
    const result = await this.verifyIdTokenAndResolveUser(token, {
      touchSession: false,
    });
    if (!result.success) {
      return { success: false, message: result.message, code: result.code };
    }
    return { success: true, user: result.user };
  }

  static async getUser(userId) {
    try {
      const cacheKey = `user:${userId}`;
      const cached = await redisUtils.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      const userResponse = await Users.findOne({
        attributes: [
          "id",
          "first_name",
          "middle_name",
          "last_name",
          "full_name",
          "email",
          "dob",
          "phone_number",
          "phone_country_code",
          "phone_country_iso",
          "firebase_user_id",
        ],
        where: { id: userId },
        include: [
          {
            model: FirebaseProviders,
            as: "firebase_providers",
            attributes: ["id", "user_id", "provider_id", "uid"],
          },
          {
            model: UserTimezones,
            as: "timezone",
          },
          {
            model: Organisations,
            as: "organisations",
            attributes: [
              "id",
              "name",
              "code",
              "website",
              "phone_number",
              "phone_country_code",
              "phone_country_iso",
              "default_country",
              "email",
            ],
            through: {
              attributes: ["organisation_id", "user_id"],
            },
            include: [
              {
                model: UserOrganisationRoles,
                as: "user_organisations_role",
                required: true,
                where: { user_id: userId },
                attributes: ["id", "user_id", "organisation_id", "role_id"],
                include: [
                  {
                    model: OrganisationRoles,
                    as: "role",
                    required: false,
                    attributes: ["id", "name", "code"],
                  },
                ],
              },
            ],
          },
        ],
        raw: false,
        nest: true,
      });

      const user = userResponse?.toJSON() ?? null;

      if (!user) {
        return {
          success: false,
          message: "User not found!",
        };
      }

      const userRoles = await SystemRoles.findAll({
        attributes: ["id", "name", "code"],
        include: [
          {
            model: UserSystemRoles,
            as: "user_system_roles",
            required: true,
            on: {
              role_id: { [Op.eq]: col("SystemRoles.id") },
            },
            attributes: [],
            where: {
              user_id: user.id,
            },
          },
        ],
        raw: true,
      });

      const ownOrganisations = await this.getOwnOrganisations(user.id);

      await redisUtils.setCache(cacheKey, {
        success: true,
        user: {
          ...user,
          roles: userRoles,
          own_organisations: ownOrganisations,
        },
      });

      return {
        success: true,
        user: {
          ...user,
          roles: userRoles,
          own_organisations: ownOrganisations,
        },
      };
    } catch (error) {
      console.error("Auth.user error:", error);
      return {
        success: false,
        message: "Something went wrong to fetch user",
      };
    }
  }

  static async getOwnOrganisations(userId) {
    const organisations = await Organisations.findAll({
      include: [
        {
          model: UserOrganisationRoles,
          as: "user_organisations_role",
          where: { user_id: userId },
          attributes: ["id", "user_id", "role_id"],
          include: [
            {
              model: OrganisationRoles,
              as: "role",
              attributes: ["id", "name", "code"],
              where: { code: "owner" },
            },
          ],
        },
      ],
      nest: true,
      raw: false,
    });
    return organisations;
  }

  static isSuperAdmin(user) {
    return user.roles?.some((r) => r.code === "super-admin") || false;
  }
  static isOrgAdmin(user) {
    return user.roles?.some((r) => r.code === "org-admin") || false;
  }

  static async storeUpdateUserTimezone(userId, timezone) {
    try {
      await UserTimezones.destroy({
        where: { user_id: userId },
      });
      await UserTimezones.create({
        user_id: userId,
        timezone: timezone,
      });
      return true;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}

export default Auth;
export { hashToken };

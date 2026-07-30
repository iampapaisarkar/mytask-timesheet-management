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
import axios from "axios";
import redisUtils from "../utils/redis.utils.js";

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

  static async verifyFirebaseToken(token) {
    try {
      const response = await axios.post(
        `${process.env.FIREBASE_API_URL}/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
        { idToken: token },
        { timeout: 5000 }, // ⛑ prevents Cloud Run 503
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Firebase token has been expired!",
      };
    }
  }

  static async verifyToken(token) {
    try {
      if (!token) {
        return {
          success: false,
          message: "Token missing",
        };
      }

      // 1️⃣ Get latest session from DB
      const userSession = await UserSessions.findOne({
        attributes: ["user_id", "token", "expire_at"],
        where: { token },
        order: [["created_at", "DESC"]],
        raw: true,
      });

      const now = moment.utc();

      // 2️⃣ If session exists and NOT expired → allow
      if (
        userSession &&
        userSession.expire_at &&
        now.isBefore(moment.utc(userSession.expire_at))
      ) {
        console.log("Token exists and is valid");
        return { success: true };
      }

      // 3️⃣ Otherwise, verify token with Firebase
      console.log("Checking token with Firebase");

      const firebaseResponse = await axios.post(
        `${process.env.FIREBASE_API_URL}/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
        { idToken: token },
        { timeout: 5000 }, // ⛑ prevents Cloud Run 503
      );

      // 4️⃣ Validate Firebase response
      if (
        !firebaseResponse.data ||
        !firebaseResponse.data.users ||
        firebaseResponse.data.users.length === 0
      ) {
        return {
          success: false,
          message: "Invalid Firebase token",
        };
      }

      const providerUserInfo =
        firebaseResponse.data.users[0].providerUserInfo || [];

      let matchedUser = null;

      // 5️⃣ Match Firebase UID with local DB
      for (const provider of providerUserInfo) {
        const uid = provider.rawId || provider.federatedId;

        if (!uid) continue;

        const firebaseProvider = await FirebaseProviders.findOne({
          attributes: ["user_id"],
          where: { uid },
          raw: true,
        });

        if (firebaseProvider) {
          matchedUser = firebaseProvider;
          break;
        }
      }

      // 6️⃣ No matched user → deny
      if (!matchedUser) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // 7️⃣ Create or refresh session
      await this.createSession(matchedUser.user_id, token);

      console.log("Session created/refreshed");

      return {
        success: true,
        data: firebaseResponse.data,
      };
    } catch (error) {
      console.error("verifyToken error:", error);

      return {
        success: false,
        message: "Session is invalid or expired",
      };
    }
  }

  static async createSession(userId, token) {
    try {
      const currentUTCTime = moment().utc().format();

      const expireAtUTCTime = moment().utc();

      // Add 60 minutes to the expireAt UTC time
      const updatedExpireAtUTCTime = expireAtUTCTime.add(60, "minutes");

      // Format the updated time
      const formattedExpireAtUTCTime = updatedExpireAtUTCTime.format();

      await UserSessions.create({
        user_id: userId,
        token: token,
        expire_at: formattedExpireAtUTCTime,
        created_at: currentUTCTime,
      });
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message: "Something went wrong in session creation!",
      };
    }
  }

  static async destroySession(token) {
    try {
      if (!token) return null;

      const sessionResponse = await UserSessions.destroy({
        where: { token: token },
      });

      if (sessionResponse) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
        };
      }
    } catch (error) {
      console.error("Auth.destroySession error:", error);
      return {
        success: false,
        message: "Something went wrong in session destroy!",
      };
    }
  }

  static async getUserByToken(token) {
    try {
      const session = await UserSessions.findOne({
        where: { token },
        raw: true,
      });

      if (!session) return null;

      const response = await this.getUser(session.user_id);
      if (response.success) {
        return {
          success: true,
          user: response.user,
        };
      } else {
        return {
          success: false,
          message: response.message,
        };
      }
    } catch (error) {
      console.error("Auth.getUserByToken error:", error);
      return {
        success: false,
        message: "Something went wrong to fetching user!",
      };
    }
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
                required: true, // ✅ only include current user’s role
                where: { user_id: userId },
                attributes: ["id", "user_id", "organisation_id", "role_id"],
                include: [
                  {
                    model: OrganisationRoles,
                    as: "role",
                    required: false, // ⚠️ make this optional
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
          as: "user_organisations_role", // optional alias if you defined one
          where: { user_id: userId },
          attributes: ["id", "user_id", "role_id"],
          include: [
            {
              model: OrganisationRoles,
              as: "role",
              attributes: ["id", "name", "code"],
              where: { code: "owner" }, // only include where role code === 'admin'
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
      // delete old timezone
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

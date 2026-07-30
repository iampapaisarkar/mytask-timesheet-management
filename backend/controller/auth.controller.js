import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  SystemRoles,
  UserSystemRoles,
  FirebaseProviders,
  EmployeeInvitations,
} = models;
import Auth from "#auth";
import moment from "moment";
import { FirebaseMessaging } from "#firebasemessaging";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import redisUtils from "../utils/redis.utils.js";
import { db } from "../database.js";
import {
  generateEmailVerificationAppLink,
  generatePasswordResetAppLink,
  sendFirebasePasswordResetEmail,
} from "../utils/firebase-auth-links.js";
import { resolvePhoneFields } from "../utils/phone.js";

export async function login(req, res, next) {
  const { email, invitation_token, fcmToken, oldFcmToken, platform, timezone } =
    req.body;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(501).json({
        message: "Token is required!",
      });
    }

    let tokenVerifyResponse = await Auth.verifyFirebaseToken(token);

    if (tokenVerifyResponse.success) {
      let authAttemptResponse = await Auth.attempt(email);

      if (authAttemptResponse.success) {
        let sessionCreationResponse = await Auth.createSession(
          authAttemptResponse.user.id,
          token,
        );
        if (sessionCreationResponse.success) {
          await redisUtils.delCache(`user:${authAttemptResponse.user.id}`);

          if (invitation_token) {
            await onboardInvitation(authAttemptResponse.user, invitation_token);
          }
          const fcmResponse = await FirebaseMessaging.storeAndUpdateToken(
            authAttemptResponse.user.id,
            fcmToken,
            oldFcmToken,
            platform,
          );
          await Auth.storeUpdateUserTimezone(
            authAttemptResponse.user.id,
            timezone,
          );
          const userResponse = await Auth.getUser(authAttemptResponse.user.id);
          return res.status(200).json({
            data: userResponse.user,
            message: "Successfully logged in",
          });
        } else {
          return res.status(501).json({
            message: sessionCreationResponse.message,
          });
        }
      } else {
        return res.status(501).json({
          message: authAttemptResponse.message,
        });
      }
    } else {
      return res.status(501).json({
        message: tokenVerifyResponse.message,
      });
    }
  } catch (err) {
    console.log("error::", err);
    return res.status(500).json({
      message: "Unable to login. Please ty again later.",
      details: err,
    });
  }
}

export async function signup(req, res, next) {
  const {
    first_name,
    middle_name,
    last_name,
    email,
    dob,
    phone_number,
    phone_country_code,
    phone_country_iso,
    uid,
    providerData,
    invitation_token,
    fcmToken,
    oldFcmToken,
    platform,
    timezone,
  } = req.body;

  // 1. Initialize transaction variable outside try/catch
  let transaction;

  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token is required!" });
    }

    // Verify token before starting DB transaction to save resources
    let tokenVerifyResponse = await Auth.verifyFirebaseToken(token);
    if (!tokenVerifyResponse.success) {
      return res.status(401).json({ message: tokenVerifyResponse.message });
    }

    if (!first_name || !last_name || !email || !uid) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let phoneFields = {
      phone_number: null,
      phone_country_code: null,
      phone_country_iso: null,
    };
    try {
      phoneFields = resolvePhoneFields({
        phone_number,
        phone_country_code,
        phone_country_iso,
        required: true,
        label: "Phone number",
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }

    // 2. Start the transaction
    transaction = await db.transaction();

    const currentUTCTime = moment().utc().format();

    // CORRECTED: transaction goes inside the same object as 'where'
    let existingUser = await Users.findOne({
      where: { email: email },
      transaction,
    });

    let authUserId = null;
    if (existingUser) {
      await existingUser.update(
        {
          first_name,
          middle_name,
          last_name,
          dob,
          firebase_user_id: uid,
          ...phoneFields,
        },
        { transaction },
      );
      authUserId = existingUser.id;
    } else {
      const newUser = await Users.create(
        {
          first_name,
          middle_name,
          last_name,
          email,
          dob,
          firebase_user_id: uid,
          created_at: currentUTCTime,
          ...phoneFields,
        },
        { transaction },
      );
      authUserId = newUser.id;
    }

    const provider = getProvider(providerData, "password");
    await FirebaseProviders.create(
      {
        user_id: authUserId,
        provider_id: provider.providerId,
        uid: provider.uid,
      },
      { transaction },
    );

    const role = await SystemRoles.findOne({
      attributes: ["id", "code"],
      where: { code: "org-admin" },
      raw: true,
      transaction, // CORRECTED: nested in options
    });

    await UserSystemRoles.destroy({
      where: { user_id: authUserId },
      transaction, // CORRECTED
    });

    await UserSystemRoles.create(
      {
        user_id: authUserId,
        role_id: role.id,
      },
      { transaction },
    );

    // 3. Commit the database changes
    await transaction.commit();

    /** * Post-Transaction: External Services (Firebase, Email)
     **/
    try {
      const appName = process.env.APP_NAME || "myTask";
      const customLink = await generateEmailVerificationAppLink(email);
      await enqueueSendEmail({
        user: existingUser || { email, first_name },
        organisation: null,
        userEmails: [email],
        message: {
          subject: `${appName} - Verify email`,
          template: "email-verification.html",
          variables: {
            title: `${appName} - Verify email`,
            message: `Welcome to ${appName}. Verify your email address by clicking the button below.`,
            button_url: customLink,
            button_label: "Verify email",
          },
        },
        immediate: true,
      });
    } catch (mailErr) {
      console.error(
        "Verification email failed (signup continues):",
        mailErr?.message || mailErr,
      );
    }
    let sessionCreationResponse = await Auth.createSession(authUserId, token);

    if (sessionCreationResponse.success) {
      await Auth.storeUpdateUserTimezone(authUserId, timezone);
      const userResponse = await Auth.getUser(authUserId);

      if (invitation_token) {
        await onboardInvitation(userResponse.user, invitation_token);
      }

      await FirebaseMessaging.storeAndUpdateToken(
        userResponse.user.id,
        fcmToken,
        oldFcmToken,
        platform,
      );

      return res.status(200).json({
        data: userResponse.user,
        message: "Successfully signup",
      });
    } else {
      return res.status(501).json({ message: sessionCreationResponse.message });
    }
  } catch (err) {
    // 4. Rollback only if transaction was actually started and not finished
    if (transaction) await transaction.rollback();

    console.error("Signup Error:", err);
    res.status(500).json({
      message: "Unable to signup. Please try again later.",
      details: err.message,
    });
  }
}

export async function forgotPassword(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const appName = process.env.APP_NAME || "myTask";
    let delivery = "firebase";

    // 1) Preferred: Admin reset link + myTask branded email over SMTP (same path as /mail-test)
    try {
      const customLink = await generatePasswordResetAppLink(email);
      const subject = `${appName} - Reset password`;
      await enqueueSendEmail({
        user: { email },
        organisation: null,
        userEmails: [email],
        message: {
          subject,
          template: "forgot-password.html",
          variables: {
            title: subject,
            message:
              "We received a request to reset your password. Click the button below to choose a new password.",
            button_url: customLink,
            button_label: "Reset password",
          },
        },
        immediate: true,
      });
      delivery = "branded-smtp";
      console.log(`[forgotPassword] branded SMTP sent to ${email}`);
    } catch (brandedErr) {
      console.warn(
        "[forgotPassword] branded SMTP path failed:",
        brandedErr?.message || brandedErr,
      );
      // 2) Fallback: Firebase sends its own reset email via API key
      await sendFirebasePasswordResetEmail(email);
      delivery = "firebase-api";
      console.log(`[forgotPassword] Firebase API reset triggered for ${email}`);
    }

    return res.status(200).json({
      message:
        "If an account exists for that email, password reset instructions have been sent.",
      delivery,
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    const code = err?.code || err?.message || "";
    if (
      String(code).includes("EMAIL_NOT_FOUND") ||
      String(code).includes("USER_NOT_FOUND") ||
      String(err?.message || "").toLowerCase().includes("no user")
    ) {
      return res.status(200).json({
        message:
          "If an account exists for that email, password reset instructions have been sent.",
      });
    }
    return res.status(500).json({
      message: "Unable to send password reset email. Please try again later.",
      details: err?.message || String(err),
    });
  }
}

export async function logout(req, res, next) {
  const {} = req.body;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.replace("Bearer ", "");

    const response = await Auth.destroySession(token);

    if (response.success) {
      return res.status(200).json({
        message: "Successfully logged out",
      });
    } else {
      return res.status(501).json({
        message: response.message,
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Unable to logout. Please ty again later.",
      details: err,
    });
  }
}

export async function authUser(req, res, next) {
  const { user } = req.body;
  try {
    return res.status(200).json({
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to fetch user!",
      details: err,
    });
  }
}

export async function verifyOrganisationInvitationToken(req, res, next) {
  const { invitation_token } = req.body;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const response = await Auth.verifyToken(token);
      if (response && response.success) {
        const userResponse = await Auth.getUserByToken(token);
        if (userResponse && userResponse.success) {
          await onboardInvitation(userResponse.user, invitation_token);
        }
      }
    }

    const response = await EmployeeInvitations.findOne({
      where: {
        invitation_token: invitation_token,
      },
      raw: true,
    });

    if (!response) {
      return res.status(501).json({
        message: "Invitation code is invalid or expire!",
      });
    }

    return res.status(200).json({
      data: {},
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(500).json({
      message: "Unable to verify employee invitation code!",
      details: err,
    });
  }
}

async function onboardInvitation(user, invitationToken) {
  try {
    const response = await EmployeeInvitations.update(
      {
        user_id: user.id,
      },
      {
        where: {
          invitation_token: invitationToken,
        },
      },
    );
  } catch (err) {
    console.log("error::", err);
  }
}

export async function updateProfile(req, res, next) {
  const {
    user,
    first_name,
    middle_name,
    last_name,
    dob,
    phone_number,
    phone_country_code,
    phone_country_iso,
  } = req.body;
  try {
    let phoneFields = {};
    if (phone_number !== undefined) {
      try {
        phoneFields = resolvePhoneFields({
          phone_number,
          phone_country_code,
          phone_country_iso,
          required: false,
          label: "Phone number",
        });
      } catch (phoneErr) {
        return res.status(phoneErr.status || 400).json({
          message: phoneErr.message,
        });
      }
    }

    await Users.update(
      {
        first_name,
        middle_name,
        last_name,
        ...(dob !== undefined ? { dob } : {}),
        ...phoneFields,
      },
      {
        where: { id: user.id },
      },
    );

    await redisUtils.delCache(`user:${user.id}`);

    const updated = await Users.findByPk(user.id);

    return res.status(200).json({
      data: updated,
      message: "Profile successfully updated",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to fetch user!",
      details: err,
    });
  }
}

export async function updateFCMToken(req, res, next) {
  const { user, fcmToken, oldFcmToken, platform } = req.body;
  try {
    const fcmResponse = await FirebaseMessaging.storeAndUpdateToken(
      user.id,
      fcmToken,
      oldFcmToken,
      platform,
    );
    await redisUtils.delCache(`user:${user.id}`);

    return res.status(200).json({});
  } catch (err) {
    return res.status(500).json({
      message: "Unable to store/update FCM token",
      details: err,
    });
  }
}

function getProvider(providers, providerId) {
  return providers.find((provider) => provider.providerId === providerId);
}

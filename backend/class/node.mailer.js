import transporter from "../functions/node-mailer-registry.js";
import fs from "fs";
import path from "path";
import mailService from "../service/email.service.js";

const BRAND = {
  primary: "#04B6B1",
  primaryHover: "#039E9A",
  appName: () => process.env.APP_NAME || "myTask",
  year: () => String(new Date().getFullYear()),
};

export const NodeMailer = {
  /**
   * Send email to users
   * @param {Object} user
   * @param {Object|null} organisation
   * @param {Array|String} emails - recipient email(s)
   * @param {Object} message - { subject, template, variables }
   */
  send: async (user, organisation, emails, message) => {
    const list = Array.isArray(emails) ? emails : emails ? [emails] : [];
    if (list.length <= 0) {
      return { success: false, message: "Email is required" };
    }
    if (!message) {
      return { success: false, message: "Data message is required" };
    }

    const fromAddress =
      process.env.MAIL_FROM || process.env.MAIL_USER || "noreply@mytask.app";
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      return {
        success: false,
        message: "Mail credentials are not configured (MAIL_USER / MAIL_PASSWORD)",
      };
    }

    const basePath = path.join(process.cwd(), "email-template");
    const mainHTML = fs.readFileSync(path.join(basePath, "main.html"), "utf8");
    const bodyHTML = fs.readFileSync(
      path.join(basePath, message.template),
      "utf8",
    );

    const variables = {
      app_name: BRAND.appName(),
      year: BRAND.year(),
      primary_color: BRAND.primary,
      ...(message.variables || {}),
    };

    const renderedBody = renderTemplate(bodyHTML, variables);
    let finalHTML = mainHTML.replace("{{body}}", renderedBody);
    finalHTML = renderTemplate(finalHTML, variables);

    const formattedEmails = formatEmails(list);

    const logoPath = path.join(basePath, "assets", "logo.png");
    const attachments = [];
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: "logo.png",
        path: logoPath,
        cid: "mytask-logo",
        contentDisposition: "inline",
        contentType: "image/png",
      });
    }
    if (Array.isArray(message.attachments)) {
      for (const file of message.attachments) {
        if (!file) continue;
        attachments.push(file);
      }
    }

    const startedAt = Date.now();
    try {
      const info = await transporter.sendMail({
        from: `"${BRAND.appName()}" <${fromAddress}>`,
        to: formattedEmails,
        subject: renderTemplate(message.subject || "", variables),
        text: stripHtml(renderedBody),
        html: finalHTML,
        attachments,
      });

      try {
        await mailService.storeEmailSendLog(user, organisation, list, message, {
          success: true,
          startedAt,
          durationMs: Date.now() - startedAt,
          messageId: info?.messageId || null,
          provider: "smtp",
          providerResponse: { accepted: info?.accepted, rejected: info?.rejected },
          feature: message?.feature || "Email",
        });
      } catch (logErr) {
        console.error("Failed to store email send log:", logErr?.message || logErr);
      }

      return { success: true, data: info };
    } catch (err) {
      try {
        await mailService.storeEmailSendLog(user, organisation, list, message, {
          success: false,
          startedAt,
          durationMs: Date.now() - startedAt,
          provider: "smtp",
          error: err,
          feature: message?.feature || "Email",
        });
      } catch (logErr) {
        console.error("Failed to store email send log:", logErr?.message || logErr);
      }
      return {
        success: false,
        message: err?.message || "Failed to send email",
      };
    }
  },
};

function renderTemplate(template, variables = {}) {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    output = output.replace(regex, value == null ? "" : String(value));
  }
  return output;
}

function formatEmails(emailArray) {
  if (!Array.isArray(emailArray) || emailArray.length === 0) {
    return "";
  }
  return emailArray.map((email) => email.trim()).filter(Boolean).join(", ");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

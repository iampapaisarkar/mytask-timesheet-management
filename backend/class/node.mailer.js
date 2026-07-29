import transporter from "../functions/node-mailer-registry.js";
import models from "../models/index.js";
const { Users } = models;
import { fn, col, literal, Op } from "sequelize";
import fs from "fs";
import path from "path";
import mailService from "../service/email.service.js";

export const NodeMailer = {
  /**
   * Send email to users
   * @param {Array|String} to - recipient email(s)
   * @param {Object} message - message data: { subject, template, variables }
   */
  send: async (user, organisation, emails, message) => {
    if (emails.length <= 0) {
      return { success: false, message: "Email is required" };
    }
    if (!message) {
      return { success: false, message: "Data message is required" };
    }
    const basePath = path.join(process.cwd(), "email-template");
    // Load main layout
    const mainHTML = fs.readFileSync(path.join(basePath, "main.html"), "utf8");
    // Load body template dynamically (e.g. "account-created.html")
    const bodyHTML = fs.readFileSync(
      path.join(basePath, message.template),
      "utf8",
    );
    // Replace variables inside body
    const renderedBody = renderTemplate(bodyHTML, message.variables || {});
    // Inject into main layout
    const finalHTML = mainHTML.replace("{{body}}", renderedBody);

    const formattedEmails = formatEmails(emails);

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.MAIL_FROM}>`,
      to: formattedEmails,
      subject: message.subject,
      text: "",
      html: finalHTML,
    });

    await mailService.storeEmailSendLog(user, organisation, emails, message);

    return { success: true, data: info };
  },
};

// ----------------------------
// 1️⃣ Helper - Replace variables
// ----------------------------
function renderTemplate(template, variables = {}) {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    output = output.replace(regex, value ?? "");
  }
  return output;
}

function formatEmails(emailArray) {
  if (!Array.isArray(emailArray) || emailArray.length === 0) {
    return "";
  }

  // Trim each email and wrap with quotes
  const formatted = emailArray.map((email) => `"${email.trim()}"`).join(",");

  return formatted;
}

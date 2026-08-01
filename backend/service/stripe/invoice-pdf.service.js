import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import moment from "moment";

const COLORS = {
  primary: "#04B6B1",
  primaryDark: "#0F766E",
  primaryMuted: "#E6F7F6",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E2E8F0",
  white: "#FFFFFF",
};

const PAGE = {
  size: "A4",
  margin: 48,
  width: 595.28,
  height: 841.89,
};

function contentWidth() {
  return PAGE.width - PAGE.margin * 2;
}

function moneyFromCents(cents, currency = "usd") {
  const amount = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function fmtDate(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY") : "—";
}

function resolveLogoPath() {
  const candidates = [
    path.join(process.cwd(), "email-template", "assets", "logo.png"),
    path.join(process.cwd(), "assets", "logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Build a branded myTask subscription invoice PDF buffer.
 * @param {{ invoice: object, user?: object|null, appName?: string }} opts
 * @returns {Promise<Buffer>}
 */
export async function buildInvoicePdfBuffer({
  invoice,
  user = null,
  appName = process.env.APP_NAME || "myTask",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE.size,
      margin: PAGE.margin,
      info: {
        Title: `Invoice ${invoice.invoice_number || invoice.id}`,
        Author: appName,
        Creator: `${appName} Billing`,
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      renderInvoice(doc, { invoice, user, appName });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderInvoice(doc, { invoice, user, appName }) {
  const left = PAGE.margin;
  const width = contentWidth();
  const invoiceNo = invoice.invoice_number || `INV-${invoice.id}`;
  const planName = invoice.plan?.name || "Pro";
  const meta = invoice.metadata && typeof invoice.metadata === "object"
    ? invoice.metadata
    : {};
  const billingCycle =
    meta.billing_interval === "year"
      ? "Yearly"
      : meta.billing_interval === "month"
        ? "Monthly"
        : /year/i.test(String(meta.line_description || ""))
          ? "Yearly"
          : "Monthly";
  const amount = moneyFromCents(invoice.amount_cents, invoice.currency);
  const billToName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "—";
  const billToEmail = user?.email || "—";
  const payment =
    invoice.payment_method_brand && invoice.payment_method_last4
      ? `${invoice.payment_method_brand} •••• ${invoice.payment_method_last4}`
      : invoice.payment_method || "Card";

  // Brand header
  doc.rect(0, 0, PAGE.width, 88).fill(COLORS.primary);
  const logoPath = resolveLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, left, 22, { height: 28 });
    } catch {
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(appName, left, 30);
    }
  } else {
    doc
      .fillColor(COLORS.white)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(appName, left, 30);
  }
  doc
    .fillColor(COLORS.white)
    .font("Helvetica")
    .fontSize(11)
    .text("Subscription invoice", left, 58, { width: width / 2 });
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(invoiceNo, left + width / 2, 34, { width: width / 2, align: "right" });
  doc
    .fillColor(COLORS.white)
    .font("Helvetica")
    .fontSize(10)
    .text(String(invoice.status || "").toUpperCase(), left + width / 2, 56, {
      width: width / 2,
      align: "right",
    });

  let y = 112;

  // Bill to / dates
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("BILL TO", left, y);
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(billToName, left, y + 14, { width: width * 0.55 });
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(10)
    .text(billToEmail, left, y + 30, { width: width * 0.55 });

  const rightX = left + width * 0.55;
  const dateRows = [
    ["Invoice date", fmtDate(invoice.paid_at || invoice.created_at)],
    ["Period start", fmtDate(invoice.period_start)],
    ["Period end", fmtDate(invoice.period_end)],
    ["Payment", payment],
  ];
  let dy = y;
  for (const [label, value] of dateRows) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(label, rightX, dy);
    doc
      .fillColor(COLORS.ink)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(value, rightX + 90, dy, { width: width * 0.45 - 90, align: "right" });
    dy += 16;
  }

  y = Math.max(y + 70, dy + 12);

  // Line items table header
  doc.rect(left, y, width, 28).fill(COLORS.primaryMuted);
  doc
    .fillColor(COLORS.primaryDark)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Description", left + 12, y + 9)
    .text("Amount", left + width - 110, y + 9, { width: 98, align: "right" });
  y += 36;

  const description =
    meta.line_description ||
    `${planName} subscription (${billingCycle.toLowerCase()})`;
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica")
    .fontSize(11)
    .text(description, left + 12, y, { width: width - 140 });
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(amount, left + width - 110, y, { width: 98, align: "right" });
  y += 28;
  doc
    .moveTo(left, y)
    .lineTo(left + width, y)
    .strokeColor(COLORS.line)
    .lineWidth(1)
    .stroke();
  y += 16;

  // Totals
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(10)
    .text("Total paid", left + width - 200, y, { width: 90, align: "right" });
  doc
    .fillColor(COLORS.primary)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(amount, left + width - 110, y - 2, { width: 98, align: "right" });
  y += 40;

  // Footer note
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(
      `This invoice was generated by ${appName}. Card payments are processed by Stripe; this document is your ${appName} billing record.`,
      left,
      PAGE.height - PAGE.margin - 36,
      { width, align: "left" },
    );
}

/**
 * Simple HTML invoice for in-app / browser view (myTask branded, not Stripe).
 */
export function buildInvoiceHtml({
  invoice,
  user = null,
  appName = process.env.APP_NAME || "myTask",
}) {
  const invoiceNo = escapeHtml(invoice.invoice_number || `INV-${invoice.id}`);
  const planName = escapeHtml(invoice.plan?.name || "Pro");
  const amount = escapeHtml(moneyFromCents(invoice.amount_cents, invoice.currency));
  const status = escapeHtml(String(invoice.status || "").replace(/_/g, " "));
  const billToName = escapeHtml(
    user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
      : "—",
  );
  const billToEmail = escapeHtml(user?.email || "—");
  const payment = escapeHtml(
    invoice.payment_method_brand && invoice.payment_method_last4
      ? `${invoice.payment_method_brand} •••• ${invoice.payment_method_last4}`
      : invoice.payment_method || "Card",
  );
  const paidOn = escapeHtml(fmtDate(invoice.paid_at || invoice.created_at));
  const period = escapeHtml(
    `${fmtDate(invoice.period_start)} → ${fmtDate(invoice.period_end)}`,
  );
  const meta = invoice.metadata && typeof invoice.metadata === "object"
    ? invoice.metadata
    : {};
  const description = escapeHtml(
    meta.line_description || `${invoice.plan?.name || "Pro"} subscription`,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName} invoice ${invoiceNo}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #F8FAFC; color: #0F172A; }
    .wrap { max-width: 640px; margin: 24px auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
    .header { background: #04B6B1; color: #fff; padding: 24px; display: flex; justify-content: space-between; gap: 16px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
    .body { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748B; }
    .value { margin-top: 4px; font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #0F766E; background: #E6F7F6; padding: 10px 12px; }
    td { padding: 14px 12px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
    .total { text-align: right; margin-top: 16px; font-size: 18px; font-weight: 700; color: #04B6B1; }
    .foot { padding: 0 24px 24px; font-size: 12px; color: #64748B; }
    .pill { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <h1>${escapeHtml(appName)}</h1>
        <p>Subscription invoice</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">${invoiceNo}</div>
        <div class="pill" style="margin-top:8px">${status}</div>
      </div>
    </div>
    <div class="body">
      <div class="grid">
        <div>
          <div class="label">Bill to</div>
          <div class="value">${billToName}</div>
          <div style="color:#64748B;font-size:13px;margin-top:2px">${billToEmail}</div>
        </div>
        <div>
          <div class="label">Paid on</div>
          <div class="value">${paidOn}</div>
          <div class="label" style="margin-top:12px">Period</div>
          <div class="value">${period}</div>
        </div>
        <div>
          <div class="label">Plan</div>
          <div class="value">${planName}</div>
        </div>
        <div>
          <div class="label">Payment</div>
          <div class="value">${payment}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>${description}</td>
            <td style="text-align:right;font-weight:600">${amount}</td>
          </tr>
        </tbody>
      </table>
      <div class="total">Total paid ${amount}</div>
    </div>
    <div class="foot">
      This invoice was generated by ${escapeHtml(appName)}. Card payments are processed by Stripe; this document is your ${escapeHtml(appName)} billing record.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

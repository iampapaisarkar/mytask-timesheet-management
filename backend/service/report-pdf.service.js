import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

function currencyPrefix(code) {
  const c = String(code || "AUD").toUpperCase();
  if (c === "INR") return "₹INR";
  if (c === "GBP") return "£GBP";
  if (c === "EUR") return "€EUR";
  return `$${c}`;
}

function money(n, currency) {
  const v = Number(n) || 0;
  return `${currencyPrefix(currency)} ${v.toFixed(2)}`;
}

function hours(n) {
  const v = Number(n) || 0;
  const text = Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
  return `${text}h`;
}

/**
 * Write an approved-timesheet report PDF to disk. Returns absolute path.
 */
export async function writeReportPdf({ report, outputPath, title }) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const emp = report.employee || {};
    const ts = report.timesheet || {};
    const pay = report.pay_cycle || {};
    const days = Array.isArray(report.days) ? report.days : [];
    const totals = report.totals || {};
    const currency = report.currency || pay.currency || "AUD";

    doc
      .fontSize(18)
      .fillColor("#04B6B1")
      .text(title || "Timesheet Pay Report", { continued: false });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#333");
    doc.text(`Employee: ${emp.name || "—"}`);
    doc.text(
      `Timesheet: #${ts.timesheet_id || "—"}${ts.code ? ` (${ts.code})` : ""}`,
    );
    doc.text(
      `Pay period: ${ts.period_start_date || "—"} → ${ts.period_end_date || "—"}`,
    );
    if (ts.jobs?.length) {
      doc.text(`Jobs: ${ts.jobs.map((j) => j.name).filter(Boolean).join(", ")}`);
    }
    doc.text(`Currency: ${currency}`);
    doc.text(`Generated: ${report.generated_at || new Date().toISOString()}`);
    doc.moveDown();

    const col = {
      date: 48,
      work: 160,
      break: 220,
      travel: 280,
      amount: 360,
    };
    const rowY = () => doc.y;

    doc.fontSize(11).fillColor("#111").text("Daily breakdown", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#666");
    let y = rowY();
    doc.text("Date", col.date, y);
    doc.text("Work", col.work, y);
    doc.text("Break", col.break, y);
    doc.text("Travel", col.travel, y);
    doc.text("Amount", col.amount, y);
    doc.moveDown(0.4);
    doc
      .strokeColor("#cccccc")
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .stroke();
    doc.moveDown(0.3);

    doc.fillColor("#222");
    for (const d of days) {
      if (doc.y > 720) {
        doc.addPage();
      }
      y = rowY();
      const dateLabel = `${String(d.date || "").slice(0, 10)}${
        d.day_name ? ` ${d.day_name}` : ""
      }${d.is_public_holiday ? " (PH)" : ""}`;
      doc.text(dateLabel, col.date, y, { width: 100 });
      doc.text(hours(d.working_hours), col.work, y);
      doc.text(hours(d.break_hours), col.break, y);
      doc.text(hours(d.travel_hours), col.travel, y);
      doc.text(money(d.amount, currency), col.amount, y);
      doc.moveDown(0.55);
    }

    doc.moveDown(0.5);
    doc
      .strokeColor("#04B6B1")
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor("#111");
    doc.text(`Total working hours: ${hours(totals.working_hours)}`);
    doc.text(`Total break hours: ${hours(totals.break_hours)}`);
    doc.text(`Total travel hours: ${hours(totals.travel_hours)}`);
    doc.moveDown(0.3);
    doc
      .fontSize(13)
      .fillColor("#04B6B1")
      .text(`Pay cycle total: ${money(pay.total_amount ?? totals.amount, currency)}`);
    doc
      .fontSize(12)
      .fillColor(pay.is_paid ? "#0a7a3e" : "#a35b00")
      .text(`Payment status: ${pay.paid_label || (pay.is_paid ? "Paid" : "Not paid")}`);

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

export function reportPdfStoragePath(organisationId, reportRequestId) {
  return path.join(
    process.cwd(),
    "storage",
    "reports",
    String(organisationId),
    `report-${reportRequestId}.pdf`,
  );
}

export default {
  writeReportPdf,
  reportPdfStoragePath,
};

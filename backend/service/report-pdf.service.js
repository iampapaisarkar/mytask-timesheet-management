import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import moment from "moment";

/** Bump when layout changes so cached artifacts are regenerated. */
export const REPORT_PDF_VERSION = "r3";

const COLORS = {
  primary: "#04B6B1",
  primaryDark: "#0F766E",
  primaryMuted: "#E6F7F6",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E2E8F0",
  rowAlt: "#F8FAFC",
  white: "#FFFFFF",
  success: "#047857",
  warning: "#B45309",
};

const PAGE = {
  size: "A4",
  margin: 42,
  width: 595.28,
  height: 841.89,
  footerReserve: 36,
};

function contentWidth() {
  return PAGE.width - PAGE.margin * 2;
}

function currencyPrefix(code) {
  const c = String(code || "AUD").toUpperCase();
  if (c === "INR") return "₹";
  if (c === "GBP") return "£";
  if (c === "EUR") return "€";
  if (c === "AUD") return "A$";
  if (c === "USD") return "US$";
  return `${c} `;
}

function money(n, currency) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n) || 0;
  return `${currencyPrefix(currency)}${v.toFixed(2)}`;
}

function hours(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "—";
  const totalMins = Math.round(v * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function fmtDate(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY") : String(value).slice(0, 10);
}

function fmtDateTime(value) {
  if (!value) return moment().format("DD MMM YYYY, HH:mm");
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY, HH:mm") : String(value);
}

function fmtTime(value) {
  if (!value) return "—";
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function statusLabel(status) {
  if (!status) return "—";
  if (typeof status === "string") return status;
  return status.name || status.code || "—";
}

function uniqueCustomerNames(jobs = []) {
  const names = [];
  const seen = new Set();
  for (const job of jobs) {
    const name = job?.customer?.name;
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function resolveLogoPath() {
  const candidates = [
    path.join(process.cwd(), "email-template", "assets", "logo.png"),
    path.join(process.cwd(), "assets", "logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Write an approved-timesheet report PDF to disk. Returns absolute path.
 */
export async function writeReportPdf({ report, outputPath, title, meta = {} }) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE.size,
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: title || "Timesheet Report",
        Author: meta.generatedBy || "myTask",
        Creator: "myTask Timesheet Management",
      },
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    try {
      renderReport(doc, { report, title, meta });
      stampPageChrome(doc, { report, title, meta });
      doc.end();
    } catch (err) {
      stream.destroy();
      reject(err);
      return;
    }

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

function renderReport(doc, { report, title, meta }) {
  const emp = report.employee || {};
  const ts = report.timesheet || {};
  const pay = report.pay_cycle || {};
  const days = Array.isArray(report.days) ? report.days : [];
  const totals = report.totals || {};
  const currency = report.currency || pay.currency || "AUD";
  const orgName =
    meta.organisationName || report.organisation?.name || "Organisation";
  const reportTitle = title || "Timesheet Pay Report";
  const generatedAt = fmtDateTime(report.generated_at || meta.generatedAt);
  const generatedBy = meta.generatedBy || "System";
  const jobs = Array.isArray(ts.jobs) ? ts.jobs : [];
  const customers = uniqueCustomerNames(jobs);
  const left = PAGE.margin;
  const width = contentWidth();

  drawBrandHeader(doc, {
    orgName,
    reportTitle,
    generatedAt,
    generatedBy,
    left,
    width,
  });

  drawSectionTitle(doc, "Report summary", left);
  drawSummaryCards(doc, {
    left,
    width,
    totals,
    pay,
    currency,
    daysWorked:
      totals.days_worked ?? days.filter((d) => Number(d.working_hours) > 0).length,
  });

  drawSectionTitle(doc, "Report details", left);
  drawDetailsGrid(doc, {
    left,
    width,
    rows: [
      ["Organisation", orgName],
      ["Employee", emp.name || "—"],
      ["Employee code", emp.code || "—"],
      ["Employee email", emp.email || "—"],
      [
        "Report period",
        `${fmtDate(ts.period_start_date)} – ${fmtDate(ts.period_end_date)}`,
      ],
      [
        "Timesheet code",
        ts.code || (ts.timesheet_id != null ? String(ts.timesheet_id) : "—"),
      ],
      ["Status", statusLabel(ts.status)],
      ["Jobs", jobs.map((j) => j.name).filter(Boolean).join(", ") || "—"],
      ["Customers", customers.join(", ") || "—"],
      ["Currency", String(currency).toUpperCase()],
      ["Payment status", pay.paid_label || (pay.is_paid ? "Paid" : "Not paid")],
      ["Payout number", pay.payout_number || "—"],
      ["Approval remarks", ts.approval_reason || "—"],
    ],
  });

  const payRows = [
    pay.gross_amount != null ? ["Gross amount", money(pay.gross_amount, currency)] : null,
    pay.deductions != null ? ["Deductions", money(pay.deductions, currency)] : null,
    pay.bonuses != null ? ["Bonuses", money(pay.bonuses, currency)] : null,
    pay.adjustments != null
      ? ["Adjustments", money(pay.adjustments, currency)]
      : null,
    pay.tax_amount != null ? ["Tax", money(pay.tax_amount, currency)] : null,
    ["Net / total", money(pay.total_amount ?? totals.amount, currency)],
  ].filter(Boolean);

  if (payRows.length > 1) {
    drawSectionTitle(doc, "Pay cycle breakdown", left);
    drawDetailsGrid(doc, { left, width, rows: payRows });
  }

  drawSectionTitle(doc, "Daily breakdown", left);
  drawDaysTable(doc, { left, width, days, currency });
}

function drawBrandHeader(doc, {
  orgName,
  reportTitle,
  generatedAt,
  generatedBy,
  left,
  width,
}) {
  const top = PAGE.margin;
  const logoPath = resolveLogoPath();
  let textLeft = left;

  if (logoPath) {
    try {
      doc.image(logoPath, left, top, { width: 42, height: 42 });
      textLeft = left + 54;
    } catch {
      // ignore broken logo
    }
  }

  doc
    .fillColor(COLORS.primaryDark)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(orgName, textLeft, top + 2, { width: width - (textLeft - left) });

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(reportTitle, textLeft, top + 22, {
      width: width - (textLeft - left),
    });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(8.5)
    .text(`Generated ${generatedAt} · by ${generatedBy}`, textLeft, top + 40, {
      width: width - (textLeft - left),
    });

  const barY = top + 58;
  doc
    .moveTo(left, barY)
    .lineTo(left + width, barY)
    .strokeColor(COLORS.primary)
    .lineWidth(2.5)
    .stroke();
  doc.lineWidth(1);
  doc.y = barY + 16;
}

function drawSectionTitle(doc, title, left) {
  ensureSpace(doc, 28);
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title, left, doc.y);
  doc.moveDown(0.35);
}

function drawSummaryCards(doc, { left, width, totals, pay, currency, daysWorked }) {
  ensureSpace(doc, 72);
  const gap = 8;
  const cardW = (width - gap * 3) / 4;
  const y = doc.y;
  const cards = [
    { label: "Work hours", value: hours(totals.working_hours) },
    { label: "Overtime", value: hours(totals.overtime_hours) },
    { label: "Days worked", value: String(daysWorked ?? 0) },
    {
      label: "Pay total",
      value: money(pay.total_amount ?? totals.amount, currency),
    },
  ];

  cards.forEach((card, i) => {
    const x = left + i * (cardW + gap);
    doc.roundedRect(x, y, cardW, 54, 6).fill(COLORS.primaryMuted);
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(8)
      .text(card.label.toUpperCase(), x + 10, y + 10, { width: cardW - 20 });
    doc
      .fillColor(COLORS.primaryDark)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(card.value, x + 10, y + 26, { width: cardW - 20 });
  });

  doc.y = y + 66;
}

function drawDetailsGrid(doc, { left, width, rows }) {
  const colGap = 16;
  const colW = (width - colGap) / 2;
  let i = 0;
  while (i < rows.length) {
    ensureSpace(doc, 34);
    const y = doc.y;
    const leftRow = rows[i];
    const rightRow = rows[i + 1];

    drawDetailCell(doc, left, y, colW, leftRow[0], leftRow[1]);
    if (rightRow) {
      drawDetailCell(doc, left + colW + colGap, y, colW, rightRow[0], rightRow[1]);
    }

    const leftH = measureDetailHeight(doc, colW, leftRow[1]);
    const rightH = rightRow ? measureDetailHeight(doc, colW, rightRow[1]) : 0;
    doc.y = y + Math.max(leftH, rightH) + 8;
    i += 2;
  }
  doc.moveDown(0.2);
}

function measureDetailHeight(doc, width, value) {
  return Math.max(
    28,
    doc.heightOfString(String(value || "—"), {
      width: width - 16,
      font: "Helvetica",
      size: 9,
    }) + 18,
  );
}

function drawDetailCell(doc, x, y, width, label, value) {
  const h = measureDetailHeight(doc, width, value);
  doc.roundedRect(x, y, width, h, 4).fill(COLORS.rowAlt);
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(7.5)
    .text(String(label).toUpperCase(), x + 8, y + 6, { width: width - 16 });
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica")
    .fontSize(9)
    .text(String(value || "—"), x + 8, y + 18, { width: width - 16 });
}

const DAY_COLS = [
  { key: "date", label: "Date", width: 58 },
  { key: "day", label: "Day", width: 42 },
  { key: "in", label: "In", width: 34 },
  { key: "out", label: "Out", width: 34 },
  { key: "work", label: "Work", width: 38 },
  { key: "break", label: "Break", width: 36 },
  { key: "travel", label: "Travel", width: 38 },
  { key: "ot", label: "OT", width: 32 },
  { key: "amount", label: "Amount", width: 62 },
  { key: "notes", label: "Remarks", width: 0 }, // filled to remaining
];

function dayColLayout(totalWidth) {
  const fixed = DAY_COLS.reduce(
    (sum, c) => sum + (c.key === "notes" ? 0 : c.width),
    0,
  );
  return DAY_COLS.map((c) =>
    c.key === "notes" ? { ...c, width: Math.max(70, totalWidth - fixed) } : c,
  );
}

function drawDaysTable(doc, { left, width, days, currency }) {
  const cols = dayColLayout(width);
  const headerH = 22;

  const drawHeader = () => {
    ensureSpace(doc, headerH + 40);
    const y = doc.y;
    doc.rect(left, y, width, headerH).fill(COLORS.primaryDark);
    let x = left;
    for (const col of cols) {
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(col.label, x + 4, y + 7, { width: col.width - 8 });
      x += col.width;
    }
    doc.y = y + headerH;
  };

  drawHeader();

  if (!days.length) {
    ensureSpace(doc, 28);
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9)
      .text("No daily entries for this period.", left, doc.y + 8);
    return;
  }

  days.forEach((day, index) => {
    const values = {
      date: fmtDate(day.date),
      day: `${day.day_name || "—"}${day.is_public_holiday ? " *" : ""}`,
      in: fmtTime(day.clock_in),
      out: fmtTime(day.clock_out),
      work: hours(day.working_hours),
      break: hours(day.break_hours),
      travel: hours(day.travel_hours),
      ot: hours(day.overtime_hours),
      amount: money(day.amount, currency),
      notes: day.notes || "—",
    };

    const rowH = Math.max(
      20,
      ...cols.map((col) =>
        doc.heightOfString(String(values[col.key]), {
          width: col.width - 8,
          font: "Helvetica",
          size: 7.5,
        }),
      ),
    ) + 8;

    if (doc.y + rowH > PAGE.height - PAGE.margin - PAGE.footerReserve) {
      doc.addPage();
      doc.y = PAGE.margin + 8;
      drawHeader();
    }

    const y = doc.y;
    if (index % 2 === 1) {
      doc.rect(left, y, width, rowH).fill(COLORS.rowAlt);
    }
    doc
      .rect(left, y, width, rowH)
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .stroke();

    let x = left;
    for (const col of cols) {
      doc
        .fillColor(COLORS.ink)
        .font("Helvetica")
        .fontSize(7.5)
        .text(String(values[col.key]), x + 4, y + 4, {
          width: col.width - 8,
          height: rowH - 6,
          ellipsis: true,
        });
      x += col.width;
    }
    doc.y = y + rowH;
  });

  doc.moveDown(0.6);
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(8)
    .text("* Public holiday", left, doc.y);
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > PAGE.height - PAGE.margin - PAGE.footerReserve) {
    doc.addPage();
    doc.y = PAGE.margin + 8;
  }
}

function stampPageChrome(doc, { report, title, meta }) {
  const orgName =
    meta.organisationName || report.organisation?.name || "Organisation";
  const generatedAt = fmtDateTime(report.generated_at || meta.generatedAt);
  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(i);
    const footerY = PAGE.height - 28;
    doc
      .moveTo(PAGE.margin, footerY - 8)
      .lineTo(PAGE.width - PAGE.margin, footerY - 8)
      .strokeColor(COLORS.line)
      .lineWidth(0.8)
      .stroke();

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `${orgName} · ${title || "Timesheet Report"} · ${generatedAt}`,
        PAGE.margin,
        footerY,
        { width: contentWidth() - 80, lineBreak: false },
      );

    doc.text(`Page ${i + 1} of ${range.count}`, PAGE.margin, footerY, {
      width: contentWidth(),
      align: "right",
      lineBreak: false,
    });
  }
}

export function reportPdfStoragePath(organisationId, reportRequestId) {
  return path.join(
    process.cwd(),
    "storage",
    "reports",
    String(organisationId),
    `report-${reportRequestId}-${REPORT_PDF_VERSION}.pdf`,
  );
}

export default {
  writeReportPdf,
  reportPdfStoragePath,
  REPORT_PDF_VERSION,
};

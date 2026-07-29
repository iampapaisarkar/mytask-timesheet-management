import { Worker } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import csv from "csv-parser";
import XLSX from "xlsx";
import { Readable } from "stream";
import {
  Venues,
  VenueAddress,
  VenueProfile,
  VenueSocialLinks,
  VenueTypes,
  VenueStatus,
  SocialTypes,
  Users,
  BusinessHours,
} from "../models/index.js";
import moment from "moment";
import axios from "axios";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "venueBulkUpload",
  async (job) => {
    console.log(`Processing job ${job.id} for file ${job.data.file}`);

    const file = job.data.file;

    let buffer = file.buffer;

    // If it's a plain object with `type` and `data`, convert back to Buffer
    if (buffer && buffer.type === "Buffer" && Array.isArray(buffer.data)) {
      buffer = Buffer.from(buffer.data);
    }

    const ext = path.extname(file.originalname).toLowerCase();

    let records = [];
    if (ext === ".csv") {
      // --- CSV PARSING ---
      records = await parseCSV(buffer);
    } else if (ext === ".xlsx" || ext === ".xls") {
      // --- EXCEL PARSING ---
      records = parseExcel(buffer);
    }

    await createVenues(records, job.data.user_id, job.data.token);

    console.log(
      `File ${file.originalname} processed for user ${job.data.user_id}`
    );
    return { success: true };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return sheet;
}

async function createVenues(records, user_id, token) {
  try {
    // Filter valid data
    const validVenues = records.filter(
      (v) =>
        v.name?.trim() &&
        v.address?.trim() &&
        v.latitude?.trim() &&
        v.longitude?.trim()
    );

    const currentUTCTime = moment().utc().format();

    const venueStatus = await VenueStatus.findOne({
      attributes: ["id", "code"],
      where: { code: "VERIFIED" },
      raw: true,
    });

    const socialType = await SocialTypes.findOne({
      attributes: ["id", "code"],
      where: { code: "website" },
      raw: true,
    });

    for (const venue of validVenues) {
      const name = venue.name.trim();
      const address = venue.address.trim();

      // 🔍 Check if a venue already exists with same name + address
      const existingVenue = await Venues.findOne({
        where: { name },
        include: [
          {
            model: VenueAddress,
            as: "address",
            where: { address },
          },
        ],
      });

      if (existingVenue) {
        // console.log(`Skipping duplicate venue: ${name} (${address})`);
        continue; // Skip duplicates
      }

      // ✅ Create new venue
      const inserted = await Venues.create({
        type_id: null,
        name,
        abn: null,
        liquor_license: null,
        status_id: venueStatus.id,
        is_active: true,
        created_at: currentUTCTime,
        updated_at: currentUTCTime,
      });

      await VenueAddress.create({
        venue_id: inserted.id,
        address,
        postcode: null,
        latitude: venue.latitude,
        longitude: venue.longitude,
        contact_email: venue.email,
        contact_phone: venue.phone,
        created_at: currentUTCTime,
        updated_at: currentUTCTime,
      });

      if (venue.website) {
        await VenueSocialLinks.create({
          venue_id: inserted.id,
          type_id: socialType.id,
          link: venue.website,
          created_at: currentUTCTime,
          updated_at: currentUTCTime,
        });
      }
      // 🕒 Handle Opening Hours
      if (venue.opening_hours) {
        const hours = parseOpeningHours(venue.opening_hours);

        for (const h of hours) {
          if (!h.open_time && !h.close_time && !h.is_closed) continue; // skip broken rows

          await BusinessHours.create({
            venue_id: inserted.id,
            day_of_week: h.day_of_week,
            open_time: h.open_time,
            close_time: h.close_time,
            is_closed: h.is_closed,
            created_at: currentUTCTime,
            created_by: user_id,
            updated_at: currentUTCTime,
            updated_by: user_id,
          });
        }
      }
    }

    // Notify user upload complete
    // Send notification asynchronously (fire-and-forget)
    axios
      .post(
        `${process.env.SERVER_URL}/notifications/send`,
        {
          user_id,
          title: "Venue Upload Complete",
          body: "The venue upload has been completed. You can view all uploaded venues on the Venues page.",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000, // optional
        }
      )
      .catch((err) => console.error("Notification failed:"));
    return true;
  } catch (err) {
    console.error("Error inserting venues", err);
    throw err;
  }
}

function parseOpeningHours(openingHoursStr) {
  if (!openingHoursStr) return [];

  return openingHoursStr
    .split("|")
    .map((segment) => {
      // Clean up invisible characters and trim
      segment = segment.replace(/[\u202f\u2009\u00a0]/g, " ").trim();

      // Split only at the first colon
      const firstColonIndex = segment.indexOf(":");
      if (firstColonIndex === -1) return null;

      const dayPart = segment.slice(0, firstColonIndex).trim();
      const hoursPart = segment.slice(firstColonIndex + 1).trim();

      // Handle "Closed" or missing times
      if (!hoursPart || /closed/i.test(hoursPart)) {
        return {
          day_of_week: dayPart,
          open_time: null,
          close_time: null,
          is_closed: true,
        };
      }

      // Replace weird dash characters (en dash, em dash, hyphen)
      const [openRaw, closeRaw] = hoursPart.split(/–|—|-/).map((s) => s.trim());

      const openMoment = moment(openRaw, ["h:mm A"], true);
      const closeMoment = moment(closeRaw, ["h:mm A"], true);

      const open_time = openMoment.isValid()
        ? openMoment.format("HH:mm:ss")
        : null;
      const close_time = closeMoment.isValid()
        ? closeMoment.format("HH:mm:ss")
        : null;

      return {
        day_of_week: dayPart,
        open_time,
        close_time,
        is_closed: !open_time || !close_time,
      };
    })
    .filter(Boolean);
}

// ⬇️ ADD THIS AT THE END
console.log("✅ Venue upload worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down venue upload worker...");
  await worker.close();
  process.exit(0);
});

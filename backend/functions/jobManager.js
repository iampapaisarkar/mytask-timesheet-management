import cron from "node-cron";
import { mysheet } from "../database.js";
import { parseEventToCron } from "./jobParser.js";
import { cronRegistry } from "./cronRegistry.js";
import { fn, col, literal, Op, where, QueryTypes } from "sequelize";
import moment from "moment";

export async function createJob(name, event, value) {
  if (!name || !event) throw new Error("Missing name or event");

  const [existing] = await mysheet.query(
    "SELECT * FROM jobs WHERE name = :name",
    {
      replacements: { name },
      type: QueryTypes.SELECT,
    }
  );

  if (existing) throw new Error("Job already exists");

  await mysheet.query(
    "INSERT INTO jobs (name, event, value, created_at) VALUES (:name, :event, :value, :created_at)",
    {
      replacements: {
        name,
        event,
        value: value || 1,
        created_at: new Date(),
      },
      type: QueryTypes.INSERT,
    }
  );

  console.log(`Job "${name}" created.`);
  return true;
}

export async function startJob(name) {
  if (cronRegistry.has(name)) throw new Error("Job is already running");

  const [job] = await mysheet.query("SELECT * FROM jobs WHERE name = :name", {
    replacements: { name },
    type: QueryTypes.SELECT,
  });

  if (!job) throw new Error("Job not found");

  const cronTime = parseEventToCron(job.event, job.value);

  // Lowercase the first letter of the job name
  const filename = job.name.charAt(0).toLowerCase() + job.name.slice(1);

  const task = cron.schedule(cronTime, async () => {
    const jobModule = await import(`../jobs/${filename}.js`);
    jobModule.default(); // call the job function
  });

  cronRegistry.set(name, task);
  task.start();

  console.log(`Job "${name}" started.`);
  return true;
}

export async function stopJob(name) {
  const task = cronRegistry.has(name);
  if (!task) throw new Error("Job is not running");

  task.stop();
  cronRegistry.delete(name);

  console.log(`Job "${name}" stopped.`);
  return true;
}

export async function deleteJob(name) {
  const [job] = await mysheet.query("SELECT * FROM jobs WHERE name = :name", {
    replacements: { name },
    type: QueryTypes.SELECT,
  });

  if (!job) throw new Error("Job not found");

  if (cronRegistry.has(name)) await stopJob(name);

  await mysheet.query("DELETE FROM jobs WHERE name = :name", {
    replacements: { name },
    type: QueryTypes.DELETE,
  });

  console.log(`Job "${name}" deleted.`);
  return true;
}

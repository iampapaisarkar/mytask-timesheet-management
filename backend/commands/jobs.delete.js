import { deleteJob } from "../functions/jobManager.js";
import { unlink } from "fs/promises";

const args = process.argv.slice(2);
const jobName = args[0];

if (!jobName) {
  console.error("Please enter a job name!");
  process.exit(1);
}

try {
  await deleteJob(jobName);
  await unlink(`./jobs/${jobName}.js`);
  console.log(`✅ ${jobName} job deleted successfully`);
  process.exit(1);
} catch (err) {
  console.error(`❌ ${err.message}`);
}

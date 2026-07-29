import { startJob } from "../functions/jobManager.js";

const args = process.argv.slice(2);
const jobName = args[0];

if (!jobName) {
  console.error("Please enter a job name!");
  process.exit(1);
}

try {
  await startJob(jobName);
  console.log(`✅ ${jobName} job started successfully`);
  // process.exit(1);
} catch (err) {
  console.error(`❌ ${err.message}`);
}

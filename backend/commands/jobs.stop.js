import { stopJob } from "../functions/jobManager.js";

const args = process.argv.slice(2);
const jobName = args[0];

if (!jobName) {
  console.error("Please enter a job name!");
  process.exit(1);
}

try {
  await stopJob(jobName);
  console.log(`✅ ${jobName} job stopped successfully`);
  process.exit(1);
} catch (err) {
  console.error(`❌ ${err.message}`);
}

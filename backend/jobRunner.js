// allJobRunner.js
import { startJob } from "./functions/jobManager.js";
import { Jobs } from "./models/index.js";

try {
  console.log("✅ runAllJobs.js started");
  const jobs = await Jobs.findAll({
    raw: true,
  });
  console.log("🛠️ Found jobs:", jobs.length);
  for (const job of jobs) {
    await startJob(job.name);
  }
  console.log(`✅ All Job started and running in background.`);
} catch (err) {
  console.error(`❌ ${err.message}`);
}

// Keep the process alive
setInterval(() => {}, 1000); // Keeps the process running

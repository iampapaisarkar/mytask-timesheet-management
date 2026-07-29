import { createJob } from "../functions/jobManager.js";
import path from "path";
import fs from "fs";

const args = process.argv.slice(2);
const jobName = args[0];
const jobEvent = args[1];
const eventValue = args[2];
// const dbName = process.env.DB_NAME;

if (!jobName) {
  console.error("Please enter a job name!");
  process.exit(1);
}
if (!jobEvent) {
  console.error("Please enter a job event!");
  process.exit(1);
}

try {

  const formattedJobName = jobName.charAt(0).toLowerCase() + jobName.slice(1);

  // Generate file content based on template
  const template = `
  export default async function ${formattedJobName}() {
    console.log(\`[\${new Date().toISOString()}] Running job: ${formattedJobName}\`);
    // Your job logic here
  }
  `;

  // Correct model directory path
  let jobDir = "";
  jobDir = path.join(process.cwd(), "jobs"); 

  // Check if model directory exists, if not, create it
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true }); // Ensure the directory is created
  }

  // Define the file path
  const filePath = path.join(jobDir, `${formattedJobName}.js`);

  if (fs.existsSync(filePath)) {
    console.error("Job already exists, skipping creation.");
    process.exit(1);
  } else {
    // Write content to the file
    fs.writeFile(filePath, template, (err) => {
      if (err) {
        console.error("Error writing job file:", err);
      } else {
        console.log(`${formattedJobName} job created successfully at ${filePath}`);
      }
    });
  }
  await createJob(jobName, jobEvent, eventValue);
  console.log(`✅ ${jobName} job created successfully`);
  process.exit(1);
} catch (err) {
  console.error(`❌ ${err.message}`);
}

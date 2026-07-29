import { execSync } from "child_process";

// Extract values from command-line arguments
const args = process.argv.slice(2);

const modelMogrationSeederName = args[0];
const schema = args[1] || "dbo";

if (!modelMogrationSeederName) {
    console.error("Please provide --name parameter.");
    process.exit(1);
}

// Array to collect errors
const errors = [];

try {
    // Generate model command
    execSync(
        `npm run generate:model --name ${modelMogrationSeederName} --schema ${schema}`,
        { stdio: "inherit" }
    );
} catch (error) {
    errors.push(`Error generating model: ${error.message}`);
}

try {
    // Generate migration command
    execSync(
      `npm run generate:migration --name ${modelMogrationSeederName} --schema ${schema}`,
      { stdio: "inherit" }
    );
} catch (error) {
    errors.push(`Error generating migration: ${error.message}`);
}

try {
    // Generate seeder command
    execSync(
        `npm run generate:seeder --name ${modelMogrationSeederName} --schema ${schema}`,
        { stdio: "inherit" }
    );
} catch (error) {
    errors.push(`Error generating seeder: ${error.message}`);
}

// Display errors if there are any
if (errors.length > 0) {
    console.error("The following errors occurred:");
    // errors.forEach((err) => console.error(err));
    process.exit(1); // Exit with failure code
} else {
    console.log("All commands executed successfully.");
}

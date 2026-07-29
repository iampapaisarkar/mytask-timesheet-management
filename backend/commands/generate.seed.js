import path from "path";
import fs from "fs/promises"; // Use fs.promises for async file operations

// Extract values from command-line arguments
const args = process.argv.slice(2);

const migrationName = args[0];

if (!migrationName) {
    console.error("Please provide a seeder name.");
    process.exit(1);
}

// Function to convert seeder name to snake_case (e.g., SystemSettings => system_settings)
const toSnakeCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between lowercase and uppercase letters
        .toLowerCase(); // Convert everything to lowercase
};

const tableName = toSnakeCase(migrationName);

// Generate file content based on template
const template = `
  export async function up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert({ tableName: "${tableName}" }, [
      // :Example
      {
        name: "Roger",
      },
      {
        name: "Harrison",
      },
    ]);
  }

  export async function down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete({ tableName: "${tableName}" });
  }
  `;

// Correct seeder directory path
const seederDir = path.join(process.cwd(), "seeders"); // Using process.cwd() to get the current working directory

// Check if seeder directory exists, if not, create it
try {
    await fs.mkdir(seederDir, { recursive: true }); // Ensure the directory is created

    // Read the files in the migrations directory
    const files = await fs.readdir(seederDir);

    // Filter the files that match the migration name pattern
    const matchingFiles = files.filter((file) =>
        file.toLowerCase().includes(tableName.toLowerCase())
    );

    if (matchingFiles.length > 0) {
        console.error("Seeder already exists, skipping creation.");
        process.exit(1);
    }

    const currentMilliseconds = Date.now();

    // Define the file path
    const filePath = path.join(
        seederDir,
        `${currentMilliseconds}-${tableName}.js`
    );

    // Write content to the file
    await fs.writeFile(filePath, template);
    console.log(`${tableName} seeder generated successfully at ${filePath}`);
} catch (err) {
    console.error("Error:", err);
    process.exit(1); // Exit with an error status if anything goes wrong
}

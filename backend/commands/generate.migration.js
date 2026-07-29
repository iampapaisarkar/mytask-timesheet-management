import path from "path";
import fs from "fs/promises"; // Use fs.promises for async file operations

// Extract values from command-line arguments
const args = process.argv.slice(2);

if (args.includes("--alter")) {
  const migrationName = args[1];
  const reason = args[2];

  if (!migrationName) {
    console.error("Please provide alter table name.");
    process.exit(1);
  }

  if (!reason) {
    console.error("Please provide alter table reason.");
    process.exit(1);
  }

  // Convert PascalCase → snake_case
  const toSnakeCase = (str) =>
    str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

  // Convert text → kebab-case
  const toKebabCase = (str) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const tableName = toSnakeCase(migrationName);
  const reasonSlug = toKebabCase(reason);
  const baseFilename = `${tableName}-${reasonSlug}`;

  // Generate file content based on template
  const template = `
  import { DataTypes } from "sequelize";

  export async function up(queryInterface, Sequelize) {
    // Adding a new column 'status' to the 'test' table
    // await queryInterface.addColumn(
    //   { tableName: "${tableName}" },
    //   "column_name",
    //   {
    //     type: DataTypes.STRING, // data_type
    //     allowNull: true, // Adjust as needed
    //     // defaultValue: "active",
    //   }
    // );

    // Renaming an existing column (example: 'name' → 'full_name')
    // await queryInterface.renameColumn(
    //   { tableName: "${tableName}" },
    //   "old_column_name",
    //   "new_column_name"
    // );

    // Changing an existing column type (example: change created_by to allow NULL)
    // await queryInterface.changeColumn(
    //   { tableName: "${tableName}" },
    //   "column_name",
    //   {
    //     type: DataTypes.INTEGER, // data_type
    //     allowNull: true, // Allow null values now
    //   }
    // );
  }

  export async function down(queryInterface, Sequelize) {
    // Reverting the column name change
    // await queryInterface.renameColumn(
    //   { tableName: "${tableName}" },
    //   "old_column_name",
    //   "new_column_name"
    // );

    // Reverting column change datatype
    // await queryInterface.changeColumn(
    //   { tableName: "${tableName}" },
    //   "column_name",
    //   {
    //     type: DataTypes.INTEGER, // data_type
    //     allowNull: false, // Revert back to original constraints
    //   }
    // );

    // Dropping the newly added column
    // await queryInterface.removeColumn({ tableName: "${tableName}" }, "column_name");
  }
  `;

  const migrationDir = path.join(process.cwd(), "migrations");

  try {
    const migrationDir = path.join(process.cwd(), "migrations");
    await fs.mkdir(migrationDir, { recursive: true });

    const files = await fs.readdir(migrationDir);

    if (files.some((file) => file.includes(baseFilename))) {
      console.error("❌ Alter migration already exists, skipping creation.");
      process.exit(1);
    }

    const filePath = path.join(
      migrationDir,
      `${Date.now()}-${baseFilename}.js`
    );

    await fs.writeFile(filePath, template);
    console.log(`✅ Alter migration created: ${filePath}`);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
} else {
  const migrationName = args[0];

  if (!migrationName) {
    console.error("Please provide a migration name.");
    process.exit(1);
  }

  // Function to convert migration name to snake_case (e.g., SystemSettings => system_settings)
  const toSnakeCase = (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between lowercase and uppercase letters
      .toLowerCase(); // Convert everything to lowercase
  };

  const tableName = toSnakeCase(migrationName);

  // Generate file content based on template
  const template = `
  import { DataTypes } from "sequelize";

  export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable({ tableName: "${tableName}" }, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
      },
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
      updated_at: {
        type: DataTypes.DATE,
        field: "updated_at",
      },
      updated_by: {
        type: DataTypes.INTEGER,
      },
    });
  }

  export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: "${tableName}" });
  }
  `;

  // Correct migration directory path
  const migrationDir = path.join(process.cwd(), "migrations"); // Using process.cwd() to get the current working directory

  try {
    // Check if migration directory exists, if not, create it
    await fs.mkdir(migrationDir, { recursive: true });

    // Read the files in the migrations directory
    const files = await fs.readdir(migrationDir);

    // Filter the files that match the migration name pattern
    const matchingFiles = files.filter((file) =>
      file.toLowerCase().includes(tableName.toLowerCase())
    );

    if (matchingFiles.length > 0) {
      console.error("Migration already exists, skipping creation.");
      process.exit(1);
    }

    const currentMilliseconds = Date.now();

    // Define the file path
    const filePath = path.join(
      migrationDir,
      `${currentMilliseconds}-${tableName}.js`
    );

    // Write content to the file
    await fs.writeFile(filePath, template);
    console.log(`${tableName} migration generated successfully at ${filePath}`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1); // Exit with an error status if anything goes wrong
  }
}

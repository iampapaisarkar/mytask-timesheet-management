import path from "path";
import fs from "fs"; // Use fs.promises for async file operations

// Extract values from command-line arguments
const modelName = process.argv[2];
const dbName = "db";

if (!modelName) {
  console.log("Please provide a model name.");
  process.exit(1);
}

// Function to convert model name to snake_case (e.g., SystemSettings => system_settings)
const toSnakeCase = (str) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between lowercase and uppercase letters
    .toLowerCase(); // Convert everything to lowercase
};

const tableName = toSnakeCase(modelName);

// Generate file content based on template
const template = `
import { DataTypes } from "sequelize";
import { ${dbName} } from "../database.js";

const ${modelName} = ${dbName}.define(
  "${modelName}",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
  },
  {
    tableName: "${tableName}", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default ${modelName};
`;

// Correct model directory path
let modelDir = "";
modelDir = path.join(process.cwd(), "models"); // Using process.cwd() to get the current working directory

// Check if model directory exists, if not, create it
if (!fs.existsSync(modelDir)) {
  fs.mkdirSync(modelDir, { recursive: true }); // Ensure the directory is created
}

// Define the file path
const fileName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
const filePath = path.join(modelDir, `${fileName}.js`);

if (fs.existsSync(filePath)) {
  console.error("Model already exists, skipping creation.");
  process.exit(1);
} else {
  // Write content to the file
  fs.writeFile(filePath, template, (err) => {
    if (err) {
      console.error("Error writing model file:", err);
    } else {
      console.log(`${modelName} model generated successfully at ${filePath}`);
    }
  });
}

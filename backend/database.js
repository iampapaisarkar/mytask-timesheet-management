import dotenv from "dotenv";
dotenv.config();
import { Sequelize } from "sequelize";
import { getDatabaseConfig } from "./config/config.js"; // Make sure to import your function

// Get database configurations for each environment (development or production)
const dbConfig = getDatabaseConfig();

// Sequelize instance
export const db = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect || "mysql",
    dialectOptions: dbConfig.dialectOptions,
    // logging: console.log,
    logging: false,
  },
);

export default db;
